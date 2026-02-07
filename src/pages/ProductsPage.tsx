import React, { useState } from 'react';
import { Plus, Edit, Package, Search, MoreVertical, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/hooks/use-toast';
import { db, addDoc, collection, serverTimestamp, updateDoc, doc } from '@/lib/firebase';
import { Product, SKU } from '@/types/inventory';

export const ProductsPage: React.FC = () => {
  const { products, categories, skus, getStockLevel, getCategoryById, refreshData, colors, sizes } = useInventory();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isSkusModalOpen, setIsSkusModalOpen] = useState(false);
  const [isAddSkuOpen, setIsAddSkuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [productForm, setProductForm] = useState({ name: '', categoryId: '' });
  const [skuForm, setSkuForm] = useState({
    skuCode: '',
    size: '',
    color: '',
    price: '',
    cost: '',
    reorderPoint: '5'
  });

  // Filter products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Get SKUs for selected product
  const productSkus = selectedProduct
    ? skus.filter(s => s.productId === selectedProduct.id)
    : [];

  const handleAddProduct = async () => {
    if (!productForm.name.trim()) {
      toast({ title: 'Error', description: 'Product name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'products'), {
        name: productForm.name.trim(),
        categoryId: productForm.categoryId || null,
        status: 'ACTIVE',
        createdAt: serverTimestamp()
      });
      
      toast({ title: 'Success', description: 'Product added successfully' });
      setIsAddProductOpen(false);
      setProductForm({ name: '', categoryId: '' });
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct || !productForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        name: productForm.name.trim(),
        categoryId: productForm.categoryId || null
      });
      
      toast({ title: 'Success', description: 'Product updated successfully' });
      setIsEditProductOpen(false);
      setSelectedProduct(null);
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSku = async () => {
    if (!selectedProduct || !skuForm.skuCode.trim()) {
      toast({ title: 'Error', description: 'SKU code is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'skus'), {
        productId: selectedProduct.id,
        skuCode: skuForm.skuCode.trim(),
        size: skuForm.size || null,
        color: skuForm.color || null,
        price: parseFloat(skuForm.price) || 0,
        cost: parseFloat(skuForm.cost) || 0,
        reorderPoint: parseInt(skuForm.reorderPoint) || 5,
        createdAt: serverTimestamp()
      });
      
      toast({ title: 'Success', description: 'SKU added successfully' });
      setIsAddSkuOpen(false);
      setSkuForm({ skuCode: '', size: '', color: '', price: '', cost: '', reorderPoint: '5' });
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({ name: product.name, categoryId: product.categoryId || '' });
    setIsEditProductOpen(true);
  };

  const openSkusModal = (product: Product) => {
    setSelectedProduct(product);
    setIsSkusModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={() => setIsAddProductOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm text-muted-foreground">Add your first product to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">SKUs</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total Stock</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const category = getCategoryById(product.categoryId);
                const productSkuList = skus.filter(s => s.productId === product.id);
                const totalStock = productSkuList.reduce((sum, sku) => sum + getStockLevel(sku.id), 0);
                
                return (
                  <tr key={product.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{product.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{category?.name || 'Uncategorized'}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2"
                        onClick={() => openSkusModal(product)}
                      >
                        <Badge variant="secondary">{productSkuList.length} SKUs</Badge>
                      </Button>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={totalStock > 0 ? 'default' : 'destructive'}>
                        {totalStock}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditProduct(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openSkusModal(product)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View SKUs
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a new product in your catalog</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                placeholder="Enter product name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={productForm.categoryId}
                onValueChange={(value) => setProductForm({ ...productForm, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={productForm.categoryId}
                onValueChange={(value) => setProductForm({ ...productForm, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
            <Button onClick={handleEditProduct} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SKUs Modal */}
      <Dialog open={isSkusModalOpen} onOpenChange={setIsSkusModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>SKUs - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button size="sm" onClick={() => setIsAddSkuOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add SKU
            </Button>
            
            {productSkus.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No SKUs for this product</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium">SKU Code</th>
                      <th className="text-left py-2 px-3 font-medium">Size</th>
                      <th className="text-left py-2 px-3 font-medium">Color</th>
                      <th className="text-left py-2 px-3 font-medium">Stock</th>
                      <th className="text-left py-2 px-3 font-medium">Reorder</th>
                      <th className="text-left py-2 px-3 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSkus.map(sku => (
                      <tr key={sku.id} className="border-b">
                        <td className="py-2 px-3 font-medium">{sku.skuCode}</td>
                        <td className="py-2 px-3">{sku.size || '-'}</td>
                        <td className="py-2 px-3">{sku.color || '-'}</td>
                        <td className="py-2 px-3">
                          <Badge 
                            variant={getStockLevel(sku.id) <= (sku.reorderPoint || 0) ? 'destructive' : 'default'}
                          >
                            {getStockLevel(sku.id)}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">{sku.reorderPoint}</td>
                        <td className="py-2 px-3">₱{sku.price?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add SKU Dialog */}
      <Dialog open={isAddSkuOpen} onOpenChange={setIsAddSkuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SKU</DialogTitle>
            <DialogDescription>Add a new SKU to {selectedProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>SKU Code *</Label>
              <Input
                placeholder="e.g., PROD-001-S-RED"
                value={skuForm.skuCode}
                onChange={(e) => setSkuForm({ ...skuForm, skuCode: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Size</Label>
                <Select
                  value={skuForm.size}
                  onValueChange={(value) => setSkuForm({ ...skuForm, size: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.filter(s => s.active).map(size => (
                      <SelectItem key={size.id} value={size.name}>{size.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={skuForm.color}
                  onValueChange={(value) => setSkuForm({ ...skuForm, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.filter(c => c.active).map(color => (
                      <SelectItem key={color.id} value={color.name}>{color.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={skuForm.price}
                  onChange={(e) => setSkuForm({ ...skuForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={skuForm.cost}
                  onChange={(e) => setSkuForm({ ...skuForm, cost: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                value={skuForm.reorderPoint}
                onChange={(e) => setSkuForm({ ...skuForm, reorderPoint: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSkuOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSku} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add SKU'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
