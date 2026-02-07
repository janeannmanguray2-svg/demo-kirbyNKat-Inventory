import React, { useState, useMemo } from 'react';
import { Trash2, Plus, ArrowDownToLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { db, writeBatch, collection, doc, Timestamp, serverTimestamp } from '@/lib/firebase';

export const StockInPage: React.FC = () => {
  const { suppliers, reasonCategories, skus, products, getStockLevel, getProductById, refreshData } = useInventory();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [sourceType, setSourceType] = useState<'SUPPLIER' | 'RTS' | ''>('');
  const [reasonId, setReasonId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [rtsLocation, setRtsLocation] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lineItems, setLineItems] = useState<Array<{
    id: string;
    skuId: string;
    qty: number;
    unitCost: number;
  }>>([{ id: crypto.randomUUID(), skuId: '', qty: 1, unitCost: 0 }]);

  const inReasons = reasonCategories.filter(r => r.direction === 'IN' && r.active !== false);
  const activeSuppliers = suppliers.filter(s => s.status === 'ACTIVE');

  const selectedReason = inReasons.find(r => r.id === reasonId);

  const addLineItem = () => {
    setLineItems([...lineItems, { id: crypto.randomUUID(), skuId: '', qty: 1, unitCost: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: string, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-fill cost when SKU is selected
        if (field === 'skuId' && typeof value === 'string') {
          const sku = skus.find(s => s.id === value);
          if (sku) {
            updatedItem.unitCost = sku.cost || 0;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceType) {
      toast({ title: 'Error', description: 'Please select a source type', variant: 'destructive' });
      return;
    }

    if (!reasonId) {
      toast({ title: 'Error', description: 'Please select a reason', variant: 'destructive' });
      return;
    }

    if (sourceType === 'SUPPLIER' && !supplierId) {
      toast({ title: 'Error', description: 'Please select a supplier', variant: 'destructive' });
      return;
    }

    if (sourceType === 'RTS' && !rtsLocation.trim()) {
      toast({ title: 'Error', description: 'Please enter RTS location', variant: 'destructive' });
      return;
    }

    const validLines = lineItems.filter(item => item.skuId && item.qty > 0);
    if (validLines.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one valid line item', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const batch = writeBatch(db);
      
      validLines.forEach(line => {
        const txRef = doc(collection(db, 'inventoryTransactions'));
        batch.set(txRef, {
          txDate: Timestamp.fromDate(new Date(txDate)),
          direction: 'IN',
          sourceType: sourceType,
          reasonCategoryId: reasonId,
          skuId: line.skuId,
          qty: line.qty,
          unitCost: line.unitCost,
          supplierId: sourceType === 'SUPPLIER' ? supplierId : null,
          rtsLocation: sourceType === 'RTS' ? rtsLocation : null,
          referenceNo: referenceNo || null,
          notes: notes || null,
          createdByUid: user?.uid,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();

      toast({ title: 'Success', description: `Stock in recorded: ${validLines.length} item(s)` });
      await refreshData();
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <ArrowDownToLine className="h-6 w-6 text-success" />
          </div>
          Stock In
        </h1>
        <p className="text-muted-foreground mt-1">Record incoming inventory</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Fields */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Source Type *</Label>
                <Select value={sourceType} onValueChange={(value: 'SUPPLIER' | 'RTS') => setSourceType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLIER">From Supplier</SelectItem>
                    <SelectItem value="RTS">From RTS (Ready-to-Ship)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select value={reasonId} onValueChange={setReasonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inReasons.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sourceType === 'SUPPLIER' && (
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSuppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {sourceType === 'RTS' && (
                <div className="space-y-2">
                  <Label>RTS Location/Batch *</Label>
                  <Input
                    placeholder="e.g., Warehouse A, Batch #123"
                    value={rtsLocation}
                    onChange={(e) => setRtsLocation(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Reference No. (optional)</Label>
                <Input
                  placeholder="PO number, etc."
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Transaction Date *</Label>
                <Input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <Label>Line Items</Label>
              
              {lineItems.map((item, index) => {
                const selectedSku = skus.find(s => s.id === item.skuId);
                const product = selectedSku ? getProductById(selectedSku.productId) : null;
                const currentStock = item.skuId ? getStockLevel(item.skuId) : 0;

                return (
                  <div key={item.id} className="flex gap-3 items-end p-4 bg-muted rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">SKU</Label>
                      <Select
                        value={item.skuId}
                        onValueChange={(value) => updateLineItem(item.id, 'skuId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select SKU..." />
                        </SelectTrigger>
                        <SelectContent>
                          {skus.map(sku => {
                            const prod = getProductById(sku.productId);
                            return (
                              <SelectItem key={sku.id} value={sku.id}>
                                {sku.skuCode} - {prod?.name} ({sku.size}/{sku.color})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {selectedSku && (
                        <p className="text-xs text-muted-foreground">
                          Current stock: <Badge variant="outline">{currentStock}</Badge>
                        </p>
                      )}
                    </div>

                    <div className="w-24 space-y-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateLineItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="w-28 space-y-2">
                      <Label className="text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => updateLineItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full bg-success hover:bg-success/90" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Stock In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
