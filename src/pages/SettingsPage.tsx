import React, { useState } from 'react';
import { Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/hooks/use-toast';
import { db, addDoc, collection, serverTimestamp, updateDoc, doc, deleteDoc } from '@/lib/firebase';

export const SettingsPage: React.FC = () => {
  const { categories, reasonCategories, colors, sizes, refreshData } = useInventory();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category state
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  // Reason state
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [reasonForm, setReasonForm] = useState({ name: '', direction: 'IN', requiresPlatform: false, requiresSupplier: false });

  // Color state
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [colorForm, setColorForm] = useState({ name: '', hexCode: '#000000' });

  // Size state
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [sizeName, setSizeName] = useState('');

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'categories'), { name: categoryName.trim(), createdAt: serverTimestamp() });
      toast({ title: 'Success', description: 'Category added' });
      setIsCategoryOpen(false);
      setCategoryName('');
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReason = async () => {
    if (!reasonForm.name.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reasonCategories'), { ...reasonForm, active: true, createdAt: serverTimestamp() });
      toast({ title: 'Success', description: 'Reason added' });
      setIsReasonOpen(false);
      setReasonForm({ name: '', direction: 'IN', requiresPlatform: false, requiresSupplier: false });
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddColor = async () => {
    if (!colorForm.name.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'colors'), { ...colorForm, active: true, sortOrder: 0, createdAt: serverTimestamp() });
      toast({ title: 'Success', description: 'Color added' });
      setIsColorOpen(false);
      setColorForm({ name: '', hexCode: '#000000' });
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSize = async () => {
    if (!sizeName.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'sizes'), { name: sizeName.trim(), active: true, sortOrder: 0, createdAt: serverTimestamp() });
      toast({ title: 'Success', description: 'Size added' });
      setIsSizeOpen(false);
      setSizeName('');
      await refreshData();
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
          <Settings className="h-7 w-7" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage categories, reasons, colors, and sizes</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="reasons">Reasons</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="sizes">Sizes</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categories</CardTitle>
              <Button size="sm" onClick={() => setIsCategoryOpen(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? <p className="text-muted-foreground">No categories</p> : (
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span>{cat.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reasons">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reason Categories</CardTitle>
              <Button size="sm" onClick={() => setIsReasonOpen(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </CardHeader>
            <CardContent>
              {reasonCategories.length === 0 ? <p className="text-muted-foreground">No reasons</p> : (
                <div className="space-y-2">
                  {reasonCategories.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{r.name}</span>
                        <Badge variant="outline">{r.direction}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Colors</CardTitle>
              <Button size="sm" onClick={() => setIsColorOpen(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </CardHeader>
            <CardContent>
              {colors.length === 0 ? <p className="text-muted-foreground">No colors</p> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {colors.map(c => (
                    <div key={c.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: c.hexCode }} />
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sizes</CardTitle>
              <Button size="sm" onClick={() => setIsSizeOpen(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </CardHeader>
            <CardContent>
              {sizes.length === 0 ? <p className="text-muted-foreground">No sizes</p> : (
                <div className="flex flex-wrap gap-2">
                  {sizes.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g., Clothing, Accessories" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reason Dialog */}
      <Dialog open={isReasonOpen} onOpenChange={setIsReasonOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Reason</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={reasonForm.name} onChange={(e) => setReasonForm({ ...reasonForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={reasonForm.direction} onValueChange={(v) => setReasonForm({ ...reasonForm, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">IN</SelectItem>
                  <SelectItem value="OUT">OUT</SelectItem>
                  <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReasonOpen(false)}>Cancel</Button>
            <Button onClick={handleAddReason} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Color Dialog */}
      <Dialog open={isColorOpen} onOpenChange={setIsColorOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Color</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Color Name</Label>
              <Input value={colorForm.name} onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Hex Code</Label>
              <Input type="color" value={colorForm.hexCode} onChange={(e) => setColorForm({ ...colorForm, hexCode: e.target.value })} className="h-12" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColorOpen(false)}>Cancel</Button>
            <Button onClick={handleAddColor} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Size Dialog */}
      <Dialog open={isSizeOpen} onOpenChange={setIsSizeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Size</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Size Name</Label>
              <Input value={sizeName} onChange={(e) => setSizeName(e.target.value)} placeholder="e.g., S, M, L, XL" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSizeOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSize} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
