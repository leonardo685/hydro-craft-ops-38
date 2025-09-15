
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Recebimentos from "./pages/Recebimentos";
import NovoRecebimento from "./pages/NovoRecebimento";
import DetalhesRecebimento from "./pages/DetalhesRecebimento";
import Analise from "./pages/Analise";
import NovaAnalise from "./pages/NovaAnalise";
import Orcamentos from "./pages/Orcamentos";
import NovoOrcamento from "./pages/NovoOrcamento";
import Aprovados from "./pages/Aprovados";
import VisualizarOrdemServico from "./pages/VisualizarOrdemServico";
import Faturamento from "./pages/Faturamento";
import Cadastros from "./pages/Cadastros";
import Financeiro from "./pages/Financeiro";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/recebimentos" element={<Recebimentos />} />
          <Route path="/recebimentos/novo" element={<NovoRecebimento />} />
          <Route path="/recebimentos/:id" element={<DetalhesRecebimento />} />
          <Route path="/analise" element={<Analise />} />
          <Route path="/analise/novo/:id" element={<NovaAnalise />} />
          <Route path="/orcamentos" element={<Orcamentos />} />
          <Route path="/orcamentos/novo" element={<NovoOrcamento />} />
          <Route path="/aprovados" element={<Aprovados />} />
          <Route path="/ordem-servico/:id" element={<VisualizarOrdemServico />} />
          <Route path="/faturamento" element={<Faturamento />} />
          <Route path="/cadastros" element={<Cadastros />} />
          <Route path="/financeiro" element={<Financeiro />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
