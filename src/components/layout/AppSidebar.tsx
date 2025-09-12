import {
  AnimatedSidebar,
  AnimatedSidebarBody,
  AnimatedSidebarLink,
  useAnimatedSidebar,
} from "@/components/ui/animated-sidebar";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import mecHidroLogo from "@/assets/mec-hidro-logo.png";
import { useState } from "react";

// Menu items with icons and URLs
const menuItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: <Home className="h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Análise",
    href: "/analise",
    icon: <BarChart3 className="h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Orçamentos",
    href: "/orcamentos",
    icon: <Calculator className="h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Aprovados",
    href: "/aprovados",
    icon: <ClipboardCheck className="h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Faturamento",
    href: "/faturamento",
    icon: <FileText className="h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Recebimentos",
    href: "/recebimentos",
    icon: <Receipt className="h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: <DollarSign className="h-5 w-5 flex-shrink-0" />,
  },
];

const Logo = () => {
  const { open } = useAnimatedSidebar();
  return (
    <div className="flex items-center gap-3 px-2 py-4">
      <img 
        src={mecHidroLogo} 
        alt="MEC-HIDRO" 
        className="h-8 w-8 flex-shrink-0"
      />
      <motion.div
        animate={{
          display: open ? "block" : "none",
          opacity: open ? 1 : 0,
        }}
        className="flex flex-col"
      >
        <span className="font-bold text-sidebar-foreground text-sm">MEC-HIDRO</span>
        <span className="text-xs text-sidebar-foreground/60">Sistema ERP</span>
      </motion.div>
    </div>
  );
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <AnimatedSidebar open={open} setOpen={setOpen}>
      <AnimatedSidebarBody className="justify-between gap-4">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Logo />
          
          <div className="flex flex-col gap-2 px-2">
            {menuItems.map((item) => (
              <AnimatedSidebarLink
                key={item.label}
                link={item}
                isActive={location.pathname === item.href}
                onClick={() => navigate(item.href)}
              />
            ))}
          </div>
        </div>

        <div className="px-2 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 px-2 py-3 rounded-lg cursor-pointer hover:bg-sidebar-accent transition-colors">
                <User className="h-5 w-5 text-sidebar-foreground flex-shrink-0" />
                <motion.div
                  animate={{
                    display: open ? "flex" : "none",
                    opacity: open ? 1 : 0,
                  }}
                  className="flex items-center justify-between flex-1"
                >
                  <span className="text-sm font-medium text-sidebar-foreground">Usuário</span>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground" />
                </motion.div>
              </div>
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
      </AnimatedSidebarBody>
    </AnimatedSidebar>
  );
}