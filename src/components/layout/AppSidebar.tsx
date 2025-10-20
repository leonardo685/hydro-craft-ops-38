import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import fixzysLogo from "@/assets/fixzys-logo.jpg";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Wrench, 
  ClipboardList, 
  Search, 
  Calculator, 
  CheckCircle, 
  Receipt,
  Building2,
  ChevronUp,
  Users,
  Settings,
  LogOut,
  ChartBar,
  FileText,
  TrendingUp,
  CreditCard,
  ChevronDown,
  Target,
  Shield
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  {
    title: "Recebimentos",
    url: "/recebimentos",
    icon: ClipboardList,
    permission: "recebimentos",
  },
  {
    title: "Análise",
    url: "/analise",
    icon: Search,
    permission: "analise",
  },
  {
    title: "Orçamentos",
    url: "/orcamentos",
    icon: Calculator,
    permission: "orcamentos",
  },
  {
    title: "Aprovados",
    url: "/aprovados",
    icon: CheckCircle,
    permission: "aprovados",
  },
  {
    title: "Faturamento",
    url: "/faturamento",
    icon: Receipt,
    permission: "faturamento",
  },
  {
    title: "Financeiro",
    url: "/financeiro/dashboard",
    icon: CreditCard,
    permission: "financeiro",
    submenu: [
      { title: "Dashboard", url: "/financeiro/dashboard", permission: "financeiro_dashboard" },
      { title: "DRE", url: "/financeiro/dre", permission: "financeiro_dre" },
      { title: "DFC", url: "/financeiro/dfc", permission: "financeiro_dfc" },
      { title: "Meta de Gastos", url: "/financeiro/meta-gastos", permission: "financeiro_metas" },
    ]
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, signOut, userRole } = useAuth();

  const filteredMenuItems = menuItems.filter(item => hasPermission(item.permission));

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img 
            src={fixzysLogo} 
            alt="FixZys Logo" 
            className="h-10 w-10 object-contain"
          />
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">FixZys</h2>
            <p className="text-sm text-sidebar-foreground/70">Sistema de Gestão</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sistema de Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                item.submenu ? (
                  <Collapsible key={item.title} defaultOpen={location.pathname.startsWith("/financeiro")}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={location.pathname.startsWith("/financeiro")}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.submenu
                            .filter((subItem: any) => hasPermission(subItem.permission))
                            .map((subItem: any) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location.pathname === subItem.url}
                                >
                                  <button
                                    onClick={() => navigate(subItem.url)}
                                    className="w-full text-left"
                                  >
                                    {subItem.title}
                                  </button>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname.startsWith(item.url)}
                      className="transition-smooth hover:bg-sidebar-accent"
                    >
                      <button
                        onClick={() => navigate(item.url)}
                        className="flex items-center gap-3 w-full text-left"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent transition-smooth">
              <Building2 className="h-4 w-4 text-sidebar-foreground/70" />
              <div className="text-sm text-sidebar-foreground/70 flex-1 text-left">
                <p className="font-medium">Sua Empresa</p>
                <p className="text-xs capitalize">{userRole || 'Sistema ERP'}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-sidebar-foreground/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="start" 
            className="w-56 mb-2"
          >
            {hasPermission('cadastros') && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/cadastros')}>
                <Users className="mr-2 h-4 w-4" />
                <span>Cadastros</span>
              </DropdownMenuItem>
            )}
            {hasPermission('admin_permissions') && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/admin/permissions')}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Gerenciar Permissões</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}