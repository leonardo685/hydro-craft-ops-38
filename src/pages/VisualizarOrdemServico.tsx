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
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useLanguage } from "@/contexts/LanguageContext";

const VisualizarOrdemServico = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    id
  } = useParams();
  const {
    toast
  } = useToast();
  const {
    empresaAtual
  } = useEmpresa();
  const [ordem, setOrdem] = useState<any>(null);
  const [recebimento, setRecebimento] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
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
      const {
        data: ordemPorId
      } = await supabase.from('ordens_servico').select('*').eq('id', id).maybeSingle();
      if (ordemPorId) {
        setOrdem(ordemPorId);
        setPrazoEntrega(ordemPorId.tempo_estimado || "");

        // Buscar dados do recebimento
        if (ordemPorId.recebimento_id) {
          const {
            data: recebimentoData
          } = await supabase.from('recebimentos').select('*').eq('id', ordemPorId.recebimento_id).maybeSingle();
          if (recebimentoData) {
            setRecebimento(recebimentoData);
          }

          // Buscar fotos do equipamento pelo recebimento
          const {
            data: fotosReceb
          } = await supabase.from('fotos_equipamentos').select('*').eq('recebimento_id', ordemPorId.recebimento_id);
          if (fotosReceb && fotosReceb.length > 0) {
            setFotos(fotosReceb);
          }
        }

        // Buscar fotos vinculadas à ordem de serviço (ordens diretas sem recebimento)
        const {
          data: fotosOrdem
        } = await supabase.from('fotos_equipamentos').select('*').eq('ordem_servico_id', ordemPorId.id);
        if (fotosOrdem && fotosOrdem.length > 0) {
          setFotos(prev => {
            const existingIds = new Set(prev.map(f => f.id));
            const novas = fotosOrdem.filter(f => !existingIds.has(f.id));
            return [...prev, ...novas];
          });
        }

        // Buscar documentos anexados à ordem
        const {
          data: docsData
        } = await supabase.from('documentos_ordem').select('*').eq('ordem_servico_id', ordemPorId.id);
        if (docsData) {
          setDocumentos(docsData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar ordem de serviço:', error);
      toast({
        title: t('visualizarOrdem.error'),
        description: t('visualizarOrdem.errorLoading'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const atualizarPrazoEntrega = async () => {
    if (!ordem) return;
    try {
      const {
        error
      } = await supabase.from('ordens_servico').update({
        tempo_estimado: prazoEntrega
      }).eq('id', ordem.id);
      if (error) throw error;
      toast({
        title: t('visualizarOrdem.success'),
        description: t('visualizarOrdem.deliveryTimeUpdated')
      });
    } catch (error) {
      console.error('Erro ao atualizar prazo:', error);
      toast({
        title: t('visualizarOrdem.error'),
        description: t('visualizarOrdem.errorUpdatingDelivery'),
        variant: "destructive"
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

    // Adicionar logo dinâmico
    await addLogoToPDF(doc, empresaAtual?.logo_url, pageWidth - 50, 8, 35, 20);
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
    doc.text("ORDEM DE SERVIÇO", pageWidth / 2, yPosition, {
      align: "center"
    });
    doc.setTextColor(0, 0, 0);
    yPosition = 65;
    const criarTabela = (titulo: string, dados: Array<{
      label: string;
      value: string;
    }>, corTitulo: number[] = [128, 128, 128]) => {
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
      doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, {
        align: 'center'
      });
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
    const dadosBasicos: Array<{
      label: string;
      value: string;
    }> = [{
      label: 'Nº Ordem:',
      value: recebimento.numero_ordem || ''
    }, {
      label: 'Cliente:',
      value: ordem.cliente_nome || ''
    }, {
      label: 'CNPJ/CPF:',
      value: recebimento.cliente_cnpj || '-'
    }, {
      label: 'Equipamento:',
      value: ordem.equipamento || ''
    }, {
      label: 'Data de Entrada:',
      value: new Date(ordem.data_entrada).toLocaleDateString('pt-BR')
    }, {
      label: 'Nota Fiscal:',
      value: recebimento.nota_fiscal || '-'
    }, {
      label: 'Nº Série:',
      value: recebimento.numero_serie || '-'
    }];
    criarTabela('Informações Básicas', dadosBasicos, [128, 128, 128]);
    const dadosTecnicos: Array<{
      label: string;
      value: string;
    }> = [];
    if (recebimento.pressao_trabalho) dadosTecnicos.push({
      label: 'Pressão de Trabalho:',
      value: recebimento.pressao_trabalho
    });
    if (recebimento.camisa) dadosTecnicos.push({
      label: 'Ø Camisa:',
      value: recebimento.camisa
    });
    if (recebimento.haste_comprimento) dadosTecnicos.push({
      label: 'Ø Haste x Comprimento:',
      value: recebimento.haste_comprimento
    });
    if (recebimento.curso) dadosTecnicos.push({
      label: 'Curso:',
      value: recebimento.curso
    });
    if (recebimento.conexao_a) dadosTecnicos.push({
      label: 'Conexão A:',
      value: recebimento.conexao_a
    });
    if (recebimento.conexao_b) dadosTecnicos.push({
      label: 'Conexão B:',
      value: recebimento.conexao_b
    });
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
            await new Promise<void>(resolve => {
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
      const dadosProblemas: Array<{
        label: string;
        value: string;
      }> = [{
        label: 'Descrição:',
        value: ordem.descricao_problema || ordem.tipo_problema || ''
      }];
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
      const dadosObservacoes: Array<{
        label: string;
        value: string;
      }> = [{
        label: 'Observações:',
        value: ordem.observacoes_tecnicas
      }];
      criarTabela('Observações Técnicas', dadosObservacoes, [128, 128, 128]);
    }
    adicionarRodape();
    doc.save(`ordem-servico-${recebimento.numero_ordem || 'ordem'}.pdf`);
    toast({
      title: "PDF gerado!",
      description: "O arquivo foi baixado com sucesso"
    });
  };
  const renderItems = (items: any[], title: string, icon: React.ReactNode) => {
    if (!items || items.length === 0) return null;
    return <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => <div key={index} className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium">
                {item.descricao || item.nome || item.peca || item.servico || item.trabalho || 'Item não especificado'}
              </div>
              {item.quantidade && <div className="text-sm text-muted-foreground">
                  {t('visualizarOrdem.quantity')}: {item.quantidade}
                </div>}
              {item.codigo && <div className="text-sm text-muted-foreground">
                  Código: {item.codigo}
                </div>}
              {item.observacoes && <div className="text-sm text-muted-foreground">
                  {t('visualizarOrdem.obs')}: {item.observacoes}
                </div>}
            </div>)}
        </CardContent>
      </Card>;
  };
  if (loading) {
    return <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{t('visualizarOrdem.loading')}</div>
        </div>
      </AppLayout>;
  }
  if (!ordem) {
    return <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{t('visualizarOrdem.orderNotFound')}</div>
        </div>
      </AppLayout>;
  }
  return <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/aprovados')} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('visualizarOrdem.back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t('visualizarOrdem.pageTitle')}</h1>
              <p className="text-muted-foreground">
                {t('visualizarOrdem.viewingOrder')}: {recebimento?.numero_ordem} - {ordem.cliente_nome}
              </p>
            </div>
          </div>
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth" onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" />
            {t('visualizarOrdem.exportPdf')}
          </Button>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 {t('visualizarOrdem.basicInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>{t('visualizarOrdem.client')}</Label>
                <div className="text-red-600 font-medium">{ordem.cliente_nome}</div>
                {recebimento?.cliente_cnpj && <div className="text-sm text-muted-foreground">{recebimento.cliente_cnpj}</div>}
              </div>
              <div>
                <Label>{t('visualizarOrdem.entryDate')}</Label>
                <div>{new Date(ordem.data_entrada).toLocaleDateString('pt-BR')}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.invoice')}</Label>
                <div>{recebimento?.nota_fiscal || '-'}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.orderNumber')}</Label>
                <div>{ordem.numero_ordem}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.equipmentType')}</Label>
                <div>{ordem.equipamento}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.serialNumber')}</Label>
                <div>{recebimento?.numero_serie || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos da Chegada do Equipamento */}
        {fotos.length > 0 && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {t('visualizarOrdem.arrivalPhotos')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {fotos.map(foto => <div key={foto.id} className="space-y-2">
                    <img src={foto.arquivo_url} alt={foto.nome_arquivo} className="w-full h-48 object-cover rounded-lg border" />
                  </div>)}
              </div>
            </CardContent>
          </Card>}

        {/* Dados Técnicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚙️ {t('visualizarOrdem.technicalData')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>{t('visualizarOrdem.equipmentType')}</Label>
                <div>{ordem.equipamento}</div>
              </div>
               <div>
                <Label>{t('visualizarOrdem.workPressure')}</Label>
                <div>{recebimento?.pressao_trabalho || ordem.pressao_trabalho || '-'}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.shirt')}</Label>
                <div>{recebimento?.camisa || ordem.camisa || '-'}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.rodLength')}</Label>
                <div>{recebimento?.haste_comprimento || ordem.haste_comprimento || '-'}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.stroke')}</Label>
                <div>{recebimento?.curso || ordem.curso || '-'}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.connectionA')}</Label>
                <div>{recebimento?.conexao_a || ordem.conexao_a || '-'}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.connectionB')}</Label>
                <div>{recebimento?.conexao_b || ordem.conexao_b || '-'}</div>
              </div>
              <div>
                <Label>{t('visualizarOrdem.deliveryTime')}</Label>
                <div className="flex gap-2">
                  <Input value={prazoEntrega} onChange={e => setPrazoEntrega(e.target.value)} placeholder={t('visualizarOrdem.deliveryTimePlaceholder')} />
                  <Button onClick={atualizarPrazoEntrega} size="sm">
                    {t('visualizarOrdem.save')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {(ordem.observacoes_tecnicas || recebimento?.problemas_apresentados) && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📝 {t('visualizarOrdem.accompaniesEquipment')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recebimento?.problemas_apresentados && <div>
                    <Label>{t('visualizarOrdem.problemsPresented')}</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {recebimento.problemas_apresentados}
                    </div>
                  </div>}
                {ordem.observacoes_tecnicas && <div>
                    <Label>{t('visualizarOrdem.technicalObservations')}</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {ordem.observacoes_tecnicas}
                    </div>
                  </div>}
              </div>
            </CardContent>
          </Card>}

        {/* Dados de Peritagem */}
        {recebimento && <Card>
            <CardHeader>
              <CardTitle>{t('visualizarOrdem.expertiseData')}</CardTitle>
              <CardDescription>{t('visualizarOrdem.expertiseInfo')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">{t('visualizarOrdem.failureReason')}</Label>
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                    {ordem.motivo_falha || t('visualizarOrdem.noFailureReason')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>}

        {/* Serviços */}
        {renderItems(ordem.servicos_necessarios, t('visualizarOrdem.services'), <Wrench className="h-5 w-5" />)}

        {/* Peças Utilizadas */}
        {renderItems(ordem.pecas_necessarias, t('visualizarOrdem.partsUsed'), <Package className="h-5 w-5" />)}

        {/* Usinagem */}
        {renderItems(ordem.usinagem_necessaria, t('visualizarOrdem.machining'), <Settings className="h-5 w-5" />)}

        {/* Documentos Anexados */}
        {documentos.length > 0 && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Anexados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documentos.map(doc => <a key={doc.id} href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">{doc.nome_arquivo}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{doc.tipo_arquivo}</span>
                  </a>)}
              </div>
            </CardContent>
          </Card>}
      </div>
    </AppLayout>;
};
export default VisualizarOrdemServico;