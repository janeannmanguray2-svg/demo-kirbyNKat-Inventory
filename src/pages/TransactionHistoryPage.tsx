import React, { useState, useMemo } from 'react';
import { History, Download, Printer, Search, RotateCcw, ArrowUpFromLine, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/hooks/use-toast';
import { TransactionFilters, TransactionDirection } from '@/types/inventory';
import { toDate, formatDateTime } from '@/lib/firebase';

export const TransactionHistoryPage: React.FC = () => {
  const { 
    transactions, 
    products, 
    skus, 
    platforms, 
    suppliers, 
    reasonCategories, 
    users,
    getSkuById,
    getProductById,
    getPlatformById,
    getSupplierById,
    getReasonById,
    getUserById
  } = useInventory();
  const { toast } = useToast();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [filters, setFilters] = useState<TransactionFilters>({
    fromDate: thirtyDaysAgo.toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    direction: 'ALL',
    userUid: '',
    productId: '',
    skuId: '',
    reasonId: '',
    platformId: '',
    supplierId: '',
    search: ''
  });

  const [page, setPage] = useState(1);
  const perPage = 20;

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Date filter
      if (filters.fromDate) {
        const txDate = toDate(tx.txDate);
        if (txDate && txDate < new Date(filters.fromDate)) return false;
      }
      if (filters.toDate) {
        const txDate = toDate(tx.txDate);
        const endDate = new Date(filters.toDate);
        endDate.setHours(23, 59, 59, 999);
        if (txDate && txDate > endDate) return false;
      }

      // Direction filter
      if (filters.direction !== 'ALL' && tx.direction !== filters.direction) return false;

      // User filter
      if (filters.userUid && tx.createdByUid !== filters.userUid) return false;

      // Product filter
      if (filters.productId) {
        const sku = getSkuById(tx.skuId);
        if (!sku || sku.productId !== filters.productId) return false;
      }

      // SKU filter
      if (filters.skuId && tx.skuId !== filters.skuId) return false;

      // Reason filter
      if (filters.reasonId && tx.reasonCategoryId !== filters.reasonId) return false;

      // Platform filter
      if (filters.platformId && tx.platformId !== filters.platformId) return false;

      // Supplier filter
      if (filters.supplierId && tx.supplierId !== filters.supplierId) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesRef = tx.referenceNo?.toLowerCase().includes(searchLower);
        const matchesNotes = tx.notes?.toLowerCase().includes(searchLower);
        const sku = getSkuById(tx.skuId);
        const matchesSku = sku?.skuCode.toLowerCase().includes(searchLower);
        if (!matchesRef && !matchesNotes && !matchesSku) return false;
      }

      return true;
    });
  }, [transactions, filters, getSkuById]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalIn = filteredTransactions
      .filter(t => t.direction === 'IN')
      .reduce((sum, t) => sum + t.qty, 0);
    const totalOut = filteredTransactions
      .filter(t => t.direction === 'OUT')
      .reduce((sum, t) => sum + t.qty, 0);
    const totalRevenue = filteredTransactions
      .filter(t => t.direction === 'OUT')
      .reduce((sum, t) => sum + (t.revenue || 0), 0);
    
    return {
      totalTransactions: filteredTransactions.length,
      totalIn,
      totalOut,
      totalRevenue,
      netMovement: totalIn - totalOut
    };
  }, [filteredTransactions]);

  // Paginate
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredTransactions.slice(start, start + perPage);
  }, [filteredTransactions, page]);

  const totalPages = Math.ceil(filteredTransactions.length / perPage);

  const resetFilters = () => {
    setFilters({
      fromDate: thirtyDaysAgo.toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      direction: 'ALL',
      userUid: '',
      productId: '',
      skuId: '',
      reasonId: '',
      platformId: '',
      supplierId: '',
      search: ''
    });
    setPage(1);
  };

  const setQuickFilter = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFilters({
      ...filters,
      fromDate: from.toISOString().split('T')[0],
      toDate: to.toISOString().split('T')[0]
    });
    setPage(1);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Time', 'Direction', 'SKU', 'Product', 'Qty', 'Unit Price', 'Revenue', 'Platform', 'Supplier', 'Reason', 'Reference', 'Created By', 'Notes'];
    const rows = filteredTransactions.map(tx => {
      const sku = getSkuById(tx.skuId);
      const product = sku ? getProductById(sku.productId) : null;
      const platform = tx.platformId ? getPlatformById(tx.platformId) : null;
      const supplier = tx.supplierId ? getSupplierById(tx.supplierId) : null;
      const reason = getReasonById(tx.reasonCategoryId);
      const user = getUserById(tx.createdByUid);
      const txDate = toDate(tx.txDate);

      return [
        txDate ? txDate.toLocaleDateString() : '',
        txDate ? txDate.toLocaleTimeString() : '',
        tx.direction,
        sku?.skuCode || '',
        product?.name || '',
        tx.qty,
        tx.unitPrice || tx.unitCost || 0,
        tx.revenue || 0,
        platform?.name || '',
        supplier?.name || '',
        reason?.name || '',
        tx.referenceNo || '',
        user?.displayName || '',
        tx.notes || ''
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${filters.fromDate}_to_${filters.toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Transactions exported to CSV' });
  };

  const getDirectionBadge = (direction: TransactionDirection) => {
    switch (direction) {
      case 'IN':
        return (
          <Badge className="bg-success/10 text-success hover:bg-success/20">
            <ArrowDownToLine className="h-3 w-3 mr-1" />
            IN
          </Badge>
        );
      case 'OUT':
        return (
          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
            <ArrowUpFromLine className="h-3 w-3 mr-1" />
            OUT
          </Badge>
        );
      case 'ADJUSTMENT':
        return (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
            <RefreshCw className="h-3 w-3 mr-1" />
            ADJ
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <History className="h-7 w-7" />
            Transaction History
          </h1>
          <p className="text-muted-foreground">Complete record of all inventory movements</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 no-print">
        <Button variant="outline" size="sm" onClick={() => setQuickFilter(0)}>Today</Button>
        <Button variant="outline" size="sm" onClick={() => setQuickFilter(7)}>Last 7 Days</Button>
        <Button variant="outline" size="sm" onClick={() => setQuickFilter(30)}>Last 30 Days</Button>
        <Button variant="outline" size="sm" onClick={() => setQuickFilter(90)}>Last 90 Days</Button>
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.toDate || ''}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={filters.direction}
                onValueChange={(value) => setFilters({ ...filters, direction: value as TransactionDirection | 'ALL' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Directions</SelectItem>
                  <SelectItem value="IN">Stock In</SelectItem>
                  <SelectItem value="OUT">Stock Out</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={filters.productId}
                onValueChange={(value) => setFilters({ ...filters, productId: value, skuId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Products</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={filters.platformId}
                onValueChange={(value) => setFilters({ ...filters, platformId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Platforms</SelectItem>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={filters.supplierId}
                onValueChange={(value) => setFilters({ ...filters, supplierId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Suppliers</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference, notes, or SKU..."
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.totalTransactions}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">+{summary.totalIn}</p>
            <p className="text-sm text-muted-foreground">Stock In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">-{summary.totalOut}</p>
            <p className="text-sm text-muted-foreground">Stock Out</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">₱{summary.totalRevenue.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${summary.netMovement >= 0 ? 'text-success' : 'text-destructive'}`}>
              {summary.netMovement >= 0 ? '+' : ''}{summary.netMovement}
            </p>
            <p className="text-sm text-muted-foreground">Net Movement</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date/Time</th>
                  <th className="text-center py-3 px-4 font-medium">Direction</th>
                  <th className="text-left py-3 px-4 font-medium">SKU</th>
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-right py-3 px-4 font-medium">Qty</th>
                  <th className="text-right py-3 px-4 font-medium">Value</th>
                  <th className="text-left py-3 px-4 font-medium">Platform/Supplier</th>
                  <th className="text-left py-3 px-4 font-medium">Reference</th>
                  <th className="text-left py-3 px-4 font-medium">Created By</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No transactions matching filters
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map(tx => {
                    const sku = getSkuById(tx.skuId);
                    const product = sku ? getProductById(sku.productId) : null;
                    const platform = tx.platformId ? getPlatformById(tx.platformId) : null;
                    const supplier = tx.supplierId ? getSupplierById(tx.supplierId) : null;
                    const user = getUserById(tx.createdByUid);
                    const value = tx.direction === 'OUT' ? tx.revenue : tx.qty * (tx.unitCost || 0);

                    return (
                      <tr 
                        key={tx.id} 
                        className={`border-b hover:bg-muted/30 ${
                          tx.direction === 'IN' ? 'bg-success/5' : 
                          tx.direction === 'OUT' ? 'bg-destructive/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4">{formatDateTime(toDate(tx.txDate))}</td>
                        <td className="py-3 px-4 text-center">{getDirectionBadge(tx.direction)}</td>
                        <td className="py-3 px-4 font-medium">{sku?.skuCode || '-'}</td>
                        <td className="py-3 px-4">{product?.name || '-'}</td>
                        <td className="py-3 px-4 text-right font-medium">{tx.qty}</td>
                        <td className="py-3 px-4 text-right">₱{(value || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {platform?.name || supplier?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{tx.referenceNo || '-'}</td>
                        <td className="py-3 px-4">{user?.displayName || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filteredTransactions.length)} of {filteredTransactions.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
