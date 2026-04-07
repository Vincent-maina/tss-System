import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Search, User, MessageSquare, FileText, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import AnimatedLogo from "@/components/AnimatedLogo";

const ADMIN_EMAIL = 'graphitechsoftwares@gmail.com';

const getNavItems = (userEmail?: string, userRole?: string) => {
  if (userRole === 'admin' || userEmail === ADMIN_EMAIL) {
    return [{ to: "/admin", icon: ShieldCheck, label: "Admin Panel", id: "admin" }];
  }
  return [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { to: "/matches", icon: Search, label: "Browse Matches", id: "matches" },
    { to: "/my-swaps", icon: FileText, label: "My Swap Requests", id: "my-swaps" },
    { to: "/messages", icon: MessageSquare, label: "Messages", id: "messages" },
    { to: "/documents", icon: FileText, label: "Documents", id: "documents" },
    { to: "/profile", icon: User, label: "My Profile", id: "profile" },
  ];
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = getNavItems(user?.email, user?.role);

  // Global notification polls
  const { data: convResponse } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchApi("/messages/conversations"),
    enabled: !!user && user.role !== 'admin' && user.email !== ADMIN_EMAIL,
    refetchInterval: 15000,
  });

  const { data: matchesResp } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchApi("/matches"),
    enabled: !!user && user.role !== 'admin' && user.email !== ADMIN_EMAIL,
    refetchInterval: 30000,
  });

  // Calculate badges
  const unreadMessages = (convResponse?.data || []).reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
  const pendingMatches = (matchesResp?.data || []).length; // Just total matches for simple notification

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 border-r border-border bg-card flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <AnimatedLogo size="sm" />
            <span className="font-heading text-lg font-bold">MwalimuLink</span>
          </Link>
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const badgeCount = item.id === "messages" ? unreadMessages : item.id === "matches" ? pendingMatches : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
                {badgeCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {user?.firstName?.[0] || 'T'}{user?.lastName?.[0] || ''}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.firstName || 'User'} {user?.lastName || ''}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.tscNumber || 'TSC Verified'}
              </p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-6 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <AnimatedLogo size="sm" className="ml-3" />
          <span className="ml-2 font-heading font-semibold">MwalimuLink</span>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
