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
import fixzysLogo from "@/assets/fixzys-logo.png";
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
  Shield,
  History,
  ShoppingCart
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { EmpresaSelector } from "@/components/EmpresaSelector";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, signOut, userRole } = useAuth();
  const { t } = useLanguage();
  const { empresaAtual, empresas } = useEmpresa();

  const menuItems = [
    {
      title: t('menu.recebimentos'),
      url: "/recebimentos",
      icon: ClipboardList,
      permission: "recebimentos",
    },
    {
      title: t('menu.analise'),
      url: "/analise",
      icon: Search,
      permission: "analise",
    },
    {
      title: t('menu.orcamentos'),
      url: "/orcamentos",
      icon: Calculator,
      permission: "orcamentos",
    },
    {
      title: t('menu.aprovados'),
      url: "/aprovados",
      icon: CheckCircle,
      permission: "aprovados",
    },
    {
      title: t('menu.compras'),
      url: "/compras",
      icon: ShoppingCart,
      permission: "compras",
    },
    {
      title: t('menu.faturamento'),
      url: "/faturamento",
      icon: Receipt,
      permission: "faturamento",
    },
    {
      title: t('menu.financeiro'),
      url: "/financeiro/dashboard",
      icon: CreditCard,
      permission: "financeiro",
      submenu: [
        { title: "Dashboard", url: "/financeiro/dashboard", permission: "financeiro_dashboard" },
        { title: t('menu.dre'), url: "/financeiro/dre", permission: "financeiro_dre" },
        { title: t('menu.dfc'), url: "/financeiro/dfc", permission: "financeiro_dfc" },
        { title: t('menu.metaGastos'), url: "/financeiro/meta-gastos", permission: "financeiro_metas" },
      ]
    },
  ];

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
            <p className="text-sm text-sidebar-foreground/70">{t('menu.managementSystem')}</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('menu.managementSystem')}</SidebarGroupLabel>
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
      
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent transition-smooth">
                <Building2 className="h-4 w-4 text-sidebar-foreground/70" />
                <div className="text-sm text-sidebar-foreground/70 flex-1 text-left">
                  <p className="font-medium truncate">{empresaAtual?.nome || 'Sua Empresa'}</p>
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
                <span>{t('menu.cadastros')}</span>
              </DropdownMenuItem>
              )}
              {hasPermission('admin_permissions') && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/admin/permissions')}>
                <Shield className="mr-2 h-4 w-4" />
                <span>{t('menu.permissoes')}</span>
              </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/historico-lancamentos')}>
                <History className="mr-2 h-4 w-4" />
                <span>Histórico de Lançamentos</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/configuracoes')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('menu.configuracoes')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('menu.sair')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}