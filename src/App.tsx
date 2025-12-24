
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmpresaProvider } from "@/contexts/EmpresaContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Recebimentos from "./pages/Recebimentos";
import NovoRecebimento from "./pages/NovoRecebimento";
import DetalhesRecebimento from "./pages/DetalhesRecebimento";
import Analise from "./pages/Analise";
import NovaAnalise from "./pages/NovaAnalise";
import NovaOrdemDireta from "./pages/NovaOrdemDireta";
import Orcamentos from "./pages/Orcamentos";
import NovoOrcamento from "./pages/NovoOrcamento";
import Aprovados from "./pages/Aprovados";
import Compras from "./pages/Compras";
import VisualizarOrdemServico from "./pages/VisualizarOrdemServico";
import Faturamento from "./pages/Faturamento";
import Cadastros from "./pages/Cadastros";
import Financeiro from "./pages/Financeiro";
import Dashboard from "./pages/Dashboard";
import DRE from "./pages/DRE";
import DFC from "./pages/DFC";
import MetaGastos from "./pages/MetaGastos";
import HistoricoLancamentos from "./pages/HistoricoLancamentos";
import OrdemPorQRCode from "./pages/OrdemPorQRCode";
import AdminPermissions from "./pages/AdminPermissions";
import AcessoOrdemPublica from "./pages/AcessoOrdemPublica";
import LaudoPublico from "./pages/LaudoPublico";
import UploadVideoTeste from "./pages/UploadVideoTeste";
import Configuracoes from "./pages/Configuracoes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <EmpresaProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/recebimentos" element={<ProtectedRoute requiredPermission="recebimentos"><Recebimentos /></ProtectedRoute>} />
                <Route path="/recebimentos/novo" element={<ProtectedRoute requiredPermission="recebimentos"><NovoRecebimento /></ProtectedRoute>} />
                <Route path="/recebimentos/:id" element={<ProtectedRoute requiredPermission="recebimentos"><DetalhesRecebimento /></ProtectedRoute>} />
                <Route path="/analise" element={<ProtectedRoute requiredPermission="analise"><Analise /></ProtectedRoute>} />
                <Route path="/analise/novo/:id" element={<ProtectedRoute requiredPermission="analise"><NovaAnalise /></ProtectedRoute>} />
                <Route path="/analise/novo-ordem-direta" element={<ProtectedRoute requiredPermission="analise"><NovaOrdemDireta /></ProtectedRoute>} />
                <Route path="/orcamentos" element={<ProtectedRoute requiredPermission="orcamentos"><Orcamentos /></ProtectedRoute>} />
                <Route path="/orcamentos/novo" element={<ProtectedRoute requiredPermission="orcamentos"><NovoOrcamento /></ProtectedRoute>} />
                <Route path="/aprovados" element={<ProtectedRoute requiredPermission="aprovados"><Aprovados /></ProtectedRoute>} />
                <Route path="/compras" element={<ProtectedRoute requiredPermission="compras"><Compras /></ProtectedRoute>} />
                <Route path="/visualizar-ordem-servico/:id" element={<ProtectedRoute><VisualizarOrdemServico /></ProtectedRoute>} />
                <Route path="/faturamento" element={<ProtectedRoute requiredPermission="faturamento"><Faturamento /></ProtectedRoute>} />
                <Route path="/cadastros" element={<ProtectedRoute requiredPermission="cadastros"><Cadastros /></ProtectedRoute>} />
                <Route path="/financeiro" element={<ProtectedRoute requiredPermission="financeiro"><Financeiro /></ProtectedRoute>} />
                <Route path="/financeiro/dashboard" element={<ProtectedRoute requiredPermission="financeiro_dashboard"><Dashboard /></ProtectedRoute>} />
                <Route path="/financeiro/dre" element={<ProtectedRoute requiredPermission="financeiro_dre"><DRE /></ProtectedRoute>} />
                <Route path="/financeiro/dfc" element={<ProtectedRoute requiredPermission="financeiro_dfc"><DFC /></ProtectedRoute>} />
                <Route path="/dfc" element={<ProtectedRoute requiredPermission="financeiro_dfc"><DFC /></ProtectedRoute>} />
                <Route path="/financeiro/meta-gastos" element={<ProtectedRoute requiredPermission="financeiro_metas"><MetaGastos /></ProtectedRoute>} />
                <Route path="/admin/permissions" element={<ProtectedRoute requiredPermission="admin_permissions"><AdminPermissions /></ProtectedRoute>} />
                <Route path="/historico-lancamentos" element={<ProtectedRoute><HistoricoLancamentos /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/ordem/:numeroOrdem" element={<OrdemPorQRCode />} />
                <Route path="/acesso-ordem/:numeroOrdem" element={<AcessoOrdemPublica />} />
                <Route path="/laudo-publico/:numeroOrdem" element={<LaudoPublico />} />
                <Route path="/upload-video-teste" element={<ProtectedRoute><UploadVideoTeste /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </EmpresaProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
