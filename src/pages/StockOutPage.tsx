import React, { useState, useMemo } from 'react';
import { Trash2, Plus, ArrowUpFromLine, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInventory } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { db, writeBatch, collection, doc, Timestamp, serverTimestamp } from '@/lib/firebase';

export const StockOutPage: React.FC = () => {
  const { platforms, reasonCategories, skus, getStockLevel, getProductById, getPlatformById, refreshData } = useInventory();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [reasonId, setReasonId] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lineItems, setLineItems] = useState<Array<{
    id: string;
    skuId: string;
    qty: number;
    unitPrice: number;
  }>>([{ id: crypto.randomUUID(), skuId: '', qty: 1, unitPrice: 0 }]);

  const outReasons = reasonCategories.filter(r => r.direction === 'OUT' && r.active !== false);
  const activePlatforms = platforms.filter(p => p.status === 'ACTIVE');

  const selectedReason = outReasons.find(r => r.id === reasonId);
  const selectedPlatform = platformId ? getPlatformById(platformId) : null;

  // Calculate totals
  const totals = useMemo(() => {
    const revenue = lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const fees = selectedPlatform ? revenue * (selectedPlatform.feesPercent / 100) : 0;
    return { revenue, fees, net: revenue - fees };
  }, [lineItems, selectedPlatform]);

  // Check for stock issues
  const stockIssues = useMemo(() => {
    return lineItems.filter(item => {
      if (!item.skuId) return false;
      const stock = getStockLevel(item.skuId);
      return item.qty > stock;
    });
  }, [lineItems, getStockLevel]);

  const addLineItem = () => {
    setLineItems([...lineItems, { id: crypto.randomUUID(), skuId: '', qty: 1, unitPrice: 0 }]);
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
        
        // Auto-fill price when SKU is selected
        if (field === 'skuId' && typeof value === 'string') {
          const sku = skus.find(s => s.id === value);
          if (sku) {
            updatedItem.unitPrice = sku.price || 0;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reasonId) {
      toast({ title: 'Error', description: 'Please select a reason', variant: 'destructive' });
      return;
    }

    if (selectedReason?.requiresPlatform && !platformId) {
      toast({ title: 'Error', description: 'Please select a platform', variant: 'destructive' });
      return;
    }

    const validLines = lineItems.filter(item => item.skuId && item.qty > 0);
    if (validLines.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one valid line item', variant: 'destructive' });
      return;
    }

    // Check stock availability
    for (const line of validLines) {
      const stock = getStockLevel(line.skuId);
      if (line.qty > stock) {
        const sku = skus.find(s => s.id === line.skuId);
        toast({ 
          title: 'Insufficient Stock', 
          description: `SKU ${sku?.skuCode} only has ${stock} available`, 
          variant: 'destructive' 
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const batch = writeBatch(db);
      
      validLines.forEach(line => {
        const txRef = doc(collection(db, 'inventoryTransactions'));
        batch.set(txRef, {
          txDate: Timestamp.fromDate(new Date(txDate)),
          direction: 'OUT',
          reasonCategoryId: reasonId,
          skuId: line.skuId,
          qty: line.qty,
          unitPrice: line.unitPrice,
          revenue: line.qty * line.unitPrice,
          platformId: platformId || null,
          referenceNo: referenceNo || null,
          notes: notes || null,
          createdByUid: user?.uid,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();

      toast({ title: 'Success', description: `Stock out recorded: ${validLines.length} item(s)` });
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
          <div className="p-2 rounded-lg bg-destructive/10">
            <ArrowUpFromLine className="h-6 w-6 text-destructive" />
          </div>
          Stock Out
        </h1>
        <p className="text-muted-foreground mt-1">Record outgoing inventory</p>
      </div>

      {stockIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some items exceed available stock. Please adjust quantities.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Fields */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select value={reasonId} onValueChange={setReasonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {outReasons.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedReason?.requiresPlatform && (
                <div className="space-y-2">
                  <Label>Platform *</Label>
                  <Select value={platformId} onValueChange={setPlatformId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activePlatforms.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.feesPercent}% fees)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reference No. (optional)</Label>
                <Input
                  placeholder="Order ID, etc."
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
              
              {lineItems.map((item) => {
                const selectedSku = skus.find(s => s.id === item.skuId);
                const product = selectedSku ? getProductById(selectedSku.productId) : null;
                const currentStock = item.skuId ? getStockLevel(item.skuId) : 0;
                const isOverStock = item.skuId && item.qty > currentStock;

                return (
                  <div 
                    key={item.id} 
                    className={`flex gap-3 items-end p-4 rounded-lg ${isOverStock ? 'bg-destructive/10' : 'bg-muted'}`}
                  >
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
                            const stock = getStockLevel(sku.id);
                            return (
                              <SelectItem key={sku.id} value={sku.id}>
                                {sku.skuCode} - {prod?.name} ({sku.size}/{sku.color}) [Stock: {stock}]
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {selectedSku && (
                        <p className="text-xs text-muted-foreground">
                          Available: <Badge variant={isOverStock ? 'destructive' : 'outline'}>{currentStock}</Badge>
                          {selectedSku.reorderPoint && currentStock <= selectedSku.reorderPoint && (
                            <span className="ml-2 text-warning">⚠️ Low stock</span>
                          )}
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
                        className={isOverStock ? 'border-destructive' : ''}
                      />
                    </div>

                    <div className="w-28 space-y-2">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="w-28 text-right">
                      <Label className="text-xs block mb-2">Line Total</Label>
                      <p className="font-semibold">₱{(item.qty * item.unitPrice).toFixed(2)}</p>
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

            {/* Totals */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total Revenue:</span>
                <span className="font-bold text-lg">₱{totals.revenue.toFixed(2)}</span>
              </div>
              {selectedPlatform && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform Fees ({selectedPlatform.feesPercent}%):</span>
                    <span>-₱{totals.fees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Net Revenue:</span>
                    <span className="text-success">₱{totals.net.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || stockIssues.length > 0}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Stock Out'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
