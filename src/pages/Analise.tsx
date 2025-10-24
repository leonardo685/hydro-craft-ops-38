import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Plus, ThumbsUp, ThumbsDown, Edit, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function OrdensServico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrdensServico();
  }, []);

  const loadOrdensServico = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          recebimentos (
            numero_ordem,
            cliente_nome,
            tipo_equipamento
          )
        `)
        .neq('status', 'aprovada')
        .neq('status', 'reprovada')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdensServico(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordens de serviço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ordemId: string) => {
    try {
      const ordem = ordensServico.find(o => o.id === ordemId);
      
      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: 'aprovada' })
        .eq('id', ordemId);

      if (error) throw error;
      
      // Enviar notificação para o n8n/Telegram
      try {
        if (ordem) {
          // Buscar o número correto da ordem no formato MH-XXX-YY
          const { data: recebimento } = await supabase
            .from('recebimentos')
            .select('numero_ordem')
            .eq('id', ordem.recebimento_id)
            .single();

          await fetch('https://primary-production-dc42.up.railway.app/webhook/01607294-b2b4-4482-931f-c3723b128d7d', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tipo: 'ordem_aprovada',
              numero_ordem: recebimento?.numero_ordem || ordem.numero_ordem,
              cliente: ordem.cliente_nome,
              equipamento: ordem.equipamento,
              data_aprovacao: format(new Date(), 'dd-MM-yyyy')
            })
          });
        }
      } catch (webhookError) {
        console.error('Erro ao enviar webhook:', webhookError);
      }
      
      toast({
        title: "Sucesso",
        description: "Ordem de serviço aprovada com sucesso!",
      });
      
      loadOrdensServico();
    } catch (error) {
      console.error('Erro ao aprovar ordem:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar ordem de serviço",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (ordemId: string) => {
    try {
      console.log('Reprovando ordem:', ordemId);
      
      // Quando reprovada, a ordem vai direto para faturamento para nota de retorno
      const { data, error } = await supabase
        .from('ordens_servico')
        .update({ 
          status: 'reprovada',
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
        title: "Ordem reprovada",
        description: "A ordem foi movida para faturamento para emissão de nota de retorno.",
      });
      
      loadOrdensServico();
    } catch (error: any) {
      console.error('Erro ao reprovar ordem:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao reprovar ordem de serviço",
        variant: "destructive",
      });
    }
  };

  const filteredOrdensServico = ordensServico.filter(ordem => {
    const clienteNome = ordem.recebimentos?.cliente_nome || ordem.cliente_nome || '';
    const numeroOrdem = ordem.recebimentos?.numero_ordem || ordem.numero_ordem || '';
    const equipamento = ordem.recebimentos?.tipo_equipamento || ordem.equipamento || '';
    
    return clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
           numeroOrdem.toLowerCase().includes(searchTerm.toLowerCase()) ||
           equipamento.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "em_andamento":
        return "bg-warning text-warning-foreground";
      case "concluida":
        return "bg-accent text-accent-foreground";
      case "aguardando_pecas":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
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
            <h2 className="text-2xl font-bold text-foreground">Ordens de Serviço</h2>
            <p className="text-muted-foreground">
              Gerencie todas as ordens de serviço de equipamentos
            </p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium"
            onClick={() => navigate('/analise/novo')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Ordem de Serviço
          </Button>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Lista de Ordens de Serviço</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, ordem ou equipamento..."
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
              Exportar PDF
            </Button>
          </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                   <TableHeader>
                     <TableRow className="bg-muted/50">
                       <TableHead className="font-semibold text-foreground">Nº da Ordem</TableHead>
                       <TableHead className="font-semibold text-foreground">Cliente</TableHead>
                       <TableHead className="font-semibold text-foreground">Equipamento</TableHead>
                       <TableHead className="font-semibold text-foreground">Status</TableHead>
                       <TableHead className="font-semibold text-foreground">Data de Entrada</TableHead>
                       <TableHead className="font-semibold text-foreground text-right">Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                  <TableBody>
                     {filteredOrdensServico.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                           Nenhuma ordem de serviço encontrada
                         </TableCell>
                       </TableRow>
                     ) : (
                       filteredOrdensServico.map((ordem) => (
                         <TableRow key={ordem.id} className="hover:bg-muted/30 transition-fast">
                           <TableCell className="font-medium text-primary">
                             {ordem.recebimentos?.numero_ordem || ordem.numero_ordem}
                           </TableCell>
                           <TableCell className="text-primary font-medium">
                             {ordem.recebimentos?.cliente_nome || ordem.cliente_nome}
                           </TableCell>
                           <TableCell className="text-foreground">
                             {ordem.recebimentos?.tipo_equipamento || ordem.equipamento}
                           </TableCell>
                           <TableCell>
                             <Badge className={getStatusColor(ordem.status)}>
                               {ordem.status === 'em_andamento' ? 'Em Andamento' : 
                                ordem.status === 'concluida' ? 'Concluída' : 
                                ordem.status === 'aguardando_pecas' ? 'Aguardando Peças' :
                                ordem.status === 'aprovada' ? 'Aprovada' :
                                ordem.status === 'reprovada' ? 'Reprovada' : ordem.status}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-muted-foreground">
                             {new Date(ordem.data_entrada).toLocaleDateString('pt-BR')}
                           </TableCell>
                           <TableCell className="text-right">
                             <div className="flex items-center justify-end gap-2">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-8 w-8 p-0"
                                 onClick={() => navigate(`/analise/novo/${encodeURIComponent(ordem.numero_ordem)}`)}
                               >
                                 <Edit className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                 onClick={() => handleApprove(ordem.id)}
                               >
                                 <ThumbsUp className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                 onClick={() => handleReject(ordem.id)}
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
    </AppLayout>
  );
}