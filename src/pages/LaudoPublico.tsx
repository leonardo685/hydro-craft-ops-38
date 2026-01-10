import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import defaultLogo from "@/assets/mec-hidro-logo-novo.jpg";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Building2,
  Wrench,
  Video,
  Gauge,
  Thermometer,
  Clock,
  FileCheck
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrdemServico {
  id: string;
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  data_entrada: string;
  data_analise: string | null;
  status: string;
  empresa_id: string | null;
  recebimentos?: {
    numero_ordem: string;
  };
}

interface TesteEquipamento {
  id: string;
  tipo_teste: string;
  resultado_teste: string;
  data_hora_teste: string;
  pressao_teste: string | null;
  temperatura_operacao: string | null;
  check_vazamento_pistao: boolean | null;
  check_vazamento_vedacoes_estaticas: boolean | null;
  check_vazamento_haste: boolean | null;
  check_ok: boolean | null;
  observacoes_teste: string | null;
  video_url: string | null;
  curso: string | null;
  qtd_ciclos: string | null;
  pressao_maxima_trabalho: string | null;
  tempo_minutos: string | null;
  pressao_avanco: string | null;
  pressao_retorno: string | null;
  teste_performance_pr004: string | null;
  espessura_camada: string | null;
  observacao: string | null;
}

interface FotoEquipamento {
  id: string;
  arquivo_url: string;
  nome_arquivo: string;
}

interface EmpresaData {
  logo_url: string | null;
  razao_social: string | null;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  tipo_identificacao: string | null;
}

