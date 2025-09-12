import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ClipboardCheck,
  DollarSign,
  FileText,
  Home,
  Calculator,
  Users,
  Receipt,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";
import mecHidroLogo from "@/assets/mec-hidro-logo.png";

// Menu items with icons and URLs
const menuItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    label: "Análise",
    href: "/analise",
    icon: BarChart3,
  },
  {
    label: "Orçamentos",
    href: "/orcamentos",
    icon: Calculator,
  },
  {
    label: "Aprovados",
    href: "/aprovados",
    icon: ClipboardCheck,
  },
  {
    label: "Faturamento",
    href: "/faturamento",
    icon: FileText,
  },
  {
    label: "Recebimentos",
    href: "/recebimentos",
    icon: Receipt,
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: DollarSign,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar-background border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img 
            src={mecHidroLogo} 
            alt="MEC-HIDRO" 
            className="h-8 w-8"
          />
          <div>
            <span className="font-bold text-sidebar-foreground text-sm">MEC-HIDRO</span>
            <p className="text-xs text-sidebar-foreground/60">Sistema ERP</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 hover:bg-sidebar-accent rounded-lg"
        >
          {isMobileOpen ? (
            <X className="h-5 w-5 text-sidebar-foreground" />
          ) : (
            <Menu className="h-5 w-5 text-sidebar-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 bg-sidebar-background border-r border-sidebar-border p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-8">
                <img 
                  src={mecHidroLogo} 
                  alt="MEC-HIDRO" 
                  className="h-8 w-8"
                />
                <div>
                  <span className="font-bold text-sidebar-foreground text-sm">MEC-HIDRO</span>
                  <p className="text-xs text-sidebar-foreground/60">Sistema ERP</p>
                </div>
              </div>
              
              <nav className="flex-1">
                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          navigate(item.href);
                          setIsMobileOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left transition-colors",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div 
        className={cn(
          "hidden md:flex flex-col bg-sidebar-background border-r border-sidebar-border transition-all duration-300",
          isOpen ? "w-80" : "w-16"
        )}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <img 
            src={mecHidroLogo} 
            alt="MEC-HIDRO" 
            className="h-8 w-8 flex-shrink-0"
          />
          {isOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground text-sm">MEC-HIDRO</span>
              <span className="text-xs text-sidebar-foreground/60">Sistema ERP</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {isOpen && (
                    <span className="text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-sidebar-accent transition-colors">
                <User className="h-5 w-5 text-sidebar-foreground flex-shrink-0" />
                {isOpen && (
                  <>
                    <span className="text-sm font-medium text-sidebar-foreground flex-1 text-left">
                      Usuário
                    </span>
                    <ChevronDown className="h-4 w-4 text-sidebar-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/cadastros")}>
                <Users className="mr-2 h-4 w-4" />
                <span>Cadastros</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}