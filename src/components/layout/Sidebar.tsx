import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Truck, 
  Store, 
  FileText, 
  History, 
  Settings, 
  Users, 
  LogOut,
  Box
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInventory } from '@/contexts/InventoryContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/stock-in', label: 'Stock In', icon: ArrowDownToLine },
  { path: '/stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
  { path: '/suppliers', label: 'Suppliers', icon: Truck },
  { path: '/platforms', label: 'Platforms', icon: Store },
  { path: '/inventory-report', label: 'Inventory Report', icon: FileText },
  { path: '/transaction-history', label: 'Transactions', icon: History },
];

const adminNavItems = [
  { path: '/settings', label: 'Settings', icon: Settings },
];

const superAdminNavItems = [
  { path: '/users', label: 'Users', icon: Users },
];

export const Sidebar: React.FC = () => {
  const { userProfile, signOut, isAdmin, isSuperAdmin } = useAuth();
  const { users } = useInventory();
  const navigate = useNavigate();

  const pendingUsersCount = users.filter(u => u.status === 'PENDING').length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Box className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <span className="font-semibold text-lg">Inventory</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="h-px bg-sidebar-border my-3" />
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}

        {isSuperAdmin && (
          <>
            {superAdminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
                {pendingUsersCount > 0 && (
                  <span className="bg-warning text-warning-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingUsersCount}
                  </span>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User Info & Sign Out */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userProfile?.photoURL || ''} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {userProfile?.displayName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userProfile?.displayName}</p>
            <p className="text-xs text-sidebar-foreground/60">{userProfile?.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 mt-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};
