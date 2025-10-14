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
  ChevronDown
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const menuItems = [
  {
    title: "Recebimentos",
    url: "/recebimentos",
    icon: ClipboardList,
  },
  {
    title: "Análise",
    url: "/analise",
    icon: Search,
  },
  {
    title: "Orçamentos",
    url: "/orcamentos",
    icon: Calculator,
  },
  {
    title: "Aprovados",
    url: "/aprovados",
    icon: CheckCircle,
  },
  {
    title: "Faturamento",
    url: "/faturamento",
    icon: Receipt,
  },
  {
    title: "Financeiro",
    url: "/financeiro/dashboard",
    icon: CreditCard,
    submenu: [
      { title: "Dashboard", url: "/financeiro/dashboard" },
      { title: "DRE", url: "/financeiro/dre" },
      { title: "DFC", url: "/financeiro/dfc" },
    ]
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-primary p-2 rounded-lg">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">HydroFix ERP</h2>
            <p className="text-sm text-sidebar-foreground/70">Reforma de Equipamentos</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sistema de Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
                          {item.submenu.map((subItem: any) => (
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
                <p className="text-xs">Sistema ERP</p>
              </div>
              <ChevronUp className="h-4 w-4 text-sidebar-foreground/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="start" 
            className="w-56 mb-2"
          >
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/cadastros')}>
              <Users className="mr-2 h-4 w-4" />
              <span>Cadastros</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}