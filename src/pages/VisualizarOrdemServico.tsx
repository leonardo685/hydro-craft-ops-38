import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, User, Package, Settings, Wrench, Camera, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import mecHidroLogo from "@/assets/mec-hidro-logo.jpg";
import { useEmpresa } from "@/contexts/EmpresaContext";

const VisualizarOrdemServico = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { empresaAtual } = useEmpresa();
  
  const [ordem, setOrdem] = useState<any>(null);
  const [recebimento, setRecebimento] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prazoEntrega, setPrazoEntrega] = useState<string>("");

  useEffect(() => {
    if (id) {
      carregarOrdemServico();
    }
  }, [id]);

  const carregarOrdemServico = async () => {
    try {
      // Primeiro, tentar buscar pelo ID direto (quando vem de /visualizar-ordem-servico/:id)
      const { data: ordemPorId } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (ordemPorId) {
        setOrdem(ordemPorId);
        setPrazoEntrega(ordemPorId.tempo_estimado || "");

        // Buscar dados do recebimento
        if (ordemPorId.recebimento_id) {
          const { data: recebimentoData } = await supabase
            .from('recebimentos')
            .select('*')
            .eq('id', ordemPorId.recebimento_id)
            .maybeSingle();

          if (recebimentoData) {
            setRecebimento(recebimentoData);
          }

          // Buscar fotos do equipamento
          const { data: fotosData } = await supabase
            .from('fotos_equipamentos')
            .select('*')
            .eq('recebimento_id', ordemPorId.recebimento_id);

          if (fotosData) {
            setFotos(fotosData);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar ordem de serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordem de serviço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const atualizarPrazoEntrega = async () => {
    if (!ordem) return;

    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ tempo_estimado: prazoEntrega })
        .eq('id', ordem.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Prazo de entrega atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar prazo:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar prazo de entrega",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async () => {
    if (!ordem || !recebimento) return;
    
    const jsPDF = (await import('jspdf')).default;
    
    const tipoIdentificacao = empresaAtual?.tipo_identificacao || 'cnpj';
    const labelIdentificacao = tipoIdentificacao === 'ein' ? 'EIN' : tipoIdentificacao === 'ssn' ? 'SSN' : 'CNPJ';
    
    const EMPRESA_INFO = {
      nome: empresaAtual?.razao_social || empresaAtual?.nome || "N/A",
      cnpj: empresaAtual?.cnpj || "",
      telefone: empresaAtual?.telefone || "",
      email: empresaAtual?.email || "",
      labelIdentificacao
    };
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 10;
    
    const adicionarDetalheDecorativo = () => {
      doc.setFillColor(220, 38, 38);
      doc.triangle(pageWidth - 30, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
      doc.setFillColor(0, 0, 0);
      doc.triangle(pageWidth - 15, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
    };
    
    const adicionarRodape = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        adicionarDetalheDecorativo();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${totalPages}`, 15, pageHeight - 10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 60, pageHeight - 10);
      }
    };
    
    try {
      const logoImg = new Image();
      logoImg.src = mecHidroLogo;
      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          doc.addImage(logoImg, 'JPEG', pageWidth - 50, 8, 35, 20);
          resolve();
        };
        logoImg.onerror = () => resolve();
      });
    } catch (error) {
      console.error('Erro ao adicionar logo:', error);
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${EMPRESA_INFO.labelIdentificacao}: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
    doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
    doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
    
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
    
    doc.setFillColor(220, 38, 38);
    doc.triangle(pageWidth - 20, 10, pageWidth, 10, pageWidth, 40, 'F');
    
    yPosition = 48;
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("ORDEM DE SERVIÇO", pageWidth / 2, yPosition, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    yPosition = 65;
    
    const criarTabela = (titulo: string, dados: Array<{label: string, value: string}>, corTitulo: number[] = [128, 128, 128]) => {
      if (dados.length === 0) return;
      
      if (yPosition > 210) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(corTitulo[0], corTitulo[1], corTitulo[2]);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, { align: 'center' });
      yPosition += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setLineWidth(0.1);
      
      const rowHeight = 10;
      dados.forEach((item, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(20, yPosition, pageWidth - 40, rowHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, rowHeight);
        
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, 25, yPosition + 7);
        doc.setFont('helvetica', 'normal');
        const valorLines = doc.splitTextToSize(item.value, pageWidth - 110);
        
        if (valorLines.length > 1) {
          const extraHeight = (valorLines.length - 1) * 5;
          doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
          doc.rect(20, yPosition, pageWidth - 40, rowHeight + extraHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, rowHeight + extraHeight);
          
          doc.setFont('helvetica', 'bold');
          doc.text(item.label, 25, yPosition + 7);
          doc.setFont('helvetica', 'normal');
          doc.text(valorLines, 95, yPosition + 7);
          yPosition += rowHeight + extraHeight;
        } else {
          doc.text(item.value, 95, yPosition + 7);
          yPosition += rowHeight;
        }
      });
      
      yPosition += 10;
    };
    
    const dadosBasicos: Array<{label: string, value: string}> = [
      { label: 'Nº Ordem:', value: recebimento.numero_ordem || '' },
      { label: 'Cliente:', value: ordem.cliente_nome || '' },
      { label: 'Equipamento:', value: ordem.equipamento || '' },
      { label: 'Data de Entrada:', value: new Date(ordem.data_entrada).toLocaleDateString('pt-BR') },
      { label: 'Nota Fiscal:', value: recebimento.nota_fiscal || '-' },
      { label: 'Nº Série:', value: recebimento.numero_serie || '-' }
    ];
    criarTabela('Informações Básicas', dadosBasicos, [128, 128, 128]);
    
    const dadosTecnicos: Array<{label: string, value: string}> = [];
    if (recebimento.pressao_trabalho) dadosTecnicos.push({ label: 'Pressão de Trabalho:', value: recebimento.pressao_trabalho });
    if (recebimento.camisa) dadosTecnicos.push({ label: 'Ø Camisa:', value: recebimento.camisa });
    if (recebimento.haste_comprimento) dadosTecnicos.push({ label: 'Ø Haste x Comprimento:', value: recebimento.haste_comprimento });
    if (recebimento.curso) dadosTecnicos.push({ label: 'Curso:', value: recebimento.curso });
    if (recebimento.conexao_a) dadosTecnicos.push({ label: 'Conexão A:', value: recebimento.conexao_a });
    if (recebimento.conexao_b) dadosTecnicos.push({ label: 'Conexão B:', value: recebimento.conexao_b });
    
    if (dadosTecnicos.length > 0) {
      criarTabela('Dados Técnicos', dadosTecnicos, [128, 128, 128]);
    }
    
    const adicionarFotosGrade = async (fotos: any[], titulo: string) => {
      if (fotos.length === 0) return;
      
      if (yPosition > 210) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text(titulo, 20, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
      
      const fotosPorPagina = 4;
      const maxFotoWidth = 80;
      const maxFotoHeight = 55;
      const espacoHorizontal = 12;
      const espacoVertical = 12;
      
      for (let i = 0; i < fotos.length; i += fotosPorPagina) {
        if (i > 0) {
          doc.addPage();
          yPosition = 20;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(220, 38, 38);
          doc.text(titulo + ' (continuação)', 20, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 10;
        }
        
        const fotosPagina = fotos.slice(i, i + fotosPorPagina);
        
        for (let j = 0; j < fotosPagina.length; j++) {
          const col = j % 2;
          const row = Math.floor(j / 2);
          const xPos = 20 + col * (maxFotoWidth + espacoHorizontal);
          const yPos = yPosition + row * (maxFotoHeight + espacoVertical);
          
          try {
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const imgAspectRatio = img.width / img.height;
                const maxAspectRatio = maxFotoWidth / maxFotoHeight;
                
                let finalWidth = maxFotoWidth;
                let finalHeight = maxFotoHeight;
                
                if (imgAspectRatio > maxAspectRatio) {
                  finalHeight = maxFotoWidth / imgAspectRatio;
                } else {
                  finalWidth = maxFotoHeight * imgAspectRatio;
                }
                
                const xOffset = (maxFotoWidth - finalWidth) / 2;
                const yOffset = (maxFotoHeight - finalHeight) / 2;
                
                doc.addImage(img, 'JPEG', xPos + xOffset, yPos + yOffset, finalWidth, finalHeight);
                resolve();
              };
              img.onerror = () => resolve();
              img.src = fotosPagina[j].arquivo_url;
            });
          } catch (error) {
            console.error('Erro ao adicionar foto:', error);
          }
        }
        
        if (i + fotosPorPagina < fotos.length) {
          yPosition = 280;
        } else {
          yPosition += Math.ceil(fotosPagina.length / 2) * (maxFotoHeight + espacoVertical) + 10;
        }
      }
    };
    
    if (fotos.length > 0) {
      await adicionarFotosGrade(fotos, 'Fotos da Chegada do Equipamento');
    }
    
    if (ordem.descricao_problema || ordem.tipo_problema) {
      const dadosProblemas: Array<{label: string, value: string}> = [
        { label: 'Descrição:', value: ordem.descricao_problema || ordem.tipo_problema || '' }
      ];
      criarTabela('Problemas Identificados', dadosProblemas, [128, 128, 128]);
    }
    
    if (ordem.servicos_necessarios && ordem.servicos_necessarios.length > 0) {
      const dadosServicos = ordem.servicos_necessarios.map((s: any) => ({
        label: 'Serviço:',
        value: `${s.quantidade || 1}x ${s.descricao || s.servico}`
      }));
      criarTabela('Serviços Necessários', dadosServicos, [128, 128, 128]);
    }
    
    if (ordem.usinagem_necessaria && ordem.usinagem_necessaria.length > 0) {
      const dadosUsinagem = ordem.usinagem_necessaria.map((u: any) => ({
        label: 'Usinagem:',
        value: `${u.quantidade || 1}x ${u.descricao || u.trabalho}`
      }));
      criarTabela('Usinagem', dadosUsinagem, [128, 128, 128]);
    }
    
    if (ordem.pecas_necessarias && ordem.pecas_necessarias.length > 0) {
      const dadosPecas = ordem.pecas_necessarias.map((p: any) => ({
        label: `${p.quantidade}x ${p.peca}:`,
        value: `Material: ${p.material} | Medidas: ${p.medida1} x ${p.medida2} x ${p.medida3}`
      }));
      criarTabela('Peças Utilizadas', dadosPecas, [128, 128, 128]);
    }
    
    if (ordem.observacoes_tecnicas) {
      const dadosObservacoes: Array<{label: string, value: string}> = [
        { label: 'Observações:', value: ordem.observacoes_tecnicas }
      ];
      criarTabela('Observações Técnicas', dadosObservacoes, [128, 128, 128]);
    }
    
    adicionarRodape();
    
    doc.save(`ordem-servico-${recebimento.numero_ordem || 'ordem'}.pdf`);
    
    toast({
      title: "PDF gerado!",
      description: "O arquivo foi baixado com sucesso",
    });
  };

  const renderItems = (items: any[], title: string, icon: React.ReactNode) => {
    if (!items || items.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium">
                {item.descricao || item.nome || 'Item não especificado'}
              </div>
              {item.quantidade && (
                <div className="text-sm text-muted-foreground">
                  Quantidade: {item.quantidade}
                </div>
              )}
              {item.observacoes && (
                <div className="text-sm text-muted-foreground">
                  Obs: {item.observacoes}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  if (!ordem) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Ordem de serviço não encontrada</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/aprovados')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Visualizar Ordem de Serviço</h1>
              <p className="text-muted-foreground">
                Visualizando ordem: {recebimento?.numero_ordem} - {ordem.cliente_nome}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth"
            onClick={exportToPDF}
          >
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <div className="text-red-600 font-medium">{ordem.cliente_nome}</div>
              </div>
              <div>
                <Label>Data de Entrada</Label>
                <div>{new Date(ordem.data_entrada).toLocaleDateString('pt-BR')}</div>
              </div>
              <div>
                <Label>Nota Fiscal</Label>
                <div>{recebimento?.nota_fiscal || '-'}</div>
              </div>
              <div>
                <Label>Nº da Ordem</Label>
                <div>{ordem.numero_ordem}</div>
              </div>
              <div>
                <Label>Tipo de Equipamento</Label>
                <div>{ordem.equipamento}</div>
              </div>
              <div>
                <Label>Nº de Série</Label>
                <div>{recebimento?.numero_serie || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos da Chegada do Equipamento */}
        {fotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotos da Chegada do Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="space-y-2">
                    <img
                      src={foto.arquivo_url}
                      alt={foto.nome_arquivo}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados Técnicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚙️ Dados Técnicos (Editáveis)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo Equipamento</Label>
                <div>{ordem.equipamento}</div>
              </div>
              <div>
                <Label>Pressão de Trabalho</Label>
                <div>{recebimento?.pressao_trabalho || 'Ex: 350 bar'}</div>
              </div>
              <div>
                <Label>Camisa</Label>
                <div>Ex: 100mm</div>
              </div>
              <div>
                <Label>Haste x Comprimento</Label>
                <div>Ex: 800mm</div>
              </div>
              <div>
                <Label>Curso</Label>
                <div>Ex: 600mm</div>
              </div>
              <div>
                <Label>Conexão A</Label>
                <div>Ex: 3/4 NPT</div>
              </div>
              <div>
                <Label>Conexão B</Label>
                <div>Ex: 1/2 NPT</div>
              </div>
              <div>
                <Label>Prazo de Entrega</Label>
                <div className="flex gap-2">
                  <Input
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    placeholder="Ex: 5 dias úteis"
                  />
                  <Button onClick={atualizarPrazoEntrega} size="sm">
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {(ordem.observacoes_tecnicas || recebimento?.observacoes) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📝 Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ordem.observacoes_tecnicas && (
                  <div>
                    <Label>Observações de Entrada</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {ordem.observacoes_tecnicas}
                    </div>
                  </div>
                )}
                {recebimento?.observacoes && (
                  <div>
                    <Label>Observações Adicionais</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {recebimento.observacoes}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados de Peritagem */}
        {recebimento && (
          <Card>
            <CardHeader>
              <CardTitle>Dados de Peritagem</CardTitle>
              <CardDescription>Informações da peritagem técnica</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">Problemas Identificados</Label>
                  <div className="p-3 bg-muted/50 rounded-lg mt-2">
                    {ordem.descricao_problema || ordem.tipo_problema || 'Nenhum problema específico identificado'}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Observações Adicionais</Label>
                  <div className="p-3 bg-muted/50 rounded-lg mt-2">
                    {ordem.solucao_proposta || 'Nenhuma observação adicional'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Serviços */}
        {renderItems(
          ordem.servicos_necessarios,
          "Serviços",
          <Wrench className="h-5 w-5" />
        )}

        {/* Peças Utilizadas */}
        {renderItems(
          ordem.pecas_necessarias,
          "Peças Utilizadas",
          <Package className="h-5 w-5" />
        )}

        {/* Usinagem */}
        {renderItems(
          ordem.usinagem_necessaria,
          "Usinagem",
          <Settings className="h-5 w-5" />
        )}
      </div>
    </AppLayout>
  );
};

export default VisualizarOrdemServico;