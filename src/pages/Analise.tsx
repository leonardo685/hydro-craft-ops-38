import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Plus, ThumbsUp, ThumbsDown, Edit, FileText, Download, Tag, Settings, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EquipmentLabel } from "@/components/EquipmentLabel";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { HistoricoManutencaoModal } from "@/components/HistoricoManutencaoModal";
import { enviarWebhook } from "@/lib/webhook-utils";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export default function OrdensServico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { empresaAtual } = useEmpresa();
  const [searchTerm, setSearchTerm] = useState("");
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedOrdemForLabel, setSelectedOrdemForLabel] = useState<any>(null);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);


  const loadOrdensServicoCallback = useCallback(() => {
    loadOrdensServico();
  }, [empresaAtual?.id]);

  // Realtime subscription para atualizações automáticas
  useRealtimeSubscription({
    tables: ["ordens_servico", "orcamentos", "recebimentos"],
    empresaId: empresaAtual?.id,
    onDataChange: loadOrdensServicoCallback,
    enabled: !!empresaAtual?.id,
  });

  useEffect(() => {
    if (empresaAtual?.id) {
      loadOrdensServico();
    }
  }, [empresaAtual?.id]);

  const loadOrdensServico = async () => {
    if (!empresaAtual?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          recebimentos (
            numero_ordem,
            cliente_nome,
            cliente_cnpj,
            tipo_equipamento
          ),
          orcamentos!orcamentos_ordem_servico_id_fkey (
            id,
            numero,
            status
          ),
          orcamento_vinculado:orcamentos!ordens_servico_orcamento_id_fkey (
            id,
            numero,
            status
          )
        `)
        .eq('empresa_id', empresaAtual.id)
        .neq('status', 'aprovada')
        .neq('status', 'reprovada')
        .neq('status', 'faturado')
        .neq('status', 'em_producao')
        .neq('status', 'em_teste')
        .neq('status', 'finalizada')
        .neq('status', 'aguardando_retorno')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdensServico(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast({
        title: t('messages.error'),
        description: t('analise.errorLoadingOrders'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusDinamico = (ordem: any) => {
    // Se já tem um status definido (aprovada/reprovada/faturado/finalizada/em_producao/em_teste/aguardando_retorno), mantém o status atual
    const statusDefinidos = ['aprovada', 'reprovada', 'faturado', 'finalizada', 'em_producao', 'em_teste', 'aguardando_retorno'];
    if (statusDefinidos.includes(ordem.status)) {
      return ordem.status;
    }
    
    // Verifica se tem orçamentos vinculados (em qualquer direção do relacionamento)
    const temOrcamentosFK = Array.isArray(ordem.orcamentos) && ordem.orcamentos.length > 0;
    const temOrcamentoVinculado = !!ordem.orcamento_id || !!ordem.orcamento_vinculado;
    
    if (!temOrcamentosFK && !temOrcamentoVinculado) {
      return 'aguardando_orcamento';
    }
    return 'aguardando_aprovacao';
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedOrdens = (ordens: any[]) => {
    if (!sortConfig) return ordens;
    
    return [...ordens].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'numero_ordem':
          aValue = a.recebimentos?.numero_ordem || a.numero_ordem || '';
          bValue = b.recebimentos?.numero_ordem || b.numero_ordem || '';
          break;
        case 'cliente':
          aValue = a.recebimentos?.cliente_nome || a.cliente_nome || '';
          bValue = b.recebimentos?.cliente_nome || b.cliente_nome || '';
          break;
        case 'equipamento':
          aValue = a.recebimentos?.tipo_equipamento || a.equipamento || '';
          bValue = b.recebimentos?.tipo_equipamento || b.equipamento || '';
          break;
        case 'status':
          aValue = getStatusDinamico(a);
          bValue = getStatusDinamico(b);
          break;
        case 'data_entrada':
          aValue = new Date(a.data_entrada).getTime();
          bValue = new Date(b.data_entrada).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleApprove = async (ordemId: string) => {
    try {
      const ordem = ordensServico.find(o => o.id === ordemId);
      
      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: 'aprovada' })
        .eq('id', ordemId);

      if (error) throw error;
      
      // Enviar notificação via webhook centralizado
      if (ordem) {
        // Buscar o número correto da ordem e tipo de equipamento no formato MH-XXX-YY
        const { data: recebimento } = await supabase
          .from('recebimentos')
          .select('numero_ordem, tipo_equipamento')
          .eq('id', ordem.recebimento_id)
          .single();

        const payload = {
          tipo: 'ordem_aprovada',
          numero_ordem: recebimento?.numero_ordem || ordem.numero_ordem,
          cliente: ordem.cliente_nome,
          equipamento: ordem.equipamento || recebimento?.tipo_equipamento || 'Equipamento não especificado',
          data_aprovacao: format(new Date(), 'dd-MM-yyyy'),
          empresa: empresaAtual?.nome || 'N/A'
        };

        const notificacaoEnviada = await enviarWebhook(empresaAtual?.id || null, payload);

        if (!notificacaoEnviada) {
          toast({
            title: t('messages.warning'),
            description: t('analise.approvedWarning').replace('{attempts}', '3'),
            variant: "destructive"
          });
        }
      }
      
      toast({
        title: t('messages.success'),
        description: t('analise.approvedSuccess'),
      });
      
      loadOrdensServico();
    } catch (error) {
      console.error('Erro ao aprovar ordem:', error);
      toast({
        title: t('messages.error'),
        description: t('analise.errorApproving'),
        variant: "destructive",
      });
    }
  };

  const handleReject = async (ordemId: string) => {
    try {
      console.log('Reprovando ordem:', ordemId);
      
      const ordem = ordensServico.find(o => o.id === ordemId);
      
      // Verificar se a ordem está vinculada a uma nota fiscal de entrada
      const temNotaEntrada = ordem?.recebimento_id !== null;
      
      // Se vinculada à NF de entrada: vai para faturamento (nota de retorno)
      // Se NÃO vinculada: vai direto para finalizadas
      const novoStatus = temNotaEntrada ? 'aguardando_retorno' : 'finalizada';
      
      const { data, error } = await supabase
        .from('ordens_servico')
        .update({ 
          status: novoStatus,
          data_finalizacao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ordemId)
        .select();

      if (error) {
        console.error('Erro na atualização:', error);
        throw error;
      }
      
      console.log('Ordem reprovada com sucesso:', data);
      
      toast({
        title: t('analise.orderRejected'),
        description: temNotaEntrada 
          ? t('analise.rejectedToInvoice')
          : t('analise.rejectedToFinished'),
      });
      
      loadOrdensServico();
    } catch (error: any) {
      console.error('Erro ao reprovar ordem:', error);
      toast({
        title: t('messages.error'),
        description: error?.message || t('analise.errorRejecting'),
        variant: "destructive",
      });
    }
  };

  const handleOpenLabel = (ordem: any) => {
    setSelectedOrdemForLabel(ordem);
  };

  const handleExportPDF = async (ordem: any) => {
    try {
      const { gerarAnaliseTecnicaPDF } = await import('@/lib/analise-tecnica-pdf');

      const { data: recebimentoData } = await supabase
        .from('recebimentos')
        .select('*')
        .eq('id', ordem.recebimento_id)
        .maybeSingle();

      const { data: fotosData } = await supabase
        .from('fotos_equipamentos')
        .select('arquivo_url')
        .eq('recebimento_id', ordem.recebimento_id)
        .order('created_at', { ascending: true });

      await gerarAnaliseTecnicaPDF({
        ordem,
        recebimento: recebimentoData,
        fotos: (fotosData || []).map((f: any) => f.arquivo_url).filter(Boolean),
        empresa: empresaAtual as any,
        language,
      });

      toast({
        title: "PDF exportado",
        description: "A análise técnica foi gerada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar PDF",
        variant: "destructive",
      });
    }
  };

  const filteredOrdensServico = getSortedOrdens(
    ordensServico.filter(ordem => {
      const clienteNome = ordem.recebimentos?.cliente_nome || ordem.cliente_nome || '';
      const numeroOrdem = ordem.recebimentos?.numero_ordem || ordem.numero_ordem || '';
      const equipamento = ordem.recebimentos?.tipo_equipamento || ordem.equipamento || '';
      
      return clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
             numeroOrdem.toLowerCase().includes(searchTerm.toLowerCase()) ||
             equipamento.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aguardando_orcamento":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "aguardando_aprovacao":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "em_andamento":
        return "bg-warning text-warning-foreground";
      case "concluida":
        return "bg-accent text-accent-foreground";
      case "aguardando_pecas":
        return "bg-destructive text-destructive-foreground";
      case "aprovada":
        return "bg-green-100 text-green-800 border-green-300";
      case "reprovada":
        return "bg-red-100 text-red-800 border-red-300";
      case "faturado":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusTexto = (status: string) => {
    const statusMap: Record<string, string> = {
      'aguardando_orcamento': t('analise.awaitingQuote'),
      'aguardando_aprovacao': t('analise.awaitingApproval'),
      'em_andamento': language === 'en' ? 'In Progress' : 'Em Andamento',
      'concluida': language === 'en' ? 'Completed' : 'Concluída',
      'aguardando_pecas': language === 'en' ? 'Awaiting Parts' : 'Aguardando Peças',
      'aprovada': t('analise.approved'),
      'reprovada': t('analise.rejected'),
      'faturado': t('analise.billed'),
      'em_producao': t('analise.inProduction'),
      'em_teste': t('analise.inTest'),
      'finalizada': t('analise.finished'),
      'aguardando_retorno': t('analise.awaitingReturn')
    };
    
    return statusMap[status] || status;
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "media":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "baixa":
        return "bg-accent/10 text-accent-foreground border-accent/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const html2canvas = (await import('html2canvas')).default;
    
    const doc = new jsPDF();
    
    // Cabeçalho da empresa
    doc.setFillColor(220, 53, 69); // Vermelho da empresa
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MEC-HIDRO MECÂNICA E HIDRÁULICA LTDA', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('CNPJ: 93.338.138/0001-97', 15, 28);
    doc.text('Fone/Fax: (19) 3945-4527', 15, 34);
    
    // Título do relatório
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Análises Técnicas', 15, 55);
    
    // Data do relatório
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, 55);
    
    // Tabela de análises
    let yPosition = 70;
    const lineHeight = 8;
    
    // Cabeçalho da tabela
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Nº Ordem', 20, yPosition + 7);
    doc.text('Cliente', 50, yPosition + 7);
    doc.text('Equipamento', 100, yPosition + 7);
    doc.text('Status', 150, yPosition + 7);
    
    yPosition += 15;
    
    // Dados das ordens de serviço
    doc.setFont('helvetica', 'normal');
    filteredOrdensServico.forEach((ordem, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(ordem.numero_ordem, 20, yPosition);
      doc.text(ordem.cliente_nome.substring(0, 25) + (ordem.cliente_nome.length > 25 ? '...' : ''), 50, yPosition);
      doc.text(ordem.equipamento.substring(0, 20) + (ordem.equipamento.length > 20 ? '...' : ''), 100, yPosition);
      doc.text(ordem.status, 150, yPosition);
      
      yPosition += lineHeight;
    });
    
    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(220, 53, 69);
      doc.triangle(180, 280, 210, 280, 210, 297, 'F');
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, 15, 290);
    }
    
    doc.save('relatorio-ordens-servico.pdf');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('analise.pageTitle')}</h2>
            <p className="text-muted-foreground">
              {t('analise.pageSubtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setHistoricoModalOpen(true)}
            >
              <History className="h-4 w-4 mr-2" />
              Histórico de Manutenção
            </Button>
            <Button 
              className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium"
              onClick={() => navigate('/analise/novo-ordem-direta')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('analise.newServiceOrder')}
            </Button>
          </div>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('analise.serviceOrderList')}</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('analise.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={exportToPDF}
              variant="outline"
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {t('analise.exportPdf')}
            </Button>
          </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                   <TableHeader>
                     <TableRow className="bg-muted/50">
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('numero_ordem')}
                       >
                         <div className="flex items-center gap-2">
                           {t('analise.orderNumber')}
                           {sortConfig?.key === 'numero_ordem' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('cliente')}
                       >
                         <div className="flex items-center gap-2">
                           {t('analise.client')}
                           {sortConfig?.key === 'cliente' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('equipamento')}
                       >
                         <div className="flex items-center gap-2">
                           {t('analise.equipment')}
                           {sortConfig?.key === 'equipamento' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('status')}
                       >
                         <div className="flex items-center gap-2">
                           {t('analise.status')}
                           {sortConfig?.key === 'status' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('data_entrada')}
                       >
                         <div className="flex items-center gap-2">
                           {t('analise.entryDate')}
                           {sortConfig?.key === 'data_entrada' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead className="font-semibold text-foreground text-right">{t('analise.actions')}</TableHead>
                     </TableRow>
                   </TableHeader>
                  <TableBody>
                     {filteredOrdensServico.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                           {t('analise.noOrdersFound')}
                         </TableCell>
                       </TableRow>
                     ) : (
                       filteredOrdensServico.map((ordem) => (
                         <TableRow key={ordem.id} className="hover:bg-muted/30 transition-fast">
                             <TableCell className="font-medium text-primary">
                               <div className="flex items-center gap-2">
                                  {ordem.recebimentos?.numero_ordem || ordem.numero_ordem}
                                  {(() => {
                                    const numeroOrc =
                                      ordem.orcamentos?.[0]?.numero ||
                                      ordem.orcamento_vinculado?.numero;
                                    return numeroOrc ? (
                                      <Badge className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-300 text-sm font-medium">
                                        #{numeroOrc}
                                      </Badge>
                                    ) : null;
                                  })()}
                               </div>
                             </TableCell>
                           <TableCell className="text-primary font-medium">
                             {ordem.recebimentos?.cliente_nome || ordem.cliente_nome}
                           </TableCell>
                           <TableCell className="text-foreground">
                             {ordem.recebimentos?.tipo_equipamento || ordem.equipamento}
                           </TableCell>
                           <TableCell>
                             <Badge className={getStatusColor(getStatusDinamico(ordem))}>
                               {getStatusTexto(getStatusDinamico(ordem))}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-muted-foreground">
                             {new Date(ordem.data_entrada).toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR')}
                           </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0"
                                        title={t('analise.actions')}
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                                      <DropdownMenuItem onClick={() => handleOpenLabel(ordem)}>
                                        <Tag className="h-4 w-4 mr-2" />
                                        {t('analise.printLabel')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => navigate(`/analise/novo/${encodeURIComponent(ordem.numero_ordem)}`)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        {t('analise.edit')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleExportPDF(ordem)}>
                                        <Download className="h-4 w-4 mr-2" />
                                        {t('analise.downloadPdf')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleApprove(ordem.id)}
                                    title={t('analise.approve')}
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleReject(ordem.id)}
                                    title={t('analise.reject')}
                                  >
                                    <ThumbsDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                         </TableRow>
                       ))
                     )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedOrdemForLabel && (
        <EquipmentLabel
          equipment={{
            numeroOrdem: selectedOrdemForLabel.recebimentos?.numero_ordem || selectedOrdemForLabel.numero_ordem,
            cliente: selectedOrdemForLabel.recebimentos?.cliente_nome || selectedOrdemForLabel.cliente_nome,
            dataEntrada: new Date(selectedOrdemForLabel.data_entrada).toLocaleDateString('pt-BR')
          }}
          onClose={() => setSelectedOrdemForLabel(null)}
        />
      )}

      <HistoricoManutencaoModal 
        open={historicoModalOpen} 
        onOpenChange={setHistoricoModalOpen} 
      />
    </AppLayout>
  );
}