import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';

// Firebase configuration - using the provided config
const firebaseConfig = {
  apiKey: "AIzaSyBDk9cPUh3HXRK_AgWwb78Lf2oarpi6Huk",
  authDomain: "kirbynkatinventory.firebaseapp.com",
  projectId: "kirbynkatinventory",
  storageBucket: "kirbynkatinventory.firebasestorage.app",
  messagingSenderId: "787850404398",
  appId: "1:787850404398:web:aa24c1fd2b95d287a3f5bf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// SUPERADMIN emails - users with these emails get automatic SUPERADMIN role
export const SUPERADMIN_EMAILS = ["your-email@gmail.com"];

// Auth functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signOut = () => firebaseSignOut(auth);

// Firestore helpers
export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
  limit
};

// Helper function to convert Firestore timestamp to Date
export const toDate = (timestamp: Timestamp | Date | string | null | undefined): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);
  return null;
};

// Helper function to format date
export const formatDate = (date: Date | null): string => {
  if (!date) return '-';
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Helper function to format date and time
export const formatDateTime = (date: Date | null): string => {
  if (!date) return '-';
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

// Helper to get time ago string
export const timeAgo = (date: Date | null): string => {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
