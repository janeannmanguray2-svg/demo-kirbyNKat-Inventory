import React, { useState } from 'react';
import { Plus, Edit, Trash2, MoreVertical, Store, History, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/hooks/use-toast';
import { db, addDoc, collection, serverTimestamp, updateDoc, doc, deleteDoc } from '@/lib/firebase';
import { Platform } from '@/types/inventory';
import { toDate, formatDate } from '@/lib/firebase';

export const PlatformsPage: React.FC = () => {
  const { platforms, transactions, getSkuById, refreshData } = useInventory();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    feesPercent: '0',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    description: '',
    color: '#10B981'
  });

  const resetForm = () => {
    setForm({
      name: '',
      feesPercent: '0',
      status: 'ACTIVE',
      description: '',
      color: '#10B981'
    });
  };

  const getPlatformStats = (platformId: string) => {
    const platformTx = transactions.filter(t => t.platformId === platformId && t.direction === 'OUT');
    const totalRevenue = platformTx.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const totalQty = platformTx.reduce((sum, t) => sum + t.qty, 0);
    const lastSale = platformTx.length > 0 ? toDate(platformTx[0].txDate) : null;
    return { totalRevenue, totalQty, lastSale, txCount: platformTx.length };
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'Platform name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'platforms'), {
        name: form.name.trim(),
        feesPercent: parseFloat(form.feesPercent) || 0,
        status: form.status,
        description: form.description,
        color: form.color,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Success', description: 'Platform added successfully' });
      setIsAddOpen(false);
      resetForm();
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPlatform || !form.name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'platforms', selectedPlatform.id), {
        name: form.name.trim(),
        feesPercent: parseFloat(form.feesPercent) || 0,
        status: form.status,
        description: form.description,
        color: form.color,
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Success', description: 'Platform updated successfully' });
      setIsEditOpen(false);
      setSelectedPlatform(null);
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlatform) return;

    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'platforms', selectedPlatform.id));
      toast({ title: 'Success', description: 'Platform deleted successfully' });
      setIsDeleteOpen(false);
      setSelectedPlatform(null);
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (platform: Platform) => {
    try {
      await updateDoc(doc(db, 'platforms', platform.id), {
        status: platform.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Success', description: 'Platform status updated' });
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEdit = (platform: Platform) => {
    setSelectedPlatform(platform);
    setForm({
      name: platform.name,
      feesPercent: platform.feesPercent?.toString() || '0',
      status: platform.status,
      description: platform.description || '',
      color: platform.color || '#10B981'
    });
    setIsEditOpen(true);
  };

  const openHistory = (platform: Platform) => {
    setSelectedPlatform(platform);
    setIsHistoryOpen(true);
  };

  const openDelete = (platform: Platform) => {
    setSelectedPlatform(platform);
    setIsDeleteOpen(true);
  };

  const platformTxHistory = selectedPlatform 
    ? transactions.filter(t => t.platformId === selectedPlatform.id && t.direction === 'OUT')
    : [];

  const historyTotals = platformTxHistory.reduce((acc, tx) => {
    const fees = (tx.revenue || 0) * ((selectedPlatform?.feesPercent || 0) / 100);
    return {
      revenue: acc.revenue + (tx.revenue || 0),
      fees: acc.fees + fees,
      qty: acc.qty + tx.qty
    };
  }, { revenue: 0, fees: 0, qty: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Platforms</h1>
          <p className="text-muted-foreground">Manage your sales platforms</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Platform
        </Button>
      </div>

      {/* Platforms Grid */}
      {platforms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">No platforms yet</p>
            <p className="text-sm text-muted-foreground">Add your first sales platform</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platforms.map(platform => {
            const stats = getPlatformStats(platform.id);
            return (
              <Card key={platform.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: platform.color || '#10B981' }}
                      >
                        <Store className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{platform.name}</h3>
                        <p className="text-sm text-muted-foreground">{platform.feesPercent}% fees</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={platform.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {platform.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(platform)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openHistory(platform)}>
                            <History className="h-4 w-4 mr-2" />
                            View Sales
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(platform)}>
                            {platform.status === 'ACTIVE' ? (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-2" />
                                Mark Inactive
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4 mr-2" />
                                Mark Active
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={() => openDelete(platform)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {platform.description && (
                    <p className="text-sm text-muted-foreground mb-3">{platform.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center text-sm pt-3 border-t">
                    <div>
                      <p className="text-muted-foreground">Sales</p>
                      <p className="font-semibold">{stats.txCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-semibold text-success">₱{stats.totalRevenue.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Units</p>
                      <p className="font-semibold">{stats.totalQty}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => { 
        if (!open) { setIsAddOpen(false); setIsEditOpen(false); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditOpen ? 'Edit Platform' : 'Add Platform'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Shopee, Lazada, TikTok Shop"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fees Percentage</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.feesPercent}
                  onChange={(e) => setForm({ ...form, feesPercent: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: 'ACTIVE' | 'INACTIVE') => setForm({ ...form, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="#10B981"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={isEditOpen ? handleEdit : handleAdd} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sales History - {selectedPlatform?.name}</DialogTitle>
          </DialogHeader>
          
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">₱{historyTotals.revenue.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Platform Fees</p>
              <p className="text-xl font-bold text-destructive">-₱{historyTotals.fees.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Net Revenue</p>
              <p className="text-xl font-bold text-success">
                ₱{(historyTotals.revenue - historyTotals.fees).toFixed(2)}
              </p>
            </div>
          </div>

          {platformTxHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sales on this platform</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-left py-2 px-3 font-medium">SKU</th>
                    <th className="text-right py-2 px-3 font-medium">Qty</th>
                    <th className="text-right py-2 px-3 font-medium">Revenue</th>
                    <th className="text-right py-2 px-3 font-medium">Fees</th>
                    <th className="text-right py-2 px-3 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {platformTxHistory.map(tx => {
                    const sku = getSkuById(tx.skuId);
                    const fees = (tx.revenue || 0) * ((selectedPlatform?.feesPercent || 0) / 100);
                    return (
                      <tr key={tx.id} className="border-b">
                        <td className="py-2 px-3">{formatDate(toDate(tx.txDate))}</td>
                        <td className="py-2 px-3">{sku?.skuCode || tx.skuId}</td>
                        <td className="py-2 px-3 text-right">{tx.qty}</td>
                        <td className="py-2 px-3 text-right">₱{(tx.revenue || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-destructive">-₱{fees.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-medium text-success">
                          ₱{((tx.revenue || 0) - fees).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Platform?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPlatform?.name}"?
              {platformTxHistory.length > 0 && (
                <span className="block mt-2 text-warning">
                  ⚠️ This platform has {platformTxHistory.length} transactions.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
