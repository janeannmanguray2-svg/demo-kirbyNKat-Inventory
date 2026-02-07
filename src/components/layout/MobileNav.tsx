import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Menu,
  X,
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/stock-in', label: 'Stock In', icon: ArrowDownToLine },
  { path: '/stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
];

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/stock-in', label: 'Stock In', icon: ArrowDownToLine },
  { path: '/stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
  { path: '/suppliers', label: 'Suppliers', icon: Truck },
  { path: '/platforms', label: 'Platforms', icon: Store },
  { path: '/inventory-report', label: 'Inventory Report', icon: FileText },
  { path: '/transaction-history', label: 'Transactions', icon: History },
];

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { userProfile, signOut, isAdmin, isSuperAdmin } = useAuth();
  const { users } = useInventory();
  const navigate = useNavigate();

  const pendingUsersCount = users.filter(u => u.status === 'PENDING').length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 p-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        {/* Menu Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground">
              <Menu className="h-5 w-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-sidebar text-sidebar-foreground">
            {/* Logo */}
            <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Box className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Inventory</span>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userProfile?.photoURL || ''} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                  {userProfile?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{userProfile?.displayName}</p>
                <p className="text-sm text-sidebar-foreground/60">{userProfile?.role}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
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
                  <NavLink
                    to="/settings"
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )
                    }
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </NavLink>
                </>
              )}

              {isSuperAdmin && (
                <NavLink
                  to="/users"
                  onClick={() => setIsOpen(false)}
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
                    <Users className="h-5 w-5" />
                    Users
                  </div>
                  {pendingUsersCount > 0 && (
                    <span className="bg-warning text-warning-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingUsersCount}
                    </span>
                  )}
                </NavLink>
              )}
            </nav>

            {/* Sign Out */}
            <div className="p-3 border-t border-sidebar-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
};
