
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthenticatedApp } from "@/components/AuthenticatedApp";

// Public pages - no auth required
import OrdemPorQRCode from "./pages/OrdemPorQRCode";
import AcessoOrdemPublica from "./pages/AcessoOrdemPublica";
import LaudoPublico from "./pages/LaudoPublico";
import Convite from "./pages/Convite";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

// Component to detect recovery tokens in URL hash and redirect to /reset-password
function RecoveryRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery') && location.pathname !== '/reset-password') {
      navigate('/reset-password' + hash, { replace: true });
    }
  }, [navigate, location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RecoveryRedirect />
          <Routes>
            {/* Public routes - outside AuthProvider */}
            <Route path="/ordem/:numeroOrdem" element={<OrdemPorQRCode />} />
            <Route path="/acesso-ordem/:numeroOrdem" element={<AcessoOrdemPublica />} />
            <Route path="/laudo-publico/:numeroOrdem" element={<LaudoPublico />} />
            <Route path="/convite/:token" element={<Convite />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* All other routes - with AuthProvider */}
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
