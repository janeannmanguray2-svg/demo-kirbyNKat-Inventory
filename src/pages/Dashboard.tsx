import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Boxes, 
  TrendingUp, 
  AlertTriangle, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { toDate, timeAgo } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const { 
    getDashboardStats, 
    transactions, 
    skus, 
    platforms, 
    getStockLevel, 
    getProductById,
    getSkuById,
    getUserById 
  } = useInventory();

  const stats = getDashboardStats();

  // Get critical and low stock SKUs
  const criticalStockSkus = skus.filter(sku => getStockLevel(sku.id) <= 0);
  const lowStockSkus = skus.filter(sku => {
    const stock = getStockLevel(sku.id);
    return stock > 0 && stock <= (sku.reorderPoint || 0);
  });

  // Recent transactions
  const recentTransactions = transactions.slice(0, 10);

  // Platform breakdown for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const platformBreakdown = platforms.map(platform => {
    const platformTx = transactions.filter(tx => {
      const txDate = toDate(tx.txDate);
      return tx.direction === 'OUT' && tx.platformId === platform.id && txDate && txDate >= sevenDaysAgo;
    });
    
    return {
      platform,
      qty: platformTx.reduce((sum, tx) => sum + tx.qty, 0),
      revenue: platformTx.reduce((sum, tx) => sum + (tx.revenue || 0), 0)
    };
  }).filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your inventory</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                <p className="text-sm text-muted-foreground">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Boxes className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSKUs}</p>
                <p className="text-sm text-muted-foreground">SKUs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOnHand}</p>
                <p className="text-sm text-muted-foreground">Total On Hand</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.lowStockCount}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">₱{stats.todayRevenue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/stock-in">
          <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:bg-success/10 hover:border-success">
            <ArrowDownToLine className="h-6 w-6 text-success" />
            <span>Stock In</span>
          </Button>
        </Link>
        <Link to="/stock-out">
          <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:bg-destructive/10 hover:border-destructive">
            <ArrowUpFromLine className="h-6 w-6 text-destructive" />
            <span>Stock Out</span>
          </Button>
        </Link>
        <Link to="/products">
          <Button variant="outline" className="w-full h-20 flex-col gap-2">
            <Package className="h-6 w-6" />
            <span>Products</span>
          </Button>
        </Link>
        <Link to="/inventory-report">
          <Button variant="outline" className="w-full h-20 flex-col gap-2">
            <ShoppingCart className="h-6 w-6" />
            <span>Reports</span>
          </Button>
        </Link>
      </div>

      {/* Platform Sales (Last 7 Days) */}
      {platformBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last 7 Days - Sales by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platformBreakdown.map(({ platform, qty, revenue }) => (
                <div key={platform.id} className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">{platform.name}</p>
                  <p className="text-xl font-bold text-success">₱{revenue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{qty} units sold</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Critical Stock */}
        {criticalStockSkus.length > 0 && (
          <Card className="border-l-4 border-l-destructive">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Critical Stock (Out of Stock)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">SKU</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Product</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalStockSkus.slice(0, 5).map(sku => {
                      const product = getProductById(sku.productId);
                      return (
                        <tr key={sku.id} className="border-b last:border-0">
                          <td className="py-2 font-medium">{sku.skuCode}</td>
                          <td className="py-2">{product?.name || 'Unknown'}</td>
                          <td className="py-2">
                            <Badge variant="destructive">{getStockLevel(sku.id)}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Stock */}
        {lowStockSkus.length > 0 && (
          <Card className="border-l-4 border-l-warning">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">SKU</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Product</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Stock</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockSkus.slice(0, 5).map(sku => {
                      const product = getProductById(sku.productId);
                      return (
                        <tr key={sku.id} className="border-b last:border-0">
                          <td className="py-2 font-medium">{sku.skuCode}</td>
                          <td className="py-2">{product?.name || 'Unknown'}</td>
                          <td className="py-2">
                            <Badge className="bg-warning/10 text-warning hover:bg-warning/20">
                              {getStockLevel(sku.id)}
                            </Badge>
                          </td>
                          <td className="py-2">{sku.reorderPoint}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <Link to="/transaction-history">
            <Button variant="link" className="px-0">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent transactions</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map(tx => {
                const sku = getSkuById(tx.skuId);
                const user = getUserById(tx.createdByUid);
                const qtyPrefix = tx.direction === 'IN' ? '+' : '-';
                const revenueText = tx.revenue ? ` (₱${tx.revenue.toFixed(2)})` : '';
                
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.photoURL || ''} />
                      <AvatarFallback className="text-xs">
                        {user?.displayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {user?.displayName || 'Unknown'}{' '}
                          <span className="text-muted-foreground font-normal">
                            {qtyPrefix}{tx.qty} × {sku?.skuCode || 'Unknown SKU'}
                            {revenueText}
                          </span>
                        </p>
                        <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">
                          {timeAgo(toDate(tx.txDate || tx.createdAt))}
                        </span>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        tx.direction === 'IN' 
                          ? 'bg-success/10 text-success border-success/20' 
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }
                    >
                      {tx.direction}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
