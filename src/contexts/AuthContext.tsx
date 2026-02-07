import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  db, 
  signInWithGoogle as firebaseSignInWithGoogle, 
  signOut as firebaseSignOut,
  SUPERADMIN_EMAILS,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from '@/lib/firebase';
import { setDoc } from 'firebase/firestore';
import { UserProfile, UserRole, UserStatus } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const profile = await createOrUpdateUserProfile(firebaseUser);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createOrUpdateUserProfile = async (firebaseUser: User): Promise<UserProfile> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    const isSuperadmin = SUPERADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase() || '');

    if (userSnap.exists()) {
      // Update last login
      await updateDoc(userRef, { lastLoginAt: serverTimestamp() });
      const data = userSnap.data();
      return {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: data.role as UserRole,
        status: data.status as UserStatus,
        createdAt: data.createdAt,
        lastLoginAt: data.lastLoginAt
      };
    } else {
      // Create new profile
      const role: UserRole = isSuperadmin ? 'SUPERADMIN' : 'USER';
      const status: UserStatus = isSuperadmin ? 'APPROVED' : 'PENDING';
      
      const newProfile: Omit<UserProfile, 'id'> = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        role,
        status,
        createdAt: serverTimestamp() as any,
        lastLoginAt: serverTimestamp() as any
      };
      
      await setDoc(userRef, newProfile);
      
      return {
        id: firebaseUser.uid,
        ...newProfile
      };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await firebaseSignInWithGoogle();
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut();
      setUserProfile(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';
  const canManageUsers = isSuperAdmin;

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userProfile, 
        loading, 
        signInWithGoogle, 
        signOut: handleSignOut,
        isAdmin,
        isSuperAdmin,
        canManageUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
