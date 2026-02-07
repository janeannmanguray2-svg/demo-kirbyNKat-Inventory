import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  orderBy,
  toDate
} from '@/lib/firebase';
import { 
  Product, 
  SKU, 
  Category, 
  Supplier, 
  Platform, 
  ReasonCategory, 
  InventoryTransaction, 
  UserProfile,
  Color,
  Size,
  StockLevels,
  DashboardStats
} from '@/types/inventory';
import { useAuth } from './AuthContext';

interface InventoryContextType {
  // Data
  products: Product[];
  skus: SKU[];
  categories: Category[];
  suppliers: Supplier[];
  platforms: Platform[];
  reasonCategories: ReasonCategory[];
  transactions: InventoryTransaction[];
  users: UserProfile[];
  colors: Color[];
  sizes: Size[];
  stockLevels: StockLevels;
  
  // Loading states
  loading: boolean;
  
  // Actions
  refreshData: () => Promise<void>;
  getStockLevel: (skuId: string) => number;
  getProductById: (id: string) => Product | undefined;
  getSkuById: (id: string) => SKU | undefined;
  getCategoryById: (id: string) => Category | undefined;
  getSupplierById: (id: string) => Supplier | undefined;
  getPlatformById: (id: string) => Platform | undefined;
  getReasonById: (id: string) => ReasonCategory | undefined;
  getUserById: (uid: string) => UserProfile | undefined;
  getSkusByProductId: (productId: string) => SKU[];
  getDashboardStats: () => DashboardStats;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

interface InventoryProviderProps {
  children: ReactNode;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const { userProfile } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [reasonCategories, setReasonCategories] = useState<ReasonCategory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevels>({});
  const [loading, setLoading] = useState(true);

  const loadCollection = async <T extends { id: string }>(
    collectionName: string,
    orderField: string = 'createdAt'
  ): Promise<T[]> => {
    try {
      const q = query(collection(db, collectionName), orderBy(orderField, 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
    } catch (error) {
      console.error(`Error loading ${collectionName}:`, error);
      return [];
    }
  };

  const calculateStockLevels = useCallback((txs: InventoryTransaction[]): StockLevels => {
    const levels: StockLevels = {};
    
    txs.forEach(tx => {
      if (!levels[tx.skuId]) {
        levels[tx.skuId] = 0;
      }
      
      if (tx.direction === 'IN') {
        levels[tx.skuId] += tx.qty;
      } else if (tx.direction === 'OUT') {
        levels[tx.skuId] -= tx.qty;
      } else if (tx.direction === 'ADJUSTMENT') {
        levels[tx.skuId] += tx.qty; // Adjustments can be positive or negative
      }
    });
    
    return levels;
  }, []);

  const refreshData = useCallback(async () => {
    if (!userProfile || userProfile.status !== 'APPROVED') {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const [
        productsData,
        skusData,
        categoriesData,
        suppliersData,
        platformsData,
        reasonsData,
        transactionsData,
        usersData,
        colorsData,
        sizesData
      ] = await Promise.all([
        loadCollection<Product>('products'),
        loadCollection<SKU>('skus'),
        loadCollection<Category>('categories'),
        loadCollection<Supplier>('suppliers'),
        loadCollection<Platform>('platforms'),
        loadCollection<ReasonCategory>('reasonCategories'),
        loadCollection<InventoryTransaction>('inventoryTransactions', 'txDate'),
        loadCollection<UserProfile>('users'),
        loadCollection<Color>('colors', 'sortOrder'),
        loadCollection<Size>('sizes', 'sortOrder')
      ]);

      setProducts(productsData);
      setSkus(skusData);
      setCategories(categoriesData);
      setSuppliers(suppliersData);
      setPlatforms(platformsData);
      setReasonCategories(reasonsData);
      setTransactions(transactionsData);
      setUsers(usersData);
      setColors(colorsData);
      setSizes(sizesData);
      setStockLevels(calculateStockLevels(transactionsData));
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  }, [userProfile, calculateStockLevels]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const getStockLevel = useCallback((skuId: string): number => {
    return stockLevels[skuId] || 0;
  }, [stockLevels]);

  const getProductById = useCallback((id: string) => products.find(p => p.id === id), [products]);
  const getSkuById = useCallback((id: string) => skus.find(s => s.id === id), [skus]);
  const getCategoryById = useCallback((id: string) => categories.find(c => c.id === id), [categories]);
  const getSupplierById = useCallback((id: string) => suppliers.find(s => s.id === id), [suppliers]);
  const getPlatformById = useCallback((id: string) => platforms.find(p => p.id === id), [platforms]);
  const getReasonById = useCallback((id: string) => reasonCategories.find(r => r.id === id), [reasonCategories]);
  const getUserById = useCallback((uid: string) => users.find(u => u.uid === uid), [users]);
  const getSkusByProductId = useCallback((productId: string) => skus.filter(s => s.productId === productId), [skus]);

  const getDashboardStats = useCallback((): DashboardStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let totalOnHand = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    skus.forEach(sku => {
      const stock = getStockLevel(sku.id);
      totalOnHand += Math.max(0, stock);
      totalInventoryValue += Math.max(0, stock) * (sku.cost || 0);
      
      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= (sku.reorderPoint || 0)) {
        lowStockCount++;
      }
    });

    const todayRevenue = transactions
      .filter(tx => {
        const txDate = toDate(tx.txDate);
        return tx.direction === 'OUT' && txDate && txDate >= today;
      })
      .reduce((sum, tx) => sum + (tx.revenue || 0), 0);

    const last7DaysRevenue = transactions
      .filter(tx => {
        const txDate = toDate(tx.txDate);
        return tx.direction === 'OUT' && txDate && txDate >= sevenDaysAgo;
      })
      .reduce((sum, tx) => sum + (tx.revenue || 0), 0);

    return {
      totalProducts: products.length,
      totalSKUs: skus.length,
      totalOnHand,
      totalInventoryValue,
      lowStockCount,
      outOfStockCount,
      todayRevenue,
      last7DaysRevenue
    };
  }, [products, skus, transactions, getStockLevel]);

  return (
    <InventoryContext.Provider
      value={{
        products,
        skus,
        categories,
        suppliers,
        platforms,
        reasonCategories,
        transactions,
        users,
        colors,
        sizes,
        stockLevels,
        loading,
        refreshData,
        getStockLevel,
        getProductById,
        getSkuById,
        getCategoryById,
        getSupplierById,
        getPlatformById,
        getReasonById,
        getUserById,
        getSkusByProductId,
        getDashboardStats
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};
