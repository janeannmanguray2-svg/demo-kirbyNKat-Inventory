import React, { useState } from 'react';
import { Plus, Edit, Trash2, MoreVertical, Truck, History, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Supplier } from '@/types/inventory';
import { toDate, formatDate } from '@/lib/firebase';

export const SuppliersPage: React.FC = () => {
  const { suppliers, transactions, refreshData } = useInventory();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    notes: ''
  });

  const resetForm = () => {
    setForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      status: 'ACTIVE',
      notes: ''
    });
  };

  const getSupplierStats = (supplierId: string) => {
    const supplierTx = transactions.filter(t => t.supplierId === supplierId);
    const totalPurchases = supplierTx.reduce((sum, t) => sum + (t.qty * (t.unitCost || 0)), 0);
    const lastPurchase = supplierTx.length > 0 ? toDate(supplierTx[0].txDate) : null;
    return { totalPurchases, lastPurchase, txCount: supplierTx.length };
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'Supplier name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'suppliers'), {
        ...form,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Success', description: 'Supplier added successfully' });
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
    if (!selectedSupplier || !form.name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'suppliers', selectedSupplier.id), {
        ...form,
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Success', description: 'Supplier updated successfully' });
      setIsEditOpen(false);
      setSelectedSupplier(null);
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'suppliers', selectedSupplier.id));
      toast({ title: 'Success', description: 'Supplier deleted successfully' });
      setIsDeleteOpen(false);
      setSelectedSupplier(null);
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      await updateDoc(doc(db, 'suppliers', supplier.id), {
        status: supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Success', description: 'Supplier status updated' });
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      status: supplier.status,
      notes: supplier.notes || ''
    });
    setIsEditOpen(true);
  };

  const openHistory = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsHistoryOpen(true);
  };

  const openDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteOpen(true);
  };

  const supplierTxHistory = selectedSupplier 
    ? transactions.filter(t => t.supplierId === selectedSupplier.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your suppliers</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">No suppliers yet</p>
            <p className="text-sm text-muted-foreground">Add your first supplier to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map(supplier => {
            const stats = getSupplierStats(supplier.id);
            return (
              <Card key={supplier.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{supplier.name}</h3>
                      {supplier.contactPerson && (
                        <p className="text-sm text-muted-foreground">{supplier.contactPerson}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={supplier.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {supplier.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(supplier)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openHistory(supplier)}>
                            <History className="h-4 w-4 mr-2" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(supplier)}>
                            {supplier.status === 'ACTIVE' ? (
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
                            onClick={() => openDelete(supplier)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {supplier.email && (
                      <p className="text-muted-foreground">{supplier.email}</p>
                    )}
                    {supplier.phone && (
                      <p className="text-muted-foreground">{supplier.phone}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Purchases</p>
                      <p className="font-semibold">₱{stats.totalPurchases.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Last Purchase</p>
                      <p className="font-medium">{stats.lastPurchase ? formatDate(stats.lastPurchase) : 'Never'}</p>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="Enter contact person"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Enter full address"
                rows={2}
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
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

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase History - {selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          {supplierTxHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions with this supplier</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-left py-2 px-3 font-medium">SKU</th>
                    <th className="text-right py-2 px-3 font-medium">Qty</th>
                    <th className="text-right py-2 px-3 font-medium">Unit Cost</th>
                    <th className="text-right py-2 px-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierTxHistory.map(tx => (
                    <tr key={tx.id} className="border-b">
                      <td className="py-2 px-3">{formatDate(toDate(tx.txDate))}</td>
                      <td className="py-2 px-3">{tx.skuId}</td>
                      <td className="py-2 px-3 text-right">{tx.qty}</td>
                      <td className="py-2 px-3 text-right">₱{(tx.unitCost || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-medium">
                        ₱{(tx.qty * (tx.unitCost || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
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
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSupplier?.name}"? 
              {supplierTxHistory.length > 0 && (
                <span className="block mt-2 text-warning">
                  ⚠️ This supplier has {supplierTxHistory.length} transactions. Consider marking as inactive instead.
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
