import React, { useState, useMemo } from 'react';
import { FileText, Download, Printer, Search, Filter, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/hooks/use-toast';
import { InventoryFilters, StockStatus } from '@/types/inventory';

export const InventoryReportPage: React.FC = () => {
  const { skus, products, categories, getStockLevel, getProductById, getCategoryById } = useInventory();
  const { toast } = useToast();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [filters, setFilters] = useState<InventoryFilters>({
    fromDate: thirtyDaysAgo.toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    status: 'ALL',
    search: ''
  });

  const [sortField, setSortField] = useState<'skuCode' | 'productName' | 'stockLevel' | 'stockValue'>('skuCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Generate report data
  const reportData = useMemo(() => {
    return skus.map(sku => {
      const product = getProductById(sku.productId);
      const category = product ? getCategoryById(product.categoryId) : null;
      const stockLevel = getStockLevel(sku.id);
      const stockValue = stockLevel * (sku.cost || 0);

      let status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'critical';
      if (stockLevel < 0) {
        status = 'critical';
      } else if (stockLevel === 0) {
        status = 'out-of-stock';
      } else if (stockLevel <= (sku.reorderPoint || 0)) {
        status = 'low-stock';
      } else {
        status = 'in-stock';
      }

      return {
        sku,
        product,
        category,
        stockLevel,
        stockValue,
        status
      };
    });
  }, [skus, getProductById, getCategoryById, getStockLevel]);

  // Apply filters
  const filteredData = useMemo(() => {
    return reportData.filter(row => {
      // Category filter
      if (filters.categoryId && row.product?.categoryId !== filters.categoryId) {
        return false;
      }

      // Status filter
      if (filters.status !== 'ALL') {
        const statusMap: Record<StockStatus, string[]> = {
          'ALL': [],
          'IN_STOCK': ['in-stock'],
          'LOW_STOCK': ['low-stock'],
          'OUT_OF_STOCK': ['out-of-stock'],
          'CRITICAL': ['critical']
        };
        if (!statusMap[filters.status].includes(row.status)) {
          return false;
        }
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSku = row.sku.skuCode.toLowerCase().includes(searchLower);
        const matchesProduct = row.product?.name.toLowerCase().includes(searchLower);
        if (!matchesSku && !matchesProduct) {
          return false;
        }
      }

      return true;
    });
  }, [reportData, filters]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'skuCode':
          aVal = a.sku.skuCode;
          bVal = b.sku.skuCode;
          break;
        case 'productName':
          aVal = a.product?.name || '';
          bVal = b.product?.name || '';
          break;
        case 'stockLevel':
          aVal = a.stockLevel;
          bVal = b.stockLevel;
          break;
        case 'stockValue':
          aVal = a.stockValue;
          bVal = b.stockValue;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc' 
          ? aVal.localeCompare(bVal as string) 
          : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });
  }, [filteredData, sortField, sortDir]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalProducts = new Set(filteredData.map(r => r.product?.id)).size;
    const totalSKUs = filteredData.length;
    const totalOnHand = filteredData.reduce((sum, r) => sum + Math.max(0, r.stockLevel), 0);
    const totalValue = filteredData.reduce((sum, r) => sum + Math.max(0, r.stockValue), 0);
    const lowStockCount = filteredData.filter(r => r.status === 'low-stock').length;
    const outOfStockCount = filteredData.filter(r => r.status === 'out-of-stock' || r.status === 'critical').length;

    return { totalProducts, totalSKUs, totalOnHand, totalValue, lowStockCount, outOfStockCount };
  }, [filteredData]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const resetFilters = () => {
    setFilters({
      fromDate: thirtyDaysAgo.toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      categoryId: '',
      status: 'ALL',
      search: ''
    });
  };

  const exportCSV = () => {
    const headers = ['SKU Code', 'Product', 'Category', 'Size', 'Color', 'Stock Level', 'Reorder Point', 'Unit Cost', 'Unit Price', 'Stock Value', 'Status'];
    const rows = sortedData.map(row => [
      row.sku.skuCode,
      row.product?.name || '',
      row.category?.name || '',
      row.sku.size || '',
      row.sku.color || '',
      row.stockLevel,
      row.sku.reorderPoint,
      row.sku.cost,
      row.sku.price,
      row.stockValue.toFixed(2),
      row.status
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Report exported to CSV' });
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in-stock':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">In Stock</Badge>;
      case 'low-stock':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Low Stock</Badge>;
      case 'out-of-stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <FileText className="h-7 w-7" />
            Inventory Report
          </h1>
          <p className="text-muted-foreground">Complete inventory overview with stock levels</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={filters.categoryId}
                onValueChange={(value) => setFilters({ ...filters, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stock Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: StockStatus) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="IN_STOCK">In Stock</SelectItem>
                  <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name or SKU..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
            <p className="text-sm text-muted-foreground">Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.totalSKUs}</p>
            <p className="text-sm text-muted-foreground">Total SKUs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.totalOnHand}</p>
            <p className="text-sm text-muted-foreground">On Hand</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">₱{summary.totalValue.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">Inventory Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{summary.lowStockCount}</p>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{summary.outOfStockCount}</p>
            <p className="text-sm text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th 
                    className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('skuCode')}
                  >
                    SKU Code {sortField === 'skuCode' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('productName')}
                  >
                    Product {sortField === 'productName' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-left py-3 px-4 font-medium">Size</th>
                  <th className="text-left py-3 px-4 font-medium">Color</th>
                  <th 
                    className="text-right py-3 px-4 font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('stockLevel')}
                  >
                    Stock {sortField === 'stockLevel' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-right py-3 px-4 font-medium">Reorder</th>
                  <th className="text-right py-3 px-4 font-medium">Cost</th>
                  <th className="text-right py-3 px-4 font-medium">Price</th>
                  <th 
                    className="text-right py-3 px-4 font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('stockValue')}
                  >
                    Value {sortField === 'stockValue' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground">
                      No data matching filters
                    </td>
                  </tr>
                ) : (
                  sortedData.map(row => (
                    <tr key={row.sku.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{row.sku.skuCode}</td>
                      <td className="py-3 px-4">{row.product?.name || '-'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{row.category?.name || '-'}</td>
                      <td className="py-3 px-4">{row.sku.size || '-'}</td>
                      <td className="py-3 px-4">{row.sku.color || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium">{row.stockLevel}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{row.sku.reorderPoint}</td>
                      <td className="py-3 px-4 text-right">₱{(row.sku.cost || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">₱{(row.sku.price || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium">₱{row.stockValue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(row.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