export default function LaudoPublico() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ordemServico, setOrdemServico] = useState<OrdemServico | null>(null);
  const [teste, setTeste] = useState<TesteEquipamento | null>(null);
  const [fotos, setFotos] = useState<FotoEquipamento[]>([]);
  const [empresaLogo, setEmpresaLogo] = useState<string | null>(null);
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const verificarAcessoECarregarDados = async () => {
      if (!numeroOrdem) {
        toast.error("Número da ordem não encontrado");
        navigate("/");
        return;
      }

      try {
        // Buscar ordem de serviço diretamente pelo numero_ordem
        const { data: ordem, error: ordemError } = await supabase
          .from("ordens_servico")
          .select(`
            *,
            recebimentos(numero_ordem)
          `)
          .eq("numero_ordem", numeroOrdem)
          .maybeSingle();

        if (ordemError) throw ordemError;

        if (!ordem) {
          toast.error("Ordem não encontrada");
          navigate("/");
          return;
        }

        // Buscar recebimento se existir (para verificar nota de retorno)
        let pdfNotaRetorno = null;
        let recebimentoId = null;
        if (ordem.recebimento_id) {
          const { data: recebimento } = await supabase
            .from("recebimentos")
            .select("id, pdf_nota_retorno")
            .eq("id", ordem.recebimento_id)
            .maybeSingle();
          
          pdfNotaRetorno = recebimento?.pdf_nota_retorno;
          recebimentoId = recebimento?.id;
        }

        // Verificar se existe laudo técnico criado (teste) para a ordem
        const { data: testeCheck, error: testeCheckError } = await supabase
          .from("testes_equipamentos")
          .select("id")
          .eq("ordem_servico_id", ordem.id)
          .maybeSingle();

        if (testeCheckError) throw testeCheckError;

        // Buscar fotos da ordem para verificar se existe alguma
        const { data: fotosOrdemCheck } = await supabase
          .from("fotos_equipamentos")
          .select("id")
          .eq("ordem_servico_id", ordem.id)
          .limit(1);

        const temFotos = fotosOrdemCheck && fotosOrdemCheck.length > 0;

        // Se não existe laudo técnico, nota de retorno NEM fotos, ordem não está pronta
        if (!testeCheck && !pdfNotaRetorno && !temFotos) {
          toast.error("Esta ordem ainda não foi finalizada");
          navigate("/");
          return;
        }

        setOrdemServico(ordem);

        // Buscar teste do equipamento
        const { data: testeData, error: testeError } = await supabase
          .from("testes_equipamentos")
          .select("*")
          .eq("ordem_servico_id", ordem.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (testeError) throw testeError;

        setTeste(testeData);

        // Buscar fotos do equipamento (pelo recebimento E pela ordem de serviço)
        let fotosData = [];
        
        // Primeiro busca por recebimento_id
        if (recebimentoId) {
          const { data: fotos } = await supabase
            .from("fotos_equipamentos")
            .select("id, arquivo_url, nome_arquivo, legenda")
            .eq("recebimento_id", recebimentoId);

          fotosData = fotos || [];
        }

        // Depois busca por ordem_servico_id (fotos de produção)
        const { data: fotosOrdem } = await supabase
          .from("fotos_equipamentos")
          .select("id, arquivo_url, nome_arquivo, legenda")
          .eq("ordem_servico_id", ordem.id);

        if (fotosOrdem && fotosOrdem.length > 0) {
          // Combinar arrays evitando duplicatas
          fotosData = [...fotosData, ...fotosOrdem.filter(fo => 
            !fotosData.some(fd => fd.id === fo.id)
          )];
        }

        setFotos(fotosData);

        // Buscar dados completos da empresa
        if (ordem.empresa_id) {
          const { data: empresa } = await supabase
            .from("empresas")
            .select("logo_url, razao_social, nome, cnpj, telefone, email, tipo_identificacao")
            .eq("id", ordem.empresa_id)
            .maybeSingle();
          
          if (empresa) {
            setEmpresaData(empresa);
            if (empresa.logo_url) {
              setEmpresaLogo(empresa.logo_url);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar laudo");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    verificarAcessoECarregarDados();
  }, [numeroOrdem, navigate]);

  const handleExportPDF = async () => {
    if (!ordemServico) return;
    
    try {
      toast.loading("Gerando PDF...");
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 10;
      
      const tipoIdentificacao = empresaData?.tipo_identificacao || 'cnpj';
      const labelIdentificacao = tipoIdentificacao === 'ein' ? 'EIN' : tipoIdentificacao === 'ssn' ? 'SSN' : 'CNPJ';
      
      const EMPRESA_INFO = {
        nome: empresaData?.razao_social || empresaData?.nome || "N/A",
        cnpj: empresaData?.cnpj || "",
        telefone: empresaData?.telefone || "",
        email: empresaData?.email || "",
        labelIdentificacao
      };
      
      // Função para adicionar detalhes decorativos no canto
      const adicionarDetalheDecorativo = () => {
        doc.setFillColor(220, 38, 38);
        doc.triangle(pageWidth - 30, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
        doc.setFillColor(0, 0, 0);
        doc.triangle(pageWidth - 15, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
      };
      
      // Função para adicionar rodapé em todas as páginas
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
      
      // === CABEÇALHO ===
      await addLogoToPDF(doc, empresaData?.logo_url, pageWidth - 50, 8, 35, 20);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${EMPRESA_INFO.labelIdentificacao}: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
      doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
      doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
      
      // Linha decorativa
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
      
      // Triângulo decorativo no canto superior direito
      doc.setFillColor(220, 38, 38);
      doc.triangle(pageWidth - 20, 10, pageWidth, 10, pageWidth, 40, 'F');
      
      yPosition = 48;
      
      // === TÍTULO ===
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("LAUDO TÉCNICO", pageWidth / 2, yPosition, { align: "center" });
      doc.setTextColor(0, 0, 0);
      
      const numeroOrdemCorreto = ordemServico.recebimentos?.numero_ordem || ordemServico.numero_ordem;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Ordem de Serviço: ${numeroOrdemCorreto}`, pageWidth / 2, yPosition + 8, { align: "center" });
      
      yPosition = 68;
      
      // Função para criar tabelas estilizadas
      const criarTabela = (titulo: string, dados: Array<{label: string, value: string}>, corTitulo: number[] = [128, 128, 128]) => {
        if (dados.length === 0) return;
        
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(corTitulo[0], corTitulo[1], corTitulo[2]);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 6, { align: 'center' });
        yPosition += 8;
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setLineWidth(0.1);
        
        const rowHeight = 8;
        dados.forEach((item, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(20, yPosition, pageWidth - 40, rowHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, rowHeight);
          
          doc.setFont('helvetica', 'bold');
          doc.text(item.label, 25, yPosition + 5.5);
          doc.setFont('helvetica', 'normal');
          
          const valorLines = doc.splitTextToSize(item.value, pageWidth - 110);
          if (valorLines.length > 1) {
            const extraHeight = (valorLines.length - 1) * 4;
            doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
            doc.rect(20, yPosition, pageWidth - 40, rowHeight + extraHeight, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(20, yPosition, pageWidth - 40, rowHeight + extraHeight);
            doc.setFont('helvetica', 'bold');
            doc.text(item.label, 25, yPosition + 5.5);
            doc.setFont('helvetica', 'normal');
            doc.text(valorLines, 85, yPosition + 5.5);
            yPosition += rowHeight + extraHeight;
          } else {
            doc.text(item.value, 85, yPosition + 5.5);
            yPosition += rowHeight;
          }
        });
        
        yPosition += 8;
      };
      
      // === INFORMAÇÕES DA ORDEM ===
      const dadosOrdem = [
        { label: 'Cliente:', value: ordemServico.cliente_nome || '-' },
        { label: 'Equipamento:', value: ordemServico.equipamento || '-' },
        { label: 'Data de Entrada:', value: format(new Date(ordemServico.data_entrada), "dd/MM/yyyy", { locale: ptBR }) },
        { label: 'Status:', value: 'Finalizado' }
      ];
      criarTabela('Informações da Ordem', dadosOrdem, [128, 128, 128]);
      
      // === RESULTADO DO TESTE ===
      if (teste) {
        const corResultado = teste.resultado_teste === 'aprovado' ? [34, 197, 94] : [239, 68, 68];
        const dadosTeste = [
          { label: 'Tipo de Teste:', value: teste.tipo_teste || '-' },
          { label: 'Data/Hora do Teste:', value: format(new Date(teste.data_hora_teste), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) },
          { label: 'Resultado:', value: teste.resultado_teste === 'aprovado' ? '✓ APROVADO' : '✗ REPROVADO' }
        ];
        criarTabela('Resultado do Teste', dadosTeste, corResultado);
        
        // Parâmetros de Teste
        const parametros: Array<{label: string, value: string}> = [];
        if (teste.pressao_teste) parametros.push({ label: 'Pressão de Teste:', value: teste.pressao_teste });
        if (teste.temperatura_operacao) parametros.push({ label: 'Temperatura de Operação:', value: teste.temperatura_operacao });
        if (teste.tempo_minutos) parametros.push({ label: 'Tempo de Teste:', value: `${teste.tempo_minutos} minutos` });
        if (teste.curso) parametros.push({ label: 'Curso:', value: teste.curso });
        if (teste.qtd_ciclos) parametros.push({ label: 'Quantidade de Ciclos:', value: teste.qtd_ciclos });
        if (teste.pressao_maxima_trabalho) parametros.push({ label: 'Pressão Máxima de Trabalho:', value: teste.pressao_maxima_trabalho });
        if (teste.pressao_avanco) parametros.push({ label: 'Pressão de Avanço:', value: teste.pressao_avanco });
        if (teste.pressao_retorno) parametros.push({ label: 'Pressão de Retorno:', value: teste.pressao_retorno });
        if (teste.espessura_camada) parametros.push({ label: 'Espessura da Camada:', value: teste.espessura_camada });
        
        if (parametros.length > 0) {
          criarTabela('Parâmetros de Teste ISO10100', parametros, [128, 128, 128]);
        }
        
        // Verificações de Vazamento
        const verificacoes: Array<{label: string, value: string}> = [];
        if (teste.check_vazamento_pistao !== null) {
          verificacoes.push({ label: 'Vazamento no Pistão:', value: teste.check_vazamento_pistao ? '✓ OK' : '✗ NOK' });
        }
        if (teste.check_vazamento_vedacoes_estaticas !== null) {
          verificacoes.push({ label: 'Vazamento nas Vedações Estáticas:', value: teste.check_vazamento_vedacoes_estaticas ? '✓ OK' : '✗ NOK' });
        }
        if (teste.check_vazamento_haste !== null) {
          verificacoes.push({ label: 'Vazamento na Haste:', value: teste.check_vazamento_haste ? '✓ OK' : '✗ NOK' });
        }
        
        // Verificação Geral: é OK se todas as verificações de vazamento estão OK
        const todasVerificacoesOK = 
          (teste.check_vazamento_pistao === null || teste.check_vazamento_pistao === true) &&
          (teste.check_vazamento_vedacoes_estaticas === null || teste.check_vazamento_vedacoes_estaticas === true) &&
          (teste.check_vazamento_haste === null || teste.check_vazamento_haste === true);
        
        verificacoes.push({ label: 'Verificação Geral:', value: todasVerificacoesOK ? '✓ OK' : '✗ NOK' });
        
        if (verificacoes.length > 0) {
          criarTabela('Verificações de Vazamento', verificacoes, [128, 128, 128]);
        }
        
        // Observações
        const observacao = teste.observacoes_teste || teste.observacao;
        if (observacao) {
          criarTabela('Observações', [{ label: '', value: observacao }], [128, 128, 128]);
        }
      }
      
      // === FOTOS DO EQUIPAMENTO ===
      if (fotos.length > 0) {
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(128, 128, 128);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.text('FOTOS DO EQUIPAMENTO', pageWidth / 2, yPosition + 6, { align: 'center' });
        yPosition += 12;
        
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
            doc.setFontSize(11);
            doc.setTextColor(220, 38, 38);
            doc.text('FOTOS DO EQUIPAMENTO (continuação)', 20, yPosition);
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
                  try {
                    const ratio = Math.min(maxFotoWidth / img.width, maxFotoHeight / img.height);
                    const imgWidth = img.width * ratio;
                    const imgHeight = img.height * ratio;
                    const xOffset = xPos + (maxFotoWidth - imgWidth) / 2;
                    const yOffset = yPos + (maxFotoHeight - imgHeight) / 2;
                    
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(xPos - 2, yPos - 2, maxFotoWidth + 4, maxFotoHeight + 4);
                    doc.addImage(img, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
                  } catch (e) {
                    console.error('Erro ao adicionar imagem:', e);
                  }
                  resolve();
                };
                img.onerror = () => {
                  doc.setFillColor(240, 240, 240);
                  doc.rect(xPos, yPos, maxFotoWidth, maxFotoHeight, 'F');
                  doc.setTextColor(150, 150, 150);
                  doc.setFontSize(8);
                  doc.text('Erro ao carregar', xPos + maxFotoWidth / 2, yPos + maxFotoHeight / 2, { align: 'center' });
                  resolve();
                };
                img.src = fotosPagina[j].arquivo_url;
              });
            } catch (e) {
              console.error('Erro ao processar foto:', e);
            }
          }
          
          yPosition += Math.ceil(fotosPagina.length / 2) * (maxFotoHeight + espacoVertical);
        }
      }
      
      // Adicionar rodapé em todas as páginas
      adicionarRodape();
      
      doc.save(`Laudo_${numeroOrdemCorreto}.pdf`);
      
      toast.dismiss();
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.dismiss();
      toast.error("Erro ao gerar PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando laudo...</p>
        </div>
      </div>
    );
  }

  if (!ordemServico) {
    return null;
  }

  const ResultadoBadge = ({ resultado }: { resultado: string }) => {
    if (resultado === 'aprovado') {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Aprovado</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Reprovado</Badge>;
  };

  return (
    <div ref={contentRef} className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src={empresaLogo || defaultLogo} 
                alt="Logo" 
                className="h-16 object-contain"
                crossOrigin="anonymous"
              />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Laudo Técnico</CardTitle>
              <p className="text-muted-foreground text-lg mt-2">
                Ordem de Serviço <span className="font-semibold text-primary">#{ordemServico.recebimentos?.numero_ordem || ordemServico.numero_ordem}</span>
              </p>
              <Button
                onClick={handleExportPDF}
                className="mt-4"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Laudo em PDF
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Dados da Ordem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informações da Ordem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{ordemServico.cliente_nome}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Equipamento</p>
                  <p className="font-semibold">{ordemServico.equipamento}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrada</p>
                  <p className="font-semibold">
                    {format(new Date(ordemServico.data_entrada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className="mt-1">Finalizado</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Laudo do Teste */}
        {teste && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5" />
                  Resultado do Teste
                </CardTitle>
                <ResultadoBadge resultado={teste.resultado_teste} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas do Teste */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Teste</p>
                  <p className="font-semibold capitalize">{teste.tipo_teste}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data do Teste</p>
                  <p className="font-semibold">
                    {format(new Date(teste.data_hora_teste), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Parâmetros de Teste */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teste.pressao_teste && (
                  <div className="flex items-start gap-3">
                    <Gauge className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pressão de Teste</p>
                      <p className="font-semibold">{teste.pressao_teste}</p>
                    </div>
                  </div>
                )}
                {teste.temperatura_operacao && (
                  <div className="flex items-start gap-3">
                    <Thermometer className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Temperatura de Operação</p>
                      <p className="font-semibold">{teste.temperatura_operacao}</p>
                    </div>
                  </div>
                )}
                {teste.tempo_minutos && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo de Teste</p>
                      <p className="font-semibold">{teste.tempo_minutos} minutos</p>
                    </div>
                  </div>
                )}
                {teste.curso && (
                  <div>
                    <p className="text-sm text-muted-foreground">Curso</p>
                    <p className="font-semibold">{teste.curso}</p>
                  </div>
                )}
                {teste.qtd_ciclos && (
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade de Ciclos</p>
                    <p className="font-semibold">{teste.qtd_ciclos}</p>
                  </div>
                )}
                {teste.pressao_maxima_trabalho && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pressão Máxima de Trabalho</p>
                    <p className="font-semibold">{teste.pressao_maxima_trabalho}</p>
                  </div>
                )}
                {teste.pressao_avanco && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pressão de Avanço</p>
                    <p className="font-semibold">{teste.pressao_avanco}</p>
                  </div>
                )}
                {teste.pressao_retorno && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pressão de Retorno</p>
                    <p className="font-semibold">{teste.pressao_retorno}</p>
                  </div>
                )}
                {teste.espessura_camada && (
                  <div>
                    <p className="text-sm text-muted-foreground">Espessura da Camada</p>
                    <p className="font-semibold">{teste.espessura_camada}</p>
                  </div>
                )}
              </div>

              {/* Verificações */}
              {(teste.check_vazamento_pistao !== null || 
                teste.check_vazamento_vedacoes_estaticas !== null || 
                teste.check_vazamento_haste !== null) && (
                <>
                  <Separator />
                  <div>
                    <p className="font-semibold mb-3">Verificações de Vazamento</p>
                    <div className="space-y-2">
                      {teste.check_vazamento_pistao !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_pistao ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>Vazamento no Pistão</span>
                        </div>
                      )}
                      {teste.check_vazamento_vedacoes_estaticas !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_vedacoes_estaticas ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>Vazamento nas Vedações Estáticas</span>
                        </div>
                      )}
                      {teste.check_vazamento_haste !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_haste ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>Vazamento na Haste</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Observações */}
              {(teste.observacoes_teste || teste.observacao) && (
                <>
                  <Separator />
                  <div>
                    <p className="font-semibold mb-2">Observações</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {teste.observacoes_teste || teste.observacao}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fotos do Equipamento */}
        {fotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Fotos do Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="space-y-2">
                    <img
                      src={foto.arquivo_url}
                      alt={foto.nome_arquivo}
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <p className="text-sm text-muted-foreground text-center">{foto.nome_arquivo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vídeo do Teste */}
        {teste && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Vídeo do Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teste.video_url ? (
                <>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video 
                      controls 
                      className="w-full h-full"
                      src={teste.video_url}
                    >
                      Seu navegador não suporta a reprodução de vídeos.
                    </video>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (teste.video_url) {
                        window.open(teste.video_url, '_blank');
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Vídeo
                  </Button>
                </>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum vídeo foi anexado a este teste</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rodapé */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            <p>Este laudo foi gerado automaticamente pelo sistema MEC-HIDRO</p>
            <p className="mt-1">
              Data de emissão: {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
