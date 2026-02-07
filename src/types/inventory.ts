import { Timestamp } from 'firebase/firestore';

// User roles and status
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type TransactionDirection = 'IN' | 'OUT' | 'ADJUSTMENT';
export type SourceType = 'SUPPLIER' | 'RTS';
export type StockStatus = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL';

// User profile
export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Timestamp | null;
  lastLoginAt: Timestamp | null;
}

// Category
export interface Category {
  id: string;
  name: string;
  createdAt: Timestamp | null;
}

// Product
export interface Product {
  id: string;
  name: string;
  categoryId: string;
  status: EntityStatus;
  createdAt: Timestamp | null;
}

// SKU (Stock Keeping Unit)
export interface SKU {
  id: string;
  productId: string;
  skuCode: string;
  size: string;
  color: string;
  price: number;
  cost: number;
  reorderPoint: number;
  createdAt: Timestamp | null;
}

// Supplier
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: EntityStatus;
  notes: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Platform (Sales channel)
export interface Platform {
  id: string;
  name: string;
  feesPercent: number;
  status: EntityStatus;
  description: string;
  color: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Reason Category
export interface ReasonCategory {
  id: string;
  name: string;
  direction: TransactionDirection;
  requiresPlatform: boolean;
  requiresSupplier: boolean;
  active: boolean;
  createdAt: Timestamp | null;
}

// Color variant
export interface Color {
  id: string;
  name: string;
  hexCode: string;
  active: boolean;
  sortOrder: number;
  createdAt: Timestamp | null;
}

// Size variant
export interface Size {
  id: string;
  name: string;
  category: string;
  active: boolean;
  sortOrder: number;
  createdAt: Timestamp | null;
}

// Inventory Transaction
export interface InventoryTransaction {
  id: string;
  txDate: Timestamp | null;
  direction: TransactionDirection;
  sourceType: SourceType | null;
  reasonCategoryId: string;
  skuId: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
  revenue: number;
  supplierId: string | null;
  rtsLocation: string | null;
  platformId: string | null;
  referenceNo: string | null;
  notes: string | null;
  createdByUid: string;
  createdAt: Timestamp | null;
}

// Stock level helper type
export interface StockLevels {
  [skuId: string]: number;
}

// Report filters
export interface InventoryFilters {
  fromDate: string | null;
  toDate: string | null;
  categoryId: string;
  status: StockStatus;
  search: string;
}

export interface TransactionFilters {
  fromDate: string | null;
  toDate: string | null;
  direction: TransactionDirection | 'ALL';
  userUid: string;
  productId: string;
  skuId: string;
  reasonId: string;
  platformId: string;
  supplierId: string;
  search: string;
}

// Line item for stock forms
export interface StockLineItem {
  id: string;
  skuId: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
}

// Inventory report row
export interface InventoryReportRow {
  sku: SKU;
  product: Product;
  category: Category | null;
  stockLevel: number;
  stockValue: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'critical';
}

// Transaction report row
export interface TransactionReportRow {
  transaction: InventoryTransaction;
  sku: SKU | null;
  product: Product | null;
  platform: Platform | null;
  supplier: Supplier | null;
  reason: ReasonCategory | null;
  createdBy: UserProfile | null;
}

// Dashboard stats
export interface DashboardStats {
  totalProducts: number;
  totalSKUs: number;
  totalOnHand: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayRevenue: number;
  last7DaysRevenue: number;
}

// Settings
export interface SystemSettings {
  businessName: string;
  currency: string;
  defaultReorderPoint: number;
  lowStockThreshold: number;
}

// Navigation item
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  roles?: UserRole[];
  badge?: number;
}
