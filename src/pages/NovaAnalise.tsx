import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Upload, Camera, FileText, Trash2, Download, Loader2 } from "lucide-react";
import { QuantityInput } from "@/components/QuantityInput";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useRecebimentos } from "@/hooks/use-recebimentos";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useLanguage } from "@/contexts/LanguageContext";

const NovaOrdemServico = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { recebimentos, loading } = useRecebimentos();
  const [recebimento, setRecebimento] = useState<any>(null);
  const [ordemExistente, setOrdemExistente] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const submittingRef = useRef(false);
  const [isEdicao, setIsEdicao] = useState(false);
  const { empresaAtual } = useEmpresa();
  const { t, language } = useLanguage();
  
  const [formData, setFormData] = useState({
    tecnico: "",
    problemas: "",
    prazoEstimado: "",
    prioridade: "Média",
    observacoes: "",
    motivoFalha: "",
    motivoFalhaOutro: ""
  });

  const [dadosTecnicos, setDadosTecnicos] = useState({
    tipoEquipamento: "",
    pressaoTrabalho: "",
    camisa: "",
    hasteComprimento: "",
    curso: "",
    conexaoA: "",
    conexaoB: "",
    temperaturaTrabalho: "",
    fluidoTrabalho: "",
    localInstalacao: "",
    potencia: "",
    numeroSerie: ""
  });

  const [fotosChegada, setFotosChegada] = useState<(File | null)[]>([null, null, null, null]);
  const [fotosAnalise, setFotosAnalise] = useState<File[]>([]);
  const [previewsChegada, setPreviewsChegada] = useState<string[]>([]);
  const [previewsAnalise, setPreviewsAnalise] = useState<string[]>([]);
  const [pecasUtilizadas, setPecasUtilizadas] = useState<Array<{
    quantidade: number;
    peca: string;
  }>>([]);
  
  const [documentosPdf, setDocumentosPdf] = useState<Array<{
    id: string;
    nome_arquivo: string;
    arquivo_url: string;
    tipo_arquivo: string;
    tamanho_bytes: number;
  }>>([]);
  const [novosDocumentos, setNovosDocumentos] = useState<Array<{
    file: File;
    nome: string;
    tipo: string;
  }>>([]);
  
  
  // Estado separado para peças adicionais (sem medidas)
  const [novaPecaAdicional, setNovaPecaAdicional] = useState({
    quantidade: 1,
    peca: ""
  });
  const [servicos, setServicos] = useState("");
  const [usinagem, setUsinagem] = useState({
    usinagemHaste: false,
    usinagemTampaGuia: false,
    usinagemEmbolo: false,
    usinagemCabecoteDianteiro: false,
    usinagemCabecoteTraseiro: false
  });
  
  // Serviços pré-determinados
  const [servicosPreDeterminados, setServicosPreDeterminados] = useState({
    desmontagem: false,
    limpeza: false,
    teste: false,
    pintura: false,
    recondicionamento: false
  });
  const [servicosPersonalizados, setServicosPersonalizados] = useState("");
  const [usinagemPersonalizada, setUsinagemPersonalizada] = useState("");
  
  // Arrays para múltiplos serviços e usinagens adicionais
  const [servicosAdicionais, setServicosAdicionais] = useState<Array<{ quantidade: number; nome: string; codigo?: string }>>([]);
  const [usinagemAdicional, setUsinagemAdicional] = useState<Array<{ quantidade: number; nome: string; codigo?: string }>>([]);
  
  // Campos temporários para novos itens
  const [novoServicoAdicional, setNovoServicoAdicional] = useState({ quantidade: 1, nome: "", codigo: "" });
  const [novaUsinagemAdicional, setNovaUsinagemAdicional] = useState({ quantidade: 1, nome: "", codigo: "" });

  // Estados para quantidades e nomes editáveis dos serviços
  const [servicosQuantidades, setServicosQuantidades] = useState({
    desmontagem: 1,
    limpeza: 1,
    teste: 1,
    pintura: 1,
    recondicionamento: 1,
    personalizado: 1
  });

  const [servicosNomes, setServicosNomes] = useState({
    desmontagem: t('novaAnalise.disassemblyAssembly'),
    limpeza: t('novaAnalise.equipmentCleaning'),
    teste: t('novaAnalise.performanceTest'),
    pintura: t('novaAnalise.equipmentPainting'),
    recondicionamento: t('novaAnalise.threadReconditioning')
  });

  // Estados para quantidades e nomes editáveis das usinagens
  const [usinagemQuantidades, setUsinagemQuantidades] = useState({
    usinagemHaste: 1,
    usinagemTampaGuia: 1,
    usinagemEmbolo: 1,
    usinagemCabecoteDianteiro: 1,
    usinagemCabecoteTraseiro: 1,
    personalizada: 1
  });

  const [usinagemNomes, setUsinagemNomes] = useState({
    usinagemHaste: t('novaAnalise.rodMachining'),
    usinagemTampaGuia: t('novaAnalise.guideCapMachining'),
    usinagemEmbolo: t('novaAnalise.pistonMachining'),
    usinagemCabecoteDianteiro: t('novaAnalise.frontHeadMachining'),
    usinagemCabecoteTraseiro: t('novaAnalise.rearHeadMachining')
  });

  // Ref para controlar se dados de edição já foram carregados (evitar sobrescrever nomes)
  const dadosCarregadosRef = useRef(false);

  // Atualizar nomes quando o idioma mudar - MAS NÃO se já carregou dados de edição
  useEffect(() => {
    // Não sobrescrever nomes se já carregou dados de edição
    if (dadosCarregadosRef.current) {
      return;
    }
    
    setServicosNomes({
      desmontagem: t('novaAnalise.disassemblyAssembly'),
      limpeza: t('novaAnalise.equipmentCleaning'),
      teste: t('novaAnalise.performanceTest'),
      pintura: t('novaAnalise.equipmentPainting'),
      recondicionamento: t('novaAnalise.threadReconditioning')
    });
    setUsinagemNomes({
      usinagemHaste: t('novaAnalise.rodMachining'),
      usinagemTampaGuia: t('novaAnalise.guideCapMachining'),
      usinagemEmbolo: t('novaAnalise.pistonMachining'),
      usinagemCabecoteDianteiro: t('novaAnalise.frontHeadMachining'),
      usinagemCabecoteTraseiro: t('novaAnalise.rearHeadMachining')
    });
  }, [language, t]);


  // Função para exportar PDF
  const exportToPDF = async (ordemData?: any, recebimentoData?: any) => {
    // Usar dados passados como parâmetros ou os dados atuais do estado
    const dadosOrdem = ordemData || {
      tecnico: formData.tecnico,
      prioridade: formData.prioridade,
      data_entrada: recebimento?.data_entrada
    };
    const dadosRecebimento = recebimentoData || recebimento;
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
    const lineHeight = 6;
    
    // Função para adicionar detalhes decorativos
    const adicionarDetalheDecorativo = () => {
      doc.setFillColor(220, 38, 38);
      doc.triangle(
        pageWidth - 30, pageHeight - 30,
        pageWidth, pageHeight - 30,
        pageWidth, pageHeight,
        'F'
      );
      
      doc.setFillColor(0, 0, 0);
      doc.triangle(
        pageWidth - 15, pageHeight - 30,
        pageWidth, pageHeight - 30,
        pageWidth, pageHeight,
        'F'
      );
    };
    
    // Função para adicionar rodapé
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
    
    // Cabeçalho Profissional
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${EMPRESA_INFO.labelIdentificacao}: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
    doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
    doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
    
    // Linha separadora vermelha
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
    
    // Detalhe vermelho no canto superior direito (triângulo)
    doc.setFillColor(220, 38, 38);
    doc.triangle(
      pageWidth - 20, 10,
      pageWidth, 10,
      pageWidth, 40,
      'F'
    );
    
    yPosition = 48;
    
    // Título "ORDEM DE SERVIÇO"
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("ORDEM DE SERVIÇO", pageWidth / 2, yPosition, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    yPosition = 65;
    
    // Função genérica para criar tabela
    const criarTabela = (titulo: string, dados: Array<{label: string, value: string}>, corTitulo: number[] = [128, 128, 128]) => {
      if (dados.length === 0) return;
      
      if (yPosition > 210) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Título da tabela
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(corTitulo[0], corTitulo[1], corTitulo[2]);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, { align: 'center' });
      yPosition += 10;
      
      // Linhas da tabela
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setLineWidth(0.1); // Linha bem fina
      
      const rowHeight = 10;
      dados.forEach((item, index) => {
        // Alternar cor de fundo
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(20, yPosition, pageWidth - 40, rowHeight, 'F');
        
        // Borda da célula
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, rowHeight);
        
        // Texto em negrito para o label
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, 25, yPosition + 7);
        
        // Texto normal para o valor (com quebra de linha se necessário)
        doc.setFont('helvetica', 'normal');
        const valorLines = doc.splitTextToSize(item.value, pageWidth - 110);
        
        // Se o texto tiver múltiplas linhas, ajustar altura da célula
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
    
    // Função para criar tabela com múltiplas colunas
    const criarTabelaColunas = (
      titulo: string, 
      colunas: string[], 
      dados: string[][], 
      corTitulo: number[] = [128, 128, 128]
    ) => {
      if (dados.length === 0) return;
      
      if (yPosition > 210) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Título da tabela
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(corTitulo[0], corTitulo[1], corTitulo[2]);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, { align: 'center' });
      yPosition += 10;
      
      // Definir larguras baseadas no número de colunas
      let colWidths: number[];
      if (colunas.length === 2) {
        // Qtd. | Descrição
        colWidths = [20, pageWidth - 80];
      } else if (colunas.length === 4) {
        // Qtd. | Descrição | Material | Medidas
        colWidths = [20, 60, 40, 45];
      } else {
        colWidths = Array(colunas.length).fill((pageWidth - 40) / colunas.length);
      }
      
      // Cabeçalho das colunas
      doc.setFillColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      
      let xPos = 25;
      colunas.forEach((col, i) => {
        doc.text(col, xPos, yPosition + 5);
        xPos += colWidths[i];
      });
      yPosition += 8;
      
      // Dados
      doc.setFont('helvetica', 'normal');
      dados.forEach((linha, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(20, yPosition, pageWidth - 40, 7, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, 7);
        
        xPos = 25;
        linha.forEach((valor, i) => {
          const textoQuebrado = doc.splitTextToSize(valor, colWidths[i] - 5);
          doc.text(textoQuebrado[0], xPos, yPosition + 5);
          xPos += colWidths[i];
        });
        yPosition += 7;
      });
      
      yPosition += 10;
    };
    
    // Informações Básicas - TABELA
    const dadosBasicos: Array<{label: string, value: string}> = [
      { label: 'Cliente:', value: dadosRecebimento?.cliente_nome || '' },
      { label: 'CNPJ/CPF:', value: dadosRecebimento?.cliente_cnpj || '-' },
      { label: 'Equipamento:', value: dadosRecebimento?.tipo_equipamento || '' },
      { label: 'Data de Entrada:', value: dadosOrdem?.data_entrada ? new Date(dadosOrdem.data_entrada).toLocaleDateString('pt-BR') : '' },
      { label: 'Técnico:', value: dadosOrdem?.tecnico || '' },
      { label: 'Prioridade:', value: dadosOrdem?.prioridade || '' }
    ];
    criarTabela('Informações Básicas', dadosBasicos, [128, 128, 128]);
    
    // Dados Técnicos (Peritagem) - TABELA
    const dadosParaTabela: Array<{label: string, value: string}> = [];
    
    if (dadosTecnicos.camisa) {
      dadosParaTabela.push({ label: 'Ø Camisa:', value: dadosTecnicos.camisa });
    }
    if (dadosTecnicos.hasteComprimento) {
      dadosParaTabela.push({ label: 'Ø Haste x Comprimento:', value: dadosTecnicos.hasteComprimento });
    }
    if (dadosTecnicos.curso) {
      dadosParaTabela.push({ label: 'Curso:', value: dadosTecnicos.curso });
    }
    if (dadosTecnicos.conexaoA) {
      dadosParaTabela.push({ label: 'Conexão A:', value: dadosTecnicos.conexaoA });
    }
    if (dadosTecnicos.conexaoB) {
      dadosParaTabela.push({ label: 'Conexão B:', value: dadosTecnicos.conexaoB });
    }
    if (dadosTecnicos.pressaoTrabalho) {
      dadosParaTabela.push({ label: 'Pressão de Trabalho:', value: dadosTecnicos.pressaoTrabalho });
    }
    if (dadosTecnicos.temperaturaTrabalho) {
      dadosParaTabela.push({ label: 'Temperatura de Trabalho:', value: dadosTecnicos.temperaturaTrabalho });
    }
    if (dadosTecnicos.fluidoTrabalho) {
      dadosParaTabela.push({ label: 'Fluido de Trabalho:', value: dadosTecnicos.fluidoTrabalho });
    }
    
    criarTabela('Peritagem', dadosParaTabela, [128, 128, 128]);
    
    // Função para adicionar fotos em grade 2x2 com proporção mantida
    const adicionarFotosGrade = async (fotos: string[], titulo: string) => {
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
              img.src = fotosPagina[j];
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
    
    // Fotos de Chegada
    if (previewsChegada.some(preview => preview)) {
      await adicionarFotosGrade(previewsChegada.filter(p => p), 'Fotos de Chegada do Equipamento');
    }
    
    // Problemas Identificados - TABELA
    if (formData.problemas) {
      const dadosProblemas: Array<{label: string, value: string}> = [
        { label: 'Descrição:', value: formData.problemas }
      ];
      criarTabela('Problemas Identificados', dadosProblemas, [128, 128, 128]);
    }
    
    // Serviços Realizados - TABELA COM COLUNAS
    const servicosSelecionados = Object.entries(servicosPreDeterminados)
      .filter(([_, selecionado]) => selecionado)
      .map(([servico, _]) => {
        const quantidade = servicosQuantidades[servico as keyof typeof servicosQuantidades];
        const nome = servicosNomes[servico as keyof typeof servicosNomes];
        return [quantidade.toString(), nome];
      });
    
    if (servicosPersonalizados) {
      const quantidade = servicosQuantidades.personalizado;
      servicosSelecionados.push([quantidade.toString(), servicosPersonalizados]);
    }
    
    // Adicionar serviços adicionais (caso existam)
    if (servicosAdicionais && servicosAdicionais.length > 0) {
      servicosAdicionais.forEach(servico => {
        servicosSelecionados.push([servico.quantidade.toString(), servico.nome]);
      });
    }
    
    if (servicosSelecionados.length > 0) {
      criarTabelaColunas('Serviços Realizados', ['Qtd.', 'Descrição'], servicosSelecionados, [128, 128, 128]);
    }
    
    // Usinagem - TABELA COM COLUNAS
    const usinagemSelecionada = Object.entries(usinagem)
      .filter(([_, selecionado]) => selecionado)
      .map(([tipo, _]) => {
        const quantidade = usinagemQuantidades[tipo as keyof typeof usinagemQuantidades];
        const nome = usinagemNomes[tipo as keyof typeof usinagemNomes];
        return [quantidade.toString(), nome];
      });
    
    if (usinagemPersonalizada) {
      const quantidade = usinagemQuantidades.personalizada;
      usinagemSelecionada.push([quantidade.toString(), usinagemPersonalizada]);
    }
    
    // Adicionar usinagem adicional (caso exista)
    if (usinagemAdicional && usinagemAdicional.length > 0) {
      usinagemAdicional.forEach(item => {
        usinagemSelecionada.push([item.quantidade.toString(), item.nome]);
      });
    }
    
    if (usinagemSelecionada.length > 0) {
      criarTabelaColunas('Usinagem', ['Qtd.', 'Descrição'], usinagemSelecionada, [128, 128, 128]);
    }
    
    // Peças Utilizadas - TABELA COM COLUNAS (apenas Qtd e Descrição)
    if (pecasUtilizadas.length > 0) {
      const dadosPecas = pecasUtilizadas.map(peca => [
        peca.quantidade.toString(),
        peca.peca
      ]);
      
      criarTabelaColunas(
        'Peças Utilizadas', 
        ['Qtd.', 'Descrição'], 
        dadosPecas, 
        [128, 128, 128]
      );
    }
    
    // Fotos da Análise
    if (previewsAnalise.some(preview => preview)) {
      await adicionarFotosGrade(previewsAnalise.filter(p => p), 'Fotos da Análise');
    }
    
    // Observações - TABELA
    if (formData.observacoes) {
      const dadosObservacoes: Array<{label: string, value: string}> = [
        { label: 'Observações:', value: formData.observacoes }
      ];
      criarTabela('Observações Técnicas', dadosObservacoes, [128, 128, 128]);
    }
    
    // Adicionar rodapés
    adicionarRodape();
    
    doc.save(`analise-tecnica-${recebimento?.cliente_nome || 'cliente'}.pdf`);
  };

  // Função para lidar com o upload de fotos de chegada
  const handlePhotoUpload = (index: number, file: File | null) => {
    const newFotos = [...fotosChegada];
    newFotos[index] = file;
    setFotosChegada(newFotos);

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewsChegada(prev => {
          const newPreviews = [...prev];
          newPreviews[index] = result;
          return newPreviews;
        });
      };
      reader.readAsDataURL(file);
    } else {
      // Usar filter para remover efetivamente ao invés de definir como string vazia
      setPreviewsChegada(prev => prev.filter((_, i) => i !== index));
      setFotosChegada(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Função para abrir o seletor de arquivo para fotos de chegada
  const openFileSelector = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoUpload(index, file);
      }
    };
    input.click();
  };

  const handleFotoAnaliseChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFotos = [...fotosAnalise];
      newFotos[index] = file;
      setFotosAnalise(newFotos);

      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewsAnalise(prev => {
          const newPreviews = [...prev];
          newPreviews[index] = result;
          return newPreviews;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (loading) return;
    
    const decodedId = id ? decodeURIComponent(id) : '';
    console.log('🔍 Buscando análise para:', decodedId);
    
    // ✅ CORREÇÃO: Verificar PRIMEIRO se existe ordem de serviço (modo edição)
    const loadOrderForEdit = async () => {
      if (!decodedId) return false;
      
      console.log('🔎 Verificando se existe ordem de serviço:', decodedId);
      try {
        const { data: ordens, error } = await supabase
          .from('ordens_servico')
          .select(`
            *,
            recebimentos (
              id,
              numero_ordem,
              cliente_nome,
              cliente_cnpj,
              tipo_equipamento,
              data_entrada,
              nota_fiscal,
              numero_serie,
              problemas_apresentados,
              pressao_trabalho,
              temperatura_trabalho,
              fluido_trabalho,
              local_instalacao,
              potencia,
              camisa,
              haste_comprimento,
              curso,
              conexao_a,
              conexao_b,
              fotos_equipamentos (*)
            )
          `)
          .eq('numero_ordem', decodedId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (error) {
          console.error('❌ Erro ao buscar ordem de serviço:', error);
          return false;
        }
        
        // Pegar a primeira ordem (mais antiga)
        const ordem = ordens && ordens.length > 0 ? ordens[0] : null;

        if (ordem && ordem.recebimentos) {
          console.log('✅ Ordem de serviço encontrada - MODO EDIÇÃO');
          setIsEdicao(true);
          setOrdemExistente(ordem);
          
          // Carregar dados do recebimento
          const recebimentoData = ordem.recebimentos;
          setRecebimento({
            id: recebimentoData.id,
            cliente_nome: recebimentoData.cliente_nome,
            cliente_cnpj: recebimentoData.cliente_cnpj,
            tipo_equipamento: recebimentoData.tipo_equipamento,
            data_entrada: recebimentoData.data_entrada,
            dataEntrada: new Date(recebimentoData.data_entrada).toLocaleDateString('pt-BR'),
            numeroOrdem: recebimentoData.numero_ordem,
            nota_fiscal: recebimentoData.nota_fiscal,
            numero_serie: recebimentoData.numero_serie,
            problemas_apresentados: recebimentoData.problemas_apresentados,
            fotos: recebimentoData.fotos_equipamentos || []
          });

          // Preencher form com dados da ordem existente
          setFormData({
            tecnico: ordem.tecnico || "",
            problemas: ordem.tipo_problema || ordem.descricao_problema || "",
            prazoEstimado: ordem.tempo_estimado || "",
            prioridade: ordem.prioridade === 'alta' ? 'Alta' : 
                       ordem.prioridade === 'baixa' ? 'Baixa' : 'Média',
            observacoes: ordem.observacoes_tecnicas || "",
            motivoFalha: ordem.motivo_falha || "",
            motivoFalhaOutro: ""
          });

          // Carregar peças se existirem
          if (ordem.pecas_necessarias && Array.isArray(ordem.pecas_necessarias)) {
            console.log('📦 Carregando', ordem.pecas_necessarias.length, 'peças');
            setPecasUtilizadas(ordem.pecas_necessarias as any);
          }

          // Carregar serviços se existirem
          if (ordem.servicos_necessarios && Array.isArray(ordem.servicos_necessarios)) {
            console.log('🔧 Carregando', ordem.servicos_necessarios.length, 'serviços');
              console.log('Carregando serviços:', ordem.servicos_necessarios);
              const servicosObj: any = {};
              const quantidades: any = {};
              const nomes: any = {};
              let personalizado = "";
              const adicionais: Array<{ quantidade: number; nome: string; codigo?: string }> = [];
              
              ordem.servicos_necessarios.forEach((servico: any) => {
                if (servico.tipo === 'personalizado') {
                  personalizado = servico.descricao || servico.servico;
                  quantidades.personalizado = servico.quantidade || 1;
                } else if (servico.tipo === 'adicional') {
                  // Adicionar aos serviços adicionais
                  adicionais.push({
                    quantidade: servico.quantidade || 1,
                    nome: servico.descricao || servico.servico,
                    codigo: servico.codigo || ""
                  });
                } else if (servico.tipo) {
                  servicosObj[servico.tipo] = true;
                  quantidades[servico.tipo] = servico.quantidade || 1;
                  if (servico.descricao) {
                    nomes[servico.tipo] = servico.descricao;
                  }
                }
              });
              
              setServicosPreDeterminados(prev => ({ ...prev, ...servicosObj }));
              setServicosQuantidades(prev => ({ ...prev, ...quantidades }));
              setServicosNomes(prev => ({ ...prev, ...nomes }));
              setServicosPersonalizados(personalizado);
              setServicosAdicionais(adicionais);
            }

          // Carregar usinagem se existir
          if (ordem.usinagem_necessaria && Array.isArray(ordem.usinagem_necessaria)) {
            console.log('⚙️ Carregando', ordem.usinagem_necessaria.length, 'usinagens');
              const usinagemObj: any = {};
              const quantidades: any = {};
              const nomes: any = {};
              let personalizada = "";
              const adicionais: Array<{ quantidade: number; nome: string; codigo?: string }> = [];
              
              ordem.usinagem_necessaria.forEach((usinag: any) => {
                if (usinag.tipo === 'personalizada') {
                  personalizada = usinag.descricao || usinag.trabalho;
                  quantidades.personalizada = usinag.quantidade || 1;
                } else if (usinag.tipo === 'adicional') {
                  // Adicionar às usinagens adicionais
                  adicionais.push({
                    quantidade: usinag.quantidade || 1,
                    nome: usinag.descricao || usinag.trabalho,
                    codigo: usinag.codigo || ""
                  });
                } else if (usinag.tipo) {
                  usinagemObj[usinag.tipo] = true;
                  quantidades[usinag.tipo] = usinag.quantidade || 1;
                  if (usinag.descricao) {
                    nomes[usinag.tipo] = usinag.descricao;
                  }
                }
              });
              
              setUsinagem(prev => ({ ...prev, ...usinagemObj }));
              setUsinagemQuantidades(prev => ({ ...prev, ...quantidades }));
              setUsinagemNomes(prev => ({ ...prev, ...nomes }));
              setUsinagemPersonalizada(personalizada);
              setUsinagemAdicional(adicionais);
              
              // Marcar que dados de edição foram carregados para evitar sobrescrever nomes
              dadosCarregadosRef.current = true;
            }

            // Dados técnicos - Carregar TODOS os dados do recebimento
            console.log('Carregando dados técnicos do recebimento:', recebimentoData);
            setDadosTecnicos({
              tipoEquipamento: recebimentoData.tipo_equipamento || "",
              pressaoTrabalho: (recebimentoData as any).pressao_trabalho || "",
              camisa: (recebimentoData as any).camisa || "",
              hasteComprimento: (recebimentoData as any).haste_comprimento || "",
              curso: (recebimentoData as any).curso || "",
              conexaoA: (recebimentoData as any).conexao_a || "",
              conexaoB: (recebimentoData as any).conexao_b || "",
              temperaturaTrabalho: (recebimentoData as any).temperatura_trabalho || "",
              fluidoTrabalho: (recebimentoData as any).fluido_trabalho || "",
              localInstalacao: (recebimentoData as any).local_instalacao || "",
              potencia: (recebimentoData as any).potencia || "",
              numeroSerie: (recebimentoData as any).numero_serie || ""
            });

            // Carregar fotos separando por tipo (chegada vs análise)
            if (recebimentoData.fotos_equipamentos && recebimentoData.fotos_equipamentos.length > 0) {
              console.log('Carregando fotos do banco:', recebimentoData.fotos_equipamentos);
              
              // Fotos de chegada (apresentar_orcamento = true) - usar Set para URLs únicas
              const fotosChegadaUrls = [...new Set(
                recebimentoData.fotos_equipamentos
                  .filter((foto: any) => foto.apresentar_orcamento === true)
                  .map((foto: any) => foto.arquivo_url)
              )];
              
              if (fotosChegadaUrls.length > 0) {
                console.log('✅ Fotos de CHEGADA carregadas:', fotosChegadaUrls.length);
                setPreviewsChegada(fotosChegadaUrls);
                setFotosChegada(fotosChegadaUrls as any);
              }
              
              // Fotos de análise (apresentar_orcamento = false) - usar Set para URLs únicas
              const fotosAnaliseUrls = [...new Set(
                recebimentoData.fotos_equipamentos
                  .filter((foto: any) => foto.apresentar_orcamento === false)
                  .map((foto: any) => foto.arquivo_url)
              )];
              
              if (fotosAnaliseUrls.length > 0) {
                // Limitar a 20 fotos para evitar problemas de performance
                const limitedFotos = fotosAnaliseUrls.slice(0, 20);
                if (fotosAnaliseUrls.length > 20) {
                  console.warn(`⚠️ ${fotosAnaliseUrls.length} fotos de análise encontradas, exibindo apenas 20`);
                }
                console.log('✅ Fotos de ANÁLISE carregadas:', limitedFotos.length);
                setPreviewsAnalise(limitedFotos);
                setFotosAnalise(limitedFotos as any);
              }
            }
          } else if (ordem) {
            // Ordem criada diretamente (sem recebimento vinculado)
            console.log('Carregando ordem sem recebimento:', ordem);
            setIsEdicao(true);
            setOrdemExistente(ordem);
            
            // Criar objeto recebimento a partir dos dados da ordem
            setRecebimento({
              id: null,
              cliente_nome: ordem.cliente_nome,
              tipo_equipamento: ordem.equipamento,
              data_entrada: ordem.data_entrada,
              dataEntrada: new Date(ordem.data_entrada).toLocaleDateString('pt-BR'),
              numeroOrdem: ordem.numero_ordem,
              nota_fiscal: null,
              numero_serie: null,
              observacoes: ordem.observacoes_tecnicas,
              fotos: []
            });

            // Preencher form com dados da ordem
            setFormData({
              tecnico: ordem.tecnico || "",
              problemas: ordem.tipo_problema || ordem.descricao_problema || "",
              prazoEstimado: ordem.tempo_estimado || "",
              prioridade: ordem.prioridade === 'alta' ? 'Alta' : 
                         ordem.prioridade === 'baixa' ? 'Baixa' : 'Média',
              observacoes: ordem.observacoes_tecnicas || "",
              motivoFalha: ordem.motivo_falha || "",
              motivoFalhaOutro: ""
            });

            // Dados técnicos - carregar da ordem se disponíveis (para ordens diretas)
            console.log('📊 Carregando dados técnicos da ordem direta:', ordem);
            setDadosTecnicos({
              tipoEquipamento: ordem.equipamento || "",
              pressaoTrabalho: (ordem as any).pressao_trabalho || "",
              camisa: (ordem as any).camisa || "",
              hasteComprimento: (ordem as any).haste_comprimento || "",
              curso: (ordem as any).curso || "",
              conexaoA: (ordem as any).conexao_a || "",
              conexaoB: (ordem as any).conexao_b || "",
              temperaturaTrabalho: (ordem as any).temperatura_trabalho || "",
              fluidoTrabalho: (ordem as any).fluido_trabalho || "",
              localInstalacao: (ordem as any).local_instalacao || "",
              potencia: (ordem as any).potencia || "",
              numeroSerie: (ordem as any).numero_serie || ""
            });

            // Carregar peças
            if (ordem.pecas_necessarias && Array.isArray(ordem.pecas_necessarias)) {
              console.log('Carregando peças:', ordem.pecas_necessarias);
              setPecasUtilizadas(ordem.pecas_necessarias as any);
            }

            // Carregar serviços
            if (ordem.servicos_necessarios && Array.isArray(ordem.servicos_necessarios)) {
              console.log('Carregando serviços:', ordem.servicos_necessarios);
              const servicosObj: any = {};
              const quantidades: any = {};
              const nomes: any = {};
              let personalizado = "";
              const adicionais: Array<{ quantidade: number; nome: string; codigo?: string }> = [];
              
              ordem.servicos_necessarios.forEach((servico: any) => {
                if (servico.tipo === 'personalizado') {
                  personalizado = servico.descricao || servico.servico;
                  quantidades.personalizado = servico.quantidade || 1;
                } else if (servico.tipo === 'adicional') {
                  adicionais.push({
                    quantidade: servico.quantidade || 1,
                    nome: servico.descricao || servico.servico,
                    codigo: servico.codigo || ""
                  });
                } else if (servico.tipo) {
                  servicosObj[servico.tipo] = true;
                  quantidades[servico.tipo] = servico.quantidade || 1;
                  if (servico.descricao) {
                    nomes[servico.tipo] = servico.descricao;
                  }
                }
              });
              
              setServicosPreDeterminados(prev => ({ ...prev, ...servicosObj }));
              setServicosQuantidades(prev => ({ ...prev, ...quantidades }));
              setServicosNomes(prev => ({ ...prev, ...nomes }));
              setServicosPersonalizados(personalizado);
              setServicosAdicionais(adicionais);
            }

            // Carregar usinagem
            if (ordem.usinagem_necessaria && Array.isArray(ordem.usinagem_necessaria)) {
              console.log('Carregando usinagem:', ordem.usinagem_necessaria);
              const usinagemObj: any = {};
              const quantidades: any = {};
              const nomes: any = {};
              let personalizada = "";
              const adicionais: Array<{ quantidade: number; nome: string; codigo?: string }> = [];
              
              ordem.usinagem_necessaria.forEach((usinag: any) => {
                if (usinag.tipo === 'personalizada') {
                  personalizada = usinag.descricao || usinag.trabalho;
                  quantidades.personalizada = usinag.quantidade || 1;
                } else if (usinag.tipo === 'adicional') {
                  adicionais.push({
                    quantidade: usinag.quantidade || 1,
                    nome: usinag.descricao || usinag.trabalho,
                    codigo: usinag.codigo || ""
                  });
                } else if (usinag.tipo) {
                  usinagemObj[usinag.tipo] = true;
                  quantidades[usinag.tipo] = usinag.quantidade || 1;
                  if (usinag.descricao) {
                    nomes[usinag.tipo] = usinag.descricao;
                  }
                }
              });
              
              setUsinagem(prev => ({ ...prev, ...usinagemObj }));
              setUsinagemQuantidades(prev => ({ ...prev, ...quantidades }));
              setUsinagemNomes(prev => ({ ...prev, ...nomes }));
              setUsinagemPersonalizada(personalizada);
              setUsinagemAdicional(adicionais);
            }

            // Carregar fotos da ordem (não do recebimento)
            const { data: fotos } = await supabase
              .from('fotos_equipamentos')
              .select('*')
              .eq('ordem_servico_id', ordem.id);
              
            if (fotos && fotos.length > 0) {
              console.log('Carregando fotos da ordem:', fotos);
              
              // Usar Set para URLs únicas
              const fotosChegadaUrls = [...new Set(
                fotos
                  .filter(foto => foto.apresentar_orcamento === true)
                  .map(foto => foto.arquivo_url)
              )];
              
              const fotosAnaliseUrls = [...new Set(
                fotos
                  .filter(foto => foto.apresentar_orcamento === false)
                  .map(foto => foto.arquivo_url)
              )];
                
              if (fotosChegadaUrls.length > 0) {
                setPreviewsChegada(fotosChegadaUrls);
                setFotosChegada(fotosChegadaUrls as any);
              }
              
              if (fotosAnaliseUrls.length > 0) {
                // Limitar a 20 fotos
                const limitedFotos = fotosAnaliseUrls.slice(0, 20);
                if (fotosAnaliseUrls.length > 20) {
                  console.warn(`⚠️ ${fotosAnaliseUrls.length} fotos encontradas, exibindo apenas 20`);
                }
                setPreviewsAnalise(limitedFotos);
                setFotosAnalise(limitedFotos as any);
              }
            }

            // Carregar documentos técnicos
            const { data: documentos } = await supabase
              .from('documentos_ordem')
              .select('*')
              .eq('ordem_servico_id', ordem.id);
              
            if (documentos && documentos.length > 0) {
              console.log('Documentos técnicos encontrados:', documentos.length);
              setDocumentosPdf(documentos);
            }
          return true; // ✅ Ordem encontrada e carregada
        }
        
        console.log('⚠️ Ordem de serviço não encontrada');
        return false; // ❌ Ordem não encontrada
      } catch (error) {
        console.error('❌ Erro ao carregar ordem para edição:', error);
        return false;
      }
    };

    // ✅ Executar verificação: primeiro ordem, depois recebimento
    loadOrderForEdit().then(encontrouOrdem => {
      if (encontrouOrdem) {
        console.log('✅ Processamento concluído: MODO EDIÇÃO');
        return;
      }
      
      // ❌ Não encontrou ordem - buscar recebimento para MODO CRIAÇÃO
      console.log('🔎 Ordem não encontrada, buscando recebimento:', decodedId);
      const recebimentoEncontrado = recebimentos.find((r: any) => 
        r.numero_ordem === decodedId || 
        r.id?.toString() === decodedId
      );
      
      console.log('Recebimento encontrado:', recebimentoEncontrado);
      
      if (recebimentoEncontrado) {
        console.log('✅ Recebimento encontrado - MODO CRIAÇÃO');
        setRecebimento({
          id: recebimentoEncontrado.id,
          cliente_nome: recebimentoEncontrado.cliente_nome,
          tipo_equipamento: recebimentoEncontrado.tipo_equipamento,
          data_entrada: recebimentoEncontrado.data_entrada,
          dataEntrada: new Date(recebimentoEncontrado.data_entrada).toLocaleDateString('pt-BR'),
          numeroOrdem: recebimentoEncontrado.numero_ordem,
          nota_fiscal: recebimentoEncontrado.nota_fiscal,
          numero_serie: recebimentoEncontrado.numero_serie,
          fotos: (recebimentoEncontrado as any).fotos_equipamentos || []
        });
        
        // Carregar dados técnicos do recebimento
        console.log('📊 Carregando dados técnicos do recebimento:', {
          camisa: (recebimentoEncontrado as any).camisa,
          haste_comprimento: (recebimentoEncontrado as any).haste_comprimento,
          curso: (recebimentoEncontrado as any).curso,
          conexao_a: (recebimentoEncontrado as any).conexao_a,
          conexao_b: (recebimentoEncontrado as any).conexao_b
        });
        
        setDadosTecnicos({
          tipoEquipamento: recebimentoEncontrado.tipo_equipamento || "",
          pressaoTrabalho: (recebimentoEncontrado as any).pressao_trabalho || "",
          camisa: (recebimentoEncontrado as any).camisa || "",
          hasteComprimento: (recebimentoEncontrado as any).haste_comprimento || "",
          curso: (recebimentoEncontrado as any).curso || "",
          conexaoA: (recebimentoEncontrado as any).conexao_a || "",
          conexaoB: (recebimentoEncontrado as any).conexao_b || "",
          temperaturaTrabalho: (recebimentoEncontrado as any).temperatura_trabalho || "",
          fluidoTrabalho: (recebimentoEncontrado as any).fluido_trabalho || "",
          localInstalacao: (recebimentoEncontrado as any).local_instalacao || "",
          potencia: (recebimentoEncontrado as any).potencia || "",
          numeroSerie: (recebimentoEncontrado as any).numero_serie || ""
        });
        
        // Carregar fotos do recebimento separando por tipo
        if (recebimentoEncontrado.fotos && recebimentoEncontrado.fotos.length > 0) {
          console.log('Carregando fotos do recebimento:', recebimentoEncontrado.fotos);
          
          // Fotos de chegada (apresentar_orcamento = true)
          const fotosChegadaUrls = recebimentoEncontrado.fotos
            .filter((foto: any) => foto.apresentar_orcamento === true)
            .map((foto: any) => foto.arquivo_url);
          
          if (fotosChegadaUrls.length > 0) {
            console.log('✅ Fotos de CHEGADA carregadas:', fotosChegadaUrls.length, fotosChegadaUrls);
            setPreviewsChegada(fotosChegadaUrls);
            setFotosChegada(fotosChegadaUrls as any);
          }
          
          // Fotos de análise (apresentar_orcamento = false)
          const fotosAnaliseUrls = recebimentoEncontrado.fotos
            .filter((foto: any) => foto.apresentar_orcamento === false)
            .map((foto: any) => foto.arquivo_url);
          
          if (fotosAnaliseUrls.length > 0) {
            console.log('✅ Fotos de ANÁLISE carregadas:', fotosAnaliseUrls.length, fotosAnaliseUrls);
            setPreviewsAnalise(fotosAnaliseUrls);
            setFotosAnalise(fotosAnaliseUrls as any);
          }
        }
      } else {
        console.log('⚠️ Recebimento não encontrado para ID:', decodedId);
      }
    });
  }, [id, recebimentos, loading]);

  // Handler para upload de documentos técnicos
  const handleDocumentoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: Array<{ file: File; nome: string; tipo: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tipo = file.type;
      if (
        tipo.includes('pdf') || tipo.includes('spreadsheet') || tipo.includes('excel') ||
        tipo.includes('word') || tipo.includes('document') ||
        file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
        file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')
      ) {
        newDocs.push({ file, nome: file.name, tipo: tipo || 'application/octet-stream' });
      } else {
        toast({
          title: "Formato não suportado",
          description: `O arquivo ${file.name} não é um documento válido (PDF, Excel, Word)`,
          variant: "destructive",
        });
      }
    }
    setNovosDocumentos(prev => [...prev, ...newDocs]);
    // Reset input
    e.target.value = '';
  };

  const handleRemoverDocumentoExistente = async (docId: string) => {
    try {
      await supabase.from('documentos_ordem').delete().eq('id', docId);
      setDocumentosPdf(prev => prev.filter(d => d.id !== docId));
      toast({ title: "Documento removido" });
    } catch (error) {
      console.error('Erro ao remover documento:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // BLOQUEAR submissão dupla
    if (submittingRef.current || isSaving) {
      console.log('⚠️ Submissão bloqueada - já está salvando');
      return;
    }
    
    submittingRef.current = true;
    setIsSaving(true);
    
    console.log('=== HANDLESUBMIT CHAMADO ===');
    console.log('isEdicao:', isEdicao);
    console.log('ordemExistente:', ordemExistente);
    console.log('Iniciando salvamento da análise...');
    console.log('Serviços pré-determinados:', servicosPreDeterminados);
    console.log('Serviços personalizados:', servicosPersonalizados);
    console.log('Usinagem:', usinagem);
    console.log('Usinagem personalizada:', usinagemPersonalizada);
    console.log('Peças utilizadas:', pecasUtilizadas);
    console.log('Fotos chegada:', fotosChegada);
    console.log('Fotos análise:', fotosAnalise);
    
    try {
      // Preparar dados dos serviços selecionados
      const servicosSelecionados = Object.entries(servicosPreDeterminados)
        .filter(([_, selecionado]) => selecionado)
        .map(([servico, _]) => ({
          quantidade: servicosQuantidades[servico as keyof typeof servicosQuantidades],
          servico: servicosNomes[servico as keyof typeof servicosNomes],
          descricao: servicosNomes[servico as keyof typeof servicosNomes],
          tipo: servico,
          codigo: (servicosQuantidades as any)[`${servico}_codigo`] || ""
        }));

      // Adicionar serviços personalizados se existirem
      if (servicosPersonalizados.trim()) {
        servicosSelecionados.push({
          quantidade: servicosQuantidades.personalizado,
          servico: servicosPersonalizados.trim(),
          descricao: servicosPersonalizados.trim(),
          tipo: 'personalizado',
          codigo: (servicosQuantidades as any).personalizado_codigo || ""
        });
      }

      // Adicionar serviços adicionais
      servicosAdicionais.forEach((servico) => {
        servicosSelecionados.push({
          quantidade: servico.quantidade,
          servico: servico.nome,
          descricao: servico.nome,
          tipo: 'adicional',
          codigo: servico.codigo || ""
        });
      });

      console.log('Serviços selecionados preparados:', servicosSelecionados);

      // Preparar dados das usinagens selecionadas
      const usinagemSelecionada = Object.entries(usinagem)
        .filter(([_, selecionado]) => selecionado)
        .map(([tipo, _]) => ({
          quantidade: usinagemQuantidades[tipo as keyof typeof usinagemQuantidades],
          trabalho: usinagemNomes[tipo as keyof typeof usinagemNomes],
          descricao: usinagemNomes[tipo as keyof typeof usinagemNomes],
          tipo: tipo,
          codigo: (usinagemQuantidades as any)[`${tipo}_codigo`] || ""
        }));

      // Adicionar usinagem personalizada se existir
      if (usinagemPersonalizada.trim()) {
        usinagemSelecionada.push({
          quantidade: usinagemQuantidades.personalizada,
          trabalho: usinagemPersonalizada.trim(),
          descricao: usinagemPersonalizada.trim(),
          tipo: 'personalizada',
          codigo: (usinagemQuantidades as any).personalizada_codigo || ""
        });
      }

      // Adicionar usinagem adicional
      usinagemAdicional.forEach((usinag) => {
        usinagemSelecionada.push({
          quantidade: usinag.quantidade,
          trabalho: usinag.nome,
          descricao: usinag.nome,
          tipo: 'adicional',
          codigo: usinag.codigo || ""
        });
      });

      console.log('Usinagem selecionada preparada:', usinagemSelecionada);
      console.log('Peças utilizadas:', pecasUtilizadas);

      let ordemId = ordemExistente?.id;

      if (isEdicao && ordemExistente) {
        console.log('Atualizando ordem existente:', ordemExistente.id);
        // Atualizar ordem existente
        const { data: ordemAtualizada, error } = await supabase
          .from('ordens_servico')
          .update({
            tecnico: formData.tecnico,
            tipo_problema: formData.problemas,
            descricao_problema: formData.problemas,
            solucao_proposta: servicosPersonalizados,
            pecas_necessarias: pecasUtilizadas,
            servicos_necessarios: servicosSelecionados,
            usinagem_necessaria: usinagemSelecionada,
            tempo_estimado: formData.prazoEstimado,
            observacoes_tecnicas: formData.observacoes,
            motivo_falha: formData.motivoFalha === 'outros' ? formData.motivoFalhaOutro : (formData.motivoFalha === 'revisao_completa' ? 'Revisão Completa' : formData.motivoFalha === 'haste_quebrada' ? 'Haste Quebrada' : formData.motivoFalha === 'vazamento_vedacoes' ? 'Vazamento nas Vedações' : formData.motivoFalha) || null,
            prioridade: formData.prioridade.toLowerCase(),
            data_analise: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Salvar dados técnicos diretamente na ordem
            equipamento: dadosTecnicos.tipoEquipamento || ordemExistente.equipamento,
            camisa: dadosTecnicos.camisa || null,
            haste_comprimento: dadosTecnicos.hasteComprimento || null,
            curso: dadosTecnicos.curso || null,
            conexao_a: dadosTecnicos.conexaoA || null,
            conexao_b: dadosTecnicos.conexaoB || null,
            pressao_trabalho: dadosTecnicos.pressaoTrabalho || null,
            temperatura_trabalho: dadosTecnicos.temperaturaTrabalho || null,
            fluido_trabalho: dadosTecnicos.fluidoTrabalho || null,
            local_instalacao: dadosTecnicos.localInstalacao || null,
            potencia: dadosTecnicos.potencia || null,
            numero_serie: dadosTecnicos.numeroSerie || null
          })
          .eq('id', ordemExistente.id)
          .select()
          .single();

        if (error) {
          console.error('Erro ao atualizar ordem:', error);
          throw error;
        }
        console.log('Ordem atualizada:', ordemAtualizada);

        // Atualizar dados técnicos (peritagem) no recebimento
        let recebimentoId = null;
        
        // Tentar obter recebimentoId de várias fontes
        if (recebimento?.id) {
          recebimentoId = recebimento.id;
        } else if (ordemExistente?.recebimento_id) {
          recebimentoId = ordemExistente.recebimento_id;
        } else if (ordemExistente?.recebimentos?.id) {
          recebimentoId = ordemExistente.recebimentos.id;
        }
        
        console.log('=== SALVAMENTO DE DADOS TÉCNICOS ===');
        console.log('recebimentoId encontrado:', recebimentoId);
        console.log('Dados técnicos a salvar:', dadosTecnicos);
        
        if (recebimentoId) {
          const { data: updatedRecebimento, error: recebimentoError } = await supabase
            .from('recebimentos')
            .update({
              tipo_equipamento: dadosTecnicos.tipoEquipamento,
              pressao_trabalho: dadosTecnicos.pressaoTrabalho || null,
              temperatura_trabalho: dadosTecnicos.temperaturaTrabalho || null,
              fluido_trabalho: dadosTecnicos.fluidoTrabalho || null,
              local_instalacao: dadosTecnicos.localInstalacao || null,
              potencia: dadosTecnicos.potencia || null,
              numero_serie: dadosTecnicos.numeroSerie || null,
              camisa: dadosTecnicos.camisa || null,
              haste_comprimento: dadosTecnicos.hasteComprimento || null,
              curso: dadosTecnicos.curso || null,
              conexao_a: dadosTecnicos.conexaoA || null,
              conexao_b: dadosTecnicos.conexaoB || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', recebimentoId)
            .select();
          
          if (recebimentoError) {
            console.error('❌ Erro ao atualizar recebimento:', recebimentoError);
          } else {
            console.log('✅ Dados técnicos do recebimento atualizados com sucesso!', updatedRecebimento);
          }
        } else {
          console.warn('⚠️ Ordem sem recebimento vinculado - dados técnicos não salvos na tabela recebimentos');
          console.log('Esta é uma ordem criada diretamente (sem nota fiscal)');
        }
      } else {
        console.log('Criando nova ordem...');
        
        // Verificar se já existe uma ordem para este recebimento
        if (recebimento?.id) {
          const { data: ordemExistenteParaRecebimento } = await supabase
            .from('ordens_servico')
            .select('*')
            .eq('recebimento_id', recebimento.id)
            .maybeSingle();
          
          if (ordemExistenteParaRecebimento) {
            console.log('Já existe uma ordem para este recebimento, atualizando...', ordemExistenteParaRecebimento.id);
            // Atualizar a ordem existente ao invés de criar uma nova
            const { data: ordemAtualizada, error } = await supabase
              .from('ordens_servico')
              .update({
                tecnico: formData.tecnico,
                tipo_problema: formData.problemas,
                descricao_problema: formData.problemas,
                solucao_proposta: servicosPersonalizados,
                pecas_necessarias: pecasUtilizadas,
                servicos_necessarios: servicosSelecionados,
                usinagem_necessaria: usinagemSelecionada,
                tempo_estimado: formData.prazoEstimado,
                observacoes_tecnicas: formData.observacoes,
                prioridade: formData.prioridade.toLowerCase(),
                data_analise: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                // Salvar dados técnicos diretamente na ordem
                equipamento: dadosTecnicos.tipoEquipamento || '',
                camisa: dadosTecnicos.camisa || null,
                haste_comprimento: dadosTecnicos.hasteComprimento || null,
                curso: dadosTecnicos.curso || null,
                conexao_a: dadosTecnicos.conexaoA || null,
                conexao_b: dadosTecnicos.conexaoB || null,
                pressao_trabalho: dadosTecnicos.pressaoTrabalho || null,
                temperatura_trabalho: dadosTecnicos.temperaturaTrabalho || null,
                fluido_trabalho: dadosTecnicos.fluidoTrabalho || null,
                local_instalacao: dadosTecnicos.localInstalacao || null,
                potencia: dadosTecnicos.potencia || null,
                numero_serie: dadosTecnicos.numeroSerie || null
              })
              .eq('id', ordemExistenteParaRecebimento.id)
              .select()
              .single();

            if (error) {
              console.error('Erro ao atualizar ordem existente:', error);
              throw error;
            }
            ordemId = ordemAtualizada.id;
            console.log('Ordem existente atualizada com ID:', ordemId);
            
            // Atualizar dados técnicos do recebimento
            console.log('=== SALVAMENTO DE DADOS TÉCNICOS (criação/atualização de ordem) ===');
            console.log('Dados técnicos a salvar:', dadosTecnicos);
            const { data: updatedRecebimento, error: recebimentoError } = await supabase
              .from('recebimentos')
              .update({
                tipo_equipamento: dadosTecnicos.tipoEquipamento,
                pressao_trabalho: dadosTecnicos.pressaoTrabalho || null,
                temperatura_trabalho: dadosTecnicos.temperaturaTrabalho || null,
                fluido_trabalho: dadosTecnicos.fluidoTrabalho || null,
                local_instalacao: dadosTecnicos.localInstalacao || null,
                potencia: dadosTecnicos.potencia || null,
                numero_serie: dadosTecnicos.numeroSerie || null,
                camisa: dadosTecnicos.camisa || null,
                haste_comprimento: dadosTecnicos.hasteComprimento || null,
                curso: dadosTecnicos.curso || null,
                conexao_a: dadosTecnicos.conexaoA || null,
                conexao_b: dadosTecnicos.conexaoB || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', recebimento.id)
              .select();
            
            if (recebimentoError) {
              console.error('❌ Erro ao atualizar recebimento:', recebimentoError);
            } else {
              console.log('✅ Dados técnicos do recebimento atualizados com sucesso!', updatedRecebimento);
            }
          } else {
            // Criar nova ordem - usar o número do recebimento no formato MH-XXX-YY
            // Usar numeroOrdem (camelCase) que é como está armazenado no estado
            const numeroOrdem = recebimento.numeroOrdem || recebimento.numero_ordem;
            
            const { data: novaOrdem, error } = await supabase
              .from('ordens_servico')
              .insert({
                recebimento_id: recebimento.id,
                numero_ordem: numeroOrdem,
                cliente_nome: recebimento.cliente_nome || '',
                equipamento: dadosTecnicos.tipoEquipamento || recebimento.tipo_equipamento || '',
                tecnico: formData.tecnico,
                data_entrada: recebimento.data_entrada || new Date().toISOString(),
                data_analise: new Date().toISOString(),
                status: 'em_andamento',
                prioridade: formData.prioridade.toLowerCase(),
                tipo_problema: formData.problemas,
                descricao_problema: formData.problemas,
                solucao_proposta: servicosPersonalizados,
                pecas_necessarias: pecasUtilizadas,
                servicos_necessarios: servicosSelecionados,
                usinagem_necessaria: usinagemSelecionada,
                tempo_estimado: formData.prazoEstimado,
                observacoes_tecnicas: formData.observacoes,
                motivo_falha: formData.motivoFalha === 'outros' ? formData.motivoFalhaOutro : (formData.motivoFalha === 'revisao_completa' ? 'Revisão Completa' : formData.motivoFalha === 'haste_quebrada' ? 'Haste Quebrada' : formData.motivoFalha === 'vazamento_vedacoes' ? 'Vazamento nas Vedações' : formData.motivoFalha) || null,
                empresa_id: empresaAtual?.id || null,
                // Salvar dados técnicos na ordem também
                camisa: dadosTecnicos.camisa || null,
                haste_comprimento: dadosTecnicos.hasteComprimento || null,
                curso: dadosTecnicos.curso || null,
                conexao_a: dadosTecnicos.conexaoA || null,
                conexao_b: dadosTecnicos.conexaoB || null,
                pressao_trabalho: dadosTecnicos.pressaoTrabalho || null,
                temperatura_trabalho: dadosTecnicos.temperaturaTrabalho || null,
                fluido_trabalho: dadosTecnicos.fluidoTrabalho || null,
                local_instalacao: dadosTecnicos.localInstalacao || null,
                potencia: dadosTecnicos.potencia || null,
                numero_serie: dadosTecnicos.numeroSerie || null
              })
              .select()
              .single();

            if (error) {
              console.error('Erro ao criar ordem:', error);
              throw error;
            }
            ordemId = novaOrdem.id;
            console.log('Nova ordem criada com ID:', ordemId);
            
            // Atualizar dados técnicos do recebimento
            console.log('=== SALVAMENTO DE DADOS TÉCNICOS (nova ordem) ===');
            console.log('Dados técnicos a salvar:', dadosTecnicos);
            const { data: updatedRecebimento, error: recebimentoError } = await supabase
              .from('recebimentos')
              .update({
                tipo_equipamento: dadosTecnicos.tipoEquipamento,
                pressao_trabalho: dadosTecnicos.pressaoTrabalho || null,
                temperatura_trabalho: dadosTecnicos.temperaturaTrabalho || null,
                fluido_trabalho: dadosTecnicos.fluidoTrabalho || null,
                local_instalacao: dadosTecnicos.localInstalacao || null,
                potencia: dadosTecnicos.potencia || null,
                numero_serie: dadosTecnicos.numeroSerie || null,
                camisa: dadosTecnicos.camisa || null,
                haste_comprimento: dadosTecnicos.hasteComprimento || null,
                curso: dadosTecnicos.curso || null,
                conexao_a: dadosTecnicos.conexaoA || null,
                conexao_b: dadosTecnicos.conexaoB || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', recebimento.id)
              .select();
            
            if (recebimentoError) {
              console.error('❌ Erro ao atualizar recebimento:', recebimentoError);
            } else {
              console.log('✅ Dados técnicos do recebimento atualizados com sucesso!', updatedRecebimento);
            }
          }
        }
      }

      // Upload de fotos de chegada (com flag apresentar_orcamento)
      console.log('=== INICIANDO PROCESSAMENTO DE FOTOS DE CHEGADA ===');
      console.log('fotosChegada array:', fotosChegada);
      console.log('previewsChegada array:', previewsChegada);
      
      // Definir IDs para vincular fotos - usar recebimento_id se disponível, senão ordem_servico_id
      const fotoRecebimentoId = recebimento?.id || null;
      const fotoOrdemId = ordemExistente?.id || ordemId;
      const hasValidFotoOwner = fotoRecebimentoId || fotoOrdemId;
      
      console.log('IDs para fotos:', { fotoRecebimentoId, fotoOrdemId, hasValidFotoOwner });
      
      // Se for edição, primeiro remover fotos de chegada antigas que não estão mais presentes
      if (isEdicao && hasValidFotoOwner) {
        // Obter URLs atuais de fotos de chegada - apenas URLs válidas do Supabase
        const urlsAtuais = previewsChegada.filter(url => 
          url && typeof url === 'string' && url.startsWith('https://')
        );
        console.log('URLs atuais de fotos de CHEGADA:', urlsAtuais.length, urlsAtuais);
        
        // Buscar fotos de chegada existentes no banco - por recebimento OU ordem
        let queryChegada = supabase
          .from('fotos_equipamentos')
          .select('id, arquivo_url, apresentar_orcamento')
          .eq('apresentar_orcamento', true);
        
        if (fotoRecebimentoId) {
          queryChegada = queryChegada.eq('recebimento_id', fotoRecebimentoId);
        } else if (fotoOrdemId) {
          queryChegada = queryChegada.eq('ordem_servico_id', fotoOrdemId);
        }
        
        const { data: fotosExistentes } = await queryChegada;
        
        console.log('Fotos de CHEGADA existentes no banco:', fotosExistentes);
        
        // Deletar fotos que não estão mais nas previews atuais
        if (fotosExistentes) {
          for (const fotoExistente of fotosExistentes) {
            if (!urlsAtuais.includes(fotoExistente.arquivo_url)) {
              await supabase
                .from('fotos_equipamentos')
                .delete()
                .eq('id', fotoExistente.id);
              console.log(`❌ Foto de CHEGADA removida do banco: ${fotoExistente.arquivo_url}`);
            } else {
              console.log(`✅ Foto de CHEGADA mantida: ${fotoExistente.arquivo_url}`);
            }
          }
        }
      }
      
      // Upload de novas fotos de chegada
      for (let i = 0; i < fotosChegada.length; i++) {
        const foto = fotosChegada[i];
        if (foto && hasValidFotoOwner) {
          // Verificar se é um arquivo novo (File) ou URL existente (string)
          if (typeof foto !== 'string' && foto instanceof File) {
            console.log(`Verificando foto de chegada ${i + 1}...`);
            try {
              const idForFilename = fotoRecebimentoId || fotoOrdemId;
              
              // IMPORTANTE: Verificar se já existe uma foto com esse índice no banco
              // Isso evita fazer upload duplicado quando a foto já foi salva anteriormente
              const padraoBusca = `${idForFilename}_chegada_${i}_`;
              let queryExistente = supabase
                .from('fotos_equipamentos')
                .select('id, arquivo_url')
                .eq('apresentar_orcamento', true)
                .like('arquivo_url', `%${padraoBusca}%`);
              
              if (fotoRecebimentoId) {
                queryExistente = queryExistente.eq('recebimento_id', fotoRecebimentoId);
              } else if (fotoOrdemId) {
                queryExistente = queryExistente.eq('ordem_servico_id', fotoOrdemId);
              }
              
              const { data: fotoJaExiste } = await queryExistente.maybeSingle();
              
              if (fotoJaExiste) {
                console.log(`✅ Foto de chegada ${i + 1} já existe no índice ${i}, pulando upload:`, fotoJaExiste.arquivo_url);
                continue;
              }
              
              console.log(`📤 Fazendo upload da foto de chegada ${i + 1}...`);
              const fileExt = foto.name.split('.').pop();
              const fileName = `${idForFilename}_chegada_${i}_${Date.now()}.${fileExt}`;
              const filePath = `${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('equipamentos')
                .upload(filePath, foto);

              if (uploadError) {
                console.error('Erro no upload da foto de chegada:', uploadError);
                continue;
              }

              const { data: { publicUrl } } = supabase.storage
                .from('equipamentos')
                .getPublicUrl(filePath);

              // Salvar foto com apresentar_orcamento = true
              // Usar recebimento_id se disponível, senão usar ordem_servico_id
              await supabase
                .from('fotos_equipamentos')
                .insert({
                  recebimento_id: fotoRecebimentoId || null,
                  ordem_servico_id: fotoRecebimentoId ? null : fotoOrdemId,
                  arquivo_url: publicUrl,
                  nome_arquivo: fileName,
                  apresentar_orcamento: true,
                  empresa_id: empresaAtual?.id || null
                });
              
              console.log(`✅ Foto de chegada ${i + 1} salva com apresentar_orcamento = true`);
            } catch (error) {
              console.error('Erro ao processar foto de chegada:', error);
            }
          } else {
            console.log(`Foto de chegada ${i + 1} já existe (URL):`, foto);
          }
        }
      }

      // Upload de fotos de análise
      console.log('=== INICIANDO PROCESSAMENTO DE FOTOS DE ANÁLISE ===');
      console.log('fotosAnalise array:', fotosAnalise);
      console.log('previewsAnalise array:', previewsAnalise);
      
      // Se for edição, primeiro remover fotos de análise antigas que não estão mais presentes
      if (isEdicao && hasValidFotoOwner) {
        // Obter URLs atuais de fotos de análise - apenas URLs válidas do Supabase
        const urlsAtuais = previewsAnalise.filter(url => 
          url && typeof url === 'string' && url.startsWith('https://')
        );
        console.log('URLs atuais de fotos de ANÁLISE:', urlsAtuais.length, urlsAtuais);
        
        // Buscar fotos de análise existentes no banco - por recebimento OU ordem
        let queryAnalise = supabase
          .from('fotos_equipamentos')
          .select('id, arquivo_url, apresentar_orcamento')
          .eq('apresentar_orcamento', false);
        
        if (fotoRecebimentoId) {
          queryAnalise = queryAnalise.eq('recebimento_id', fotoRecebimentoId);
        } else if (fotoOrdemId) {
          queryAnalise = queryAnalise.eq('ordem_servico_id', fotoOrdemId);
        }
        
        const { data: fotosExistentes } = await queryAnalise;
        
        console.log('Fotos de ANÁLISE existentes no banco:', fotosExistentes);
        
        // Deletar fotos que não estão mais nas previews atuais
        if (fotosExistentes) {
          for (const fotoExistente of fotosExistentes) {
            if (!urlsAtuais.includes(fotoExistente.arquivo_url)) {
              await supabase
                .from('fotos_equipamentos')
                .delete()
                .eq('id', fotoExistente.id);
              console.log(`❌ Foto de ANÁLISE removida do banco: ${fotoExistente.arquivo_url}`);
            } else {
              console.log(`✅ Foto de ANÁLISE mantida: ${fotoExistente.arquivo_url}`);
            }
          }
        }
      }
      
      // Upload de novas fotos de análise
      for (let i = 0; i < fotosAnalise.length; i++) {
        const foto = fotosAnalise[i];
        if (foto && hasValidFotoOwner) {
          // Verificar se é um arquivo novo (File) ou URL existente (string)
          if (typeof foto !== 'string' && foto instanceof File) {
            console.log(`Verificando foto de análise ${i + 1}...`);
            try {
              const idForFilename = fotoRecebimentoId || fotoOrdemId;
              
              // IMPORTANTE: Verificar se já existe uma foto com esse índice no banco
              // Isso evita fazer upload duplicado quando a foto já foi salva anteriormente
              const padraoBusca = `${idForFilename}_analise_${i}_`;
              let queryExistente = supabase
                .from('fotos_equipamentos')
                .select('id, arquivo_url')
                .eq('apresentar_orcamento', false)
                .like('arquivo_url', `%${padraoBusca}%`);
              
              if (fotoRecebimentoId) {
                queryExistente = queryExistente.eq('recebimento_id', fotoRecebimentoId);
              } else if (fotoOrdemId) {
                queryExistente = queryExistente.eq('ordem_servico_id', fotoOrdemId);
              }
              
              const { data: fotoJaExiste } = await queryExistente.maybeSingle();
              
              if (fotoJaExiste) {
                console.log(`✅ Foto de análise ${i + 1} já existe no índice ${i}, pulando upload:`, fotoJaExiste.arquivo_url);
                continue;
              }
              
              console.log(`📤 Fazendo upload da foto de análise ${i + 1}...`);
              const fileExt = foto.name.split('.').pop();
              const fileName = `${idForFilename}_analise_${i}_${Date.now()}.${fileExt}`;
              const filePath = `${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('equipamentos')
                .upload(filePath, foto);

              if (uploadError) {
                console.error('Erro no upload da foto de análise:', uploadError);
                continue;
              }

              const { data: { publicUrl } } = supabase.storage
                .from('equipamentos')
                .getPublicUrl(filePath);

              // Usar recebimento_id se disponível, senão usar ordem_servico_id
              await supabase
                .from('fotos_equipamentos')
                .insert({
                  recebimento_id: fotoRecebimentoId || null,
                  ordem_servico_id: fotoRecebimentoId ? null : fotoOrdemId,
                  arquivo_url: publicUrl,
                  nome_arquivo: fileName,
                  apresentar_orcamento: false,
                  empresa_id: empresaAtual?.id || null
                });
              
              console.log(`✅ Foto de análise ${i + 1} salva com sucesso!`);
            } catch (error) {
              console.error('Erro ao processar foto de análise:', error);
            }
          } else {
            console.log(`Foto de análise ${i + 1} já existe (URL):`, foto);
          }
        }
      }

      // Upload de novos documentos técnicos
      if (novosDocumentos.length > 0) {
        const ordemIdParaDoc = ordemExistente?.id || null;
        if (ordemIdParaDoc) {
          console.log(`=== UPLOAD DE ${novosDocumentos.length} DOCUMENTOS TÉCNICOS ===`);
          for (let i = 0; i < novosDocumentos.length; i++) {
            const documento = novosDocumentos[i];
            try {
              const timestamp = Date.now();
              const fileName = `${ordemIdParaDoc}_${timestamp}_${i}_${documento.file.name}`;

              const { error: uploadError } = await supabase.storage
                .from('documentos-tecnicos')
                .upload(fileName, documento.file);

              if (uploadError) {
                console.error(`Erro no upload do documento ${documento.file.name}:`, uploadError);
                continue;
              }

              const { data: urlData } = supabase.storage
                .from('documentos-tecnicos')
                .getPublicUrl(fileName);

              const { error: dbError } = await supabase
                .from('documentos_ordem')
                .insert({
                  ordem_servico_id: ordemIdParaDoc,
                  arquivo_url: urlData.publicUrl,
                  nome_arquivo: documento.file.name,
                  tipo_arquivo: documento.tipo,
                  tamanho_bytes: documento.file.size,
                  empresa_id: empresaAtual?.id || null
                });

              if (dbError) {
                console.error(`Erro ao salvar documento no banco:`, dbError);
                continue;
              }

              console.log(`✅ Documento ${i + 1}/${novosDocumentos.length} salvo: ${documento.file.name}`);
            } catch (error) {
              console.error(`Erro ao processar documento ${documento.file.name}:`, error);
            }
          }
        }
      }

      console.log('Salvamento completo!');
      toast({
        title: isEdicao ? t('novaAnalise.orderUpdated') : t('novaAnalise.orderCreated'),
        description: isEdicao ? t('novaAnalise.orderUpdatedDesc') : t('novaAnalise.orderCreatedDesc'),
      });

      navigate('/analise');
    } catch (error) {
      console.error('Erro ao salvar ordem de serviço:', error);
      toast({
        title: t('novaAnalise.error'),
        description: t('novaAnalise.errorSaving'),
        variant: "destructive",
      });
    } finally {
      submittingRef.current = false;
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <p>{t('novaAnalise.loading')}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!recebimento) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <p>{t('novaAnalise.notFound')}</p>
              <Button onClick={() => navigate('/recebimentos')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('novaAnalise.backToReceipts')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/recebimentos')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('novaAnalise.back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdicao ? t('novaAnalise.editPageTitle') : t('novaAnalise.pageTitle')}
          </h1>
          <p className="text-muted-foreground">
            {isEdicao ? t('novaAnalise.editingFor') : t('novaAnalise.creatingFor')} {recebimento.equipamento} - {recebimento.cliente}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📋 {t('novaAnalise.basicInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('novaAnalise.client')}</Label>
                  <p className="font-semibold text-primary">{recebimento.cliente_nome}</p>
                  {recebimento.cliente_cnpj && (
                    <p className="text-sm text-muted-foreground">{recebimento.cliente_cnpj}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('novaAnalise.entryDate')}</Label>
                  <p className="font-medium">{recebimento.dataEntrada}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('novaAnalise.invoice')}</Label>
                  <p className="font-medium">{recebimento.nota_fiscal || t('novaAnalise.notInformed')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('novaAnalise.orderNumber')}</Label>
                  <p className="font-medium">{recebimento.numeroOrdem}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('novaAnalise.equipmentType')}</Label>
                  <p className="font-medium">{recebimento.equipamento}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('novaAnalise.serialNumber')}</Label>
                  <p className="font-medium">{recebimento.numero_serie || t('novaAnalise.notInformedM')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📷 {t('novaAnalise.arrivalPhotos')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="space-y-3">
                    <Card 
                      className="aspect-square bg-muted/30 border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => openFileSelector(index)}
                    >
                      <CardContent className="flex items-center justify-center h-full p-4">
                        {previewsChegada[index] ? (
                          <div className="relative w-full h-full">
                            <img
                              src={previewsChegada[index]}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePhotoUpload(index, null);
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t('novaAnalise.addPhoto')}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚙️ {t('novaAnalise.technicalData')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tipoEquipamento">{t('novaAnalise.equipmentTypeLabel')}</Label>
                  <Input
                    id="tipoEquipamento"
                    value={dadosTecnicos.tipoEquipamento}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, tipoEquipamento: e.target.value })}
                    placeholder="Ex: Bomba Centrífuga"
                  />
                </div>
                <div>
                  <Label htmlFor="pressaoTrabalho">{t('novaAnalise.workPressure')}</Label>
                  <Input
                    id="pressaoTrabalho"
                    value={dadosTecnicos.pressaoTrabalho}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, pressaoTrabalho: e.target.value })}
                    placeholder="Ex: 350 bar"
                  />
                </div>
                <div>
                  <Label htmlFor="camisa">{t('novaAnalise.shirt')}</Label>
                  <Input
                    id="camisa"
                    value={dadosTecnicos.camisa}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, camisa: e.target.value })}
                    placeholder="Ex: 100mm"
                  />
                </div>
                <div>
                  <Label htmlFor="hasteComprimento">{t('novaAnalise.rodLength')}</Label>
                  <Input
                    id="hasteComprimento"
                    value={dadosTecnicos.hasteComprimento}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, hasteComprimento: e.target.value })}
                    placeholder="Ex: 800mm"
                  />
                </div>
                <div>
                  <Label htmlFor="curso">{t('novaAnalise.stroke')}</Label>
                  <Input
                    id="curso"
                    value={dadosTecnicos.curso}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, curso: e.target.value })}
                    placeholder="Ex: 600mm"
                  />
                </div>
                <div>
                  <Label htmlFor="conexaoA">{t('novaAnalise.connectionA')}</Label>
                  <Input
                    id="conexaoA"
                    value={dadosTecnicos.conexaoA}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, conexaoA: e.target.value })}
                    placeholder="Ex: 3/4 NPT"
                  />
                </div>
                <div>
                  <Label htmlFor="conexaoB">{t('novaAnalise.connectionB')}</Label>
                  <Input
                    id="conexaoB"
                    value={dadosTecnicos.conexaoB}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, conexaoB: e.target.value })}
                    placeholder="Ex: 1/2 NPT"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {recebimento.problemas_apresentados && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⚠️ Problemas Apresentados
                </CardTitle>
                <CardDescription>Problemas informados na entrada do equipamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{recebimento.problemas_apresentados}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('novaAnalise.expertiseData')}</CardTitle>
              <CardDescription>
                {t('novaAnalise.expertiseInfo')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="motivoFalha">{t('novaAnalise.failureReason')}</Label>
                <Select
                  value={formData.motivoFalha}
                  onValueChange={(value) => setFormData({ ...formData, motivoFalha: value, motivoFalhaOutro: value !== 'outros' ? '' : formData.motivoFalhaOutro })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('novaAnalise.selectFailureReason')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revisao_completa">{t('novaAnalise.completeRevision')}</SelectItem>
                    <SelectItem value="haste_quebrada">{t('novaAnalise.brokenRod')}</SelectItem>
                    <SelectItem value="vazamento_vedacoes">{t('novaAnalise.sealLeakage')}</SelectItem>
                    <SelectItem value="outros">{t('novaAnalise.others')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.motivoFalha === 'outros' && (
                <div>
                  <Label htmlFor="motivoFalhaOutro">{t('novaAnalise.describeFailureReason')}</Label>
                  <Textarea
                    id="motivoFalhaOutro"
                    value={formData.motivoFalhaOutro}
                    onChange={(e) => setFormData({ ...formData, motivoFalhaOutro: e.target.value })}
                    placeholder={t('novaAnalise.failureReasonPlaceholder')}
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload de Fotos da Peritagem */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📸 {t('novaAnalise.expertisePhotos')}
              </CardTitle>
              <CardDescription>
                {t('novaAnalise.expertisePhotosDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Fotos existentes */}
                {previewsAnalise.map((preview, index) => (
                  <Card key={`foto-${index}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('novaAnalise.photo')} {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <img 
                          src={preview} 
                          alt={`Foto análise ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewsAnalise(prev => prev.filter((_, i) => i !== index));
                            setFotosAnalise(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/80"
                        >
                          ×
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {/* Slots vazios para adicionar mais fotos (sempre mostrar pelo menos 4 slots vazios, ou até completar múltiplo de 4) */}
                {Array.from({ length: Math.max(4, 4 - (previewsAnalise.length % 4 === 0 ? 0 : previewsAnalise.length % 4)) }, (_, i) => {
                  const slotIndex = previewsAnalise.length + i;
                  return (
                    <Card key={`empty-${slotIndex}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{t('novaAnalise.photo')} {slotIndex + 1}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            id={`foto-analise-${slotIndex}`}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                setFotosAnalise(prev => [...prev, file]);
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const result = ev.target?.result as string;
                                  setPreviewsAnalise(prev => [...prev, result]);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <label htmlFor={`foto-analise-${slotIndex}`} className="cursor-pointer flex flex-col items-center gap-2">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{t('novaAnalise.upload')}</p>
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {previewsAnalise.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {previewsAnalise.length} foto(s) adicionada(s)
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚙️ {t('novaAnalise.services')}
              </CardTitle>
              <CardDescription>
                {t('novaAnalise.selectServices')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desmontagem"
                    checked={servicosPreDeterminados.desmontagem}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, desmontagem: checked as boolean})
                    }
                  />
                  <Label htmlFor="desmontagem">{t('novaAnalise.disassemblyAssembly')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="limpeza"
                    checked={servicosPreDeterminados.limpeza}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, limpeza: checked as boolean})
                    }
                  />
                  <Label htmlFor="limpeza">{t('novaAnalise.equipmentCleaning')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="teste"
                    checked={servicosPreDeterminados.teste}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, teste: checked as boolean})
                    }
                  />
                  <Label htmlFor="teste">{t('novaAnalise.performanceTest')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pintura"
                    checked={servicosPreDeterminados.pintura}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, pintura: checked as boolean})
                    }
                  />
                  <Label htmlFor="pintura">{t('novaAnalise.equipmentPainting')}</Label>
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox 
                    id="recondicionamento"
                    checked={servicosPreDeterminados.recondicionamento}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, recondicionamento: checked as boolean})
                    }
                  />
                  <Label htmlFor="recondicionamento">{t('novaAnalise.threadReconditioning')}</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="servicosPersonalizados">{t('novaAnalise.additionalServices')}</Label>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-end p-3 bg-background rounded-lg border">
                    <div>
                      <Label htmlFor="qtd-servicos-adicionais" className="text-xs text-muted-foreground">Quantidade</Label>
                      <QuantityInput
                        value={novoServicoAdicional.quantidade}
                        onChange={(value) => setNovoServicoAdicional({
                          ...novoServicoAdicional,
                          quantidade: value
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="codigo-servicos-adicionais" className="text-xs text-muted-foreground">Código</Label>
                      <Input
                        id="codigo-servicos-adicionais"
                        className="w-24"
                        value={novoServicoAdicional.codigo}
                        onChange={(e) => setNovoServicoAdicional({
                          ...novoServicoAdicional,
                          codigo: e.target.value
                        })}
                        placeholder="Código"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nome-servicos-adicionais" className="text-xs text-muted-foreground">Nome do Serviço</Label>
                      <Input
                        id="nome-servicos-adicionais"
                        value={novoServicoAdicional.nome}
                        onChange={(e) => setNovoServicoAdicional({
                          ...novoServicoAdicional,
                          nome: e.target.value
                        })}
                        placeholder="Descreva o serviço..."
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        if (novoServicoAdicional.nome.trim()) {
                          setServicosAdicionais([...servicosAdicionais, { ...novoServicoAdicional }]);
                          setNovoServicoAdicional({ quantidade: 1, nome: "", codigo: "" });
                        }
                      }}
                      disabled={!novoServicoAdicional.nome.trim()}
                    >
                      Adicionar
                    </Button>
                  </div>
                  
                  {servicosAdicionais.length > 0 && (
                    <div className="space-y-2">
                      {servicosAdicionais.map((servico, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-muted/30 rounded-lg border">
                          <div>
                            <Label className="text-xs text-muted-foreground">Quantidade</Label>
                            <QuantityInput
                              value={servico.quantidade}
                              onChange={(value) => {
                                const updated = [...servicosAdicionais];
                                updated[index].quantidade = value;
                                setServicosAdicionais(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Código</Label>
                            <Input
                              className="w-24 h-8"
                              value={servico.codigo || ""}
                              onChange={(e) => {
                                const updated = [...servicosAdicionais];
                                updated[index].codigo = e.target.value;
                                setServicosAdicionais(updated);
                              }}
                              placeholder="Código"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Nome do Serviço</Label>
                            <Input
                              className="h-8"
                              value={servico.nome}
                              onChange={(e) => {
                                const updated = [...servicosAdicionais];
                                updated[index].nome = e.target.value;
                                setServicosAdicionais(updated);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setServicosAdicionais(servicosAdicionais.filter((_, i) => i !== index));
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Serviços Selecionados */}
              {(servicosPreDeterminados.desmontagem || 
                servicosPreDeterminados.limpeza || 
                servicosPreDeterminados.teste || 
                servicosPreDeterminados.pintura || 
                servicosPreDeterminados.recondicionamento ||
                servicosPersonalizados.trim()) && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    ✅ Serviços Selecionados
                  </h4>
                  <div className="space-y-3">
                    {servicosPreDeterminados.desmontagem && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-desmontagem" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={servicosQuantidades.desmontagem}
                            onChange={(value) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              desmontagem: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-desmontagem" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-desmontagem"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(servicosQuantidades as any).desmontagem_codigo || ""}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              desmontagem_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-desmontagem" className="text-xs text-muted-foreground">Nome do Serviço</Label>
                          <Input
                            id="nome-desmontagem"
                            value={servicosNomes.desmontagem}
                            onChange={(e) => setServicosNomes({
                              ...servicosNomes, 
                              desmontagem: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setServicosPreDeterminados({...servicosPreDeterminados, desmontagem: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {servicosPreDeterminados.limpeza && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-limpeza" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={servicosQuantidades.limpeza}
                            onChange={(value) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              limpeza: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-limpeza" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-limpeza"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(servicosQuantidades as any).limpeza_codigo || ""}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              limpeza_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-limpeza" className="text-xs text-muted-foreground">Nome do Serviço</Label>
                          <Input
                            id="nome-limpeza"
                            value={servicosNomes.limpeza}
                            onChange={(e) => setServicosNomes({
                              ...servicosNomes, 
                              limpeza: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setServicosPreDeterminados({...servicosPreDeterminados, limpeza: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {servicosPreDeterminados.teste && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-teste" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={servicosQuantidades.teste}
                            onChange={(value) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              teste: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-teste" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-teste"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(servicosQuantidades as any).teste_codigo || ""}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              teste_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-teste" className="text-xs text-muted-foreground">Nome do Serviço</Label>
                          <Input
                            id="nome-teste"
                            value={servicosNomes.teste}
                            onChange={(e) => setServicosNomes({
                              ...servicosNomes, 
                              teste: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setServicosPreDeterminados({...servicosPreDeterminados, teste: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {servicosPreDeterminados.pintura && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-pintura" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={servicosQuantidades.pintura}
                            onChange={(value) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              pintura: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-pintura" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-pintura"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(servicosQuantidades as any).pintura_codigo || ""}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              pintura_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-pintura" className="text-xs text-muted-foreground">Nome do Serviço</Label>
                          <Input
                            id="nome-pintura"
                            value={servicosNomes.pintura}
                            onChange={(e) => setServicosNomes({
                              ...servicosNomes, 
                              pintura: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setServicosPreDeterminados({...servicosPreDeterminados, pintura: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {servicosPreDeterminados.recondicionamento && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-recondicionamento" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={servicosQuantidades.recondicionamento}
                            onChange={(value) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              recondicionamento: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-recondicionamento" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-recondicionamento"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(servicosQuantidades as any).recondicionamento_codigo || ""}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              recondicionamento_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-recondicionamento" className="text-xs text-muted-foreground">Nome do Serviço</Label>
                          <Input
                            id="nome-recondicionamento"
                            value={servicosNomes.recondicionamento}
                            onChange={(e) => setServicosNomes({
                              ...servicosNomes, 
                              recondicionamento: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setServicosPreDeterminados({...servicosPreDeterminados, recondicionamento: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {servicosPersonalizados.trim() && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-personalizado" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={servicosQuantidades.personalizado}
                            onChange={(value) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              personalizado: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-personalizado" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-personalizado"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(servicosQuantidades as any).personalizado_codigo || ""}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              personalizado_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-personalizado" className="text-xs text-muted-foreground">Nome do Serviço</Label>
                          <Input
                            id="nome-personalizado"
                            value={servicosPersonalizados}
                            onChange={(e) => setServicosPersonalizados(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setServicosPersonalizados("")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏭 Usinagem
              </CardTitle>
              <CardDescription>
                Trabalhos de usinagem necessários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="usinagem-haste"
                    checked={usinagem.usinagemHaste}
                    onCheckedChange={(checked) => 
                      setUsinagem({...usinagem, usinagemHaste: checked as boolean})
                    }
                  />
                  <Label htmlFor="usinagem-haste">Usinagem de haste</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="usinagem-tampa-guia"
                    checked={usinagem.usinagemTampaGuia}
                    onCheckedChange={(checked) => 
                      setUsinagem({...usinagem, usinagemTampaGuia: checked as boolean})
                    }
                  />
                  <Label htmlFor="usinagem-tampa-guia">Usinagem de tampa guia</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="usinagem-embolo"
                    checked={usinagem.usinagemEmbolo}
                    onCheckedChange={(checked) => 
                      setUsinagem({...usinagem, usinagemEmbolo: checked as boolean})
                    }
                  />
                  <Label htmlFor="usinagem-embolo">Usinagem de êmbolo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="usinagem-cabecote-dianteiro"
                    checked={usinagem.usinagemCabecoteDianteiro}
                    onCheckedChange={(checked) => 
                      setUsinagem({...usinagem, usinagemCabecoteDianteiro: checked as boolean})
                    }
                  />
                  <Label htmlFor="usinagem-cabecote-dianteiro">Usinagem de cabeçote dianteiro canal do oring</Label>
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox 
                    id="usinagem-cabecote-traseiro"
                    checked={usinagem.usinagemCabecoteTraseiro}
                    onCheckedChange={(checked) => 
                      setUsinagem({...usinagem, usinagemCabecoteTraseiro: checked as boolean})
                    }
                  />
                  <Label htmlFor="usinagem-cabecote-traseiro">Usinagem cabeçote traseiro canal do oring</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="usinagemPersonalizada">Usinagem Adicionais</Label>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-end p-3 bg-background rounded-lg border">
                    <div>
                      <Label htmlFor="qtd-usinagem-adicionais" className="text-xs text-muted-foreground">Quantidade</Label>
                      <Input
                        id="qtd-usinagem-adicionais"
                        type="number"
                        min="1"
                        className="w-20"
                        value={novaUsinagemAdicional.quantidade}
                        onChange={(e) => setNovaUsinagemAdicional({
                          ...novaUsinagemAdicional,
                          quantidade: parseInt(e.target.value) || 1
                        })}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="codigo-usinagem-adicionais" className="text-xs text-muted-foreground">Código</Label>
                      <Input
                        id="codigo-usinagem-adicionais"
                        className="w-24"
                        value={novaUsinagemAdicional.codigo}
                        onChange={(e) => setNovaUsinagemAdicional({
                          ...novaUsinagemAdicional,
                          codigo: e.target.value
                        })}
                        placeholder="Código"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nome-usinagem-adicionais" className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                      <Input
                        id="nome-usinagem-adicionais"
                        value={novaUsinagemAdicional.nome}
                        onChange={(e) => setNovaUsinagemAdicional({
                          ...novaUsinagemAdicional,
                          nome: e.target.value
                        })}
                        placeholder="Descreva a usinagem..."
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        if (novaUsinagemAdicional.nome.trim()) {
                          setUsinagemAdicional([...usinagemAdicional, { ...novaUsinagemAdicional }]);
                          setNovaUsinagemAdicional({ quantidade: 1, nome: "", codigo: "" });
                        }
                      }}
                      disabled={!novaUsinagemAdicional.nome.trim()}
                    >
                      Adicionar
                    </Button>
                  </div>
                  
                  {usinagemAdicional.length > 0 && (
                    <div className="space-y-2">
                      {usinagemAdicional.map((usinagem, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-muted/30 rounded-lg border">
                          <div>
                            <Label className="text-xs text-muted-foreground">Quantidade</Label>
                            <QuantityInput
                              value={usinagem.quantidade}
                              onChange={(value) => {
                                const updated = [...usinagemAdicional];
                                updated[index].quantidade = value;
                                setUsinagemAdicional(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Código</Label>
                            <Input
                              className="w-24 h-8"
                              value={usinagem.codigo || ""}
                              onChange={(e) => {
                                const updated = [...usinagemAdicional];
                                updated[index].codigo = e.target.value;
                                setUsinagemAdicional(updated);
                              }}
                              placeholder="Código"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                            <Input
                              className="h-8"
                              value={usinagem.nome}
                              onChange={(e) => {
                                const updated = [...usinagemAdicional];
                                updated[index].nome = e.target.value;
                                setUsinagemAdicional(updated);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setUsinagemAdicional(usinagemAdicional.filter((_, i) => i !== index));
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Usinagens Selecionadas */}
              {(usinagem.usinagemHaste || 
                usinagem.usinagemTampaGuia || 
                usinagem.usinagemEmbolo || 
                usinagem.usinagemCabecoteDianteiro || 
                usinagem.usinagemCabecoteTraseiro ||
                usinagemPersonalizada.trim()) && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    ✅ Usinagens Selecionadas
                  </h4>
                  <div className="space-y-3">
                    {usinagem.usinagemHaste && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-haste" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={usinagemQuantidades.usinagemHaste}
                            onChange={(value) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemHaste: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-usinagem-haste" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-usinagem-haste"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(usinagemQuantidades as any).usinagemHaste_codigo || ""}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemHaste_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-usinagem-haste" className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                          <Input
                            id="nome-usinagem-haste"
                            value={usinagemNomes.usinagemHaste}
                            onChange={(e) => setUsinagemNomes({
                              ...usinagemNomes, 
                              usinagemHaste: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUsinagem({...usinagem, usinagemHaste: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {usinagem.usinagemTampaGuia && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-tampa" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={usinagemQuantidades.usinagemTampaGuia}
                            onChange={(value) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemTampaGuia: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-usinagem-tampa" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-usinagem-tampa"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(usinagemQuantidades as any).usinagemTampaGuia_codigo || ""}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemTampaGuia_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-usinagem-tampa" className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                          <Input
                            id="nome-usinagem-tampa"
                            value={usinagemNomes.usinagemTampaGuia}
                            onChange={(e) => setUsinagemNomes({
                              ...usinagemNomes, 
                              usinagemTampaGuia: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUsinagem({...usinagem, usinagemTampaGuia: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {usinagem.usinagemEmbolo && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-embolo" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={usinagemQuantidades.usinagemEmbolo}
                            onChange={(value) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemEmbolo: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-usinagem-embolo" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-usinagem-embolo"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(usinagemQuantidades as any).usinagemEmbolo_codigo || ""}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemEmbolo_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-usinagem-embolo" className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                          <Input
                            id="nome-usinagem-embolo"
                            value={usinagemNomes.usinagemEmbolo}
                            onChange={(e) => setUsinagemNomes({
                              ...usinagemNomes, 
                              usinagemEmbolo: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUsinagem({...usinagem, usinagemEmbolo: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {usinagem.usinagemCabecoteDianteiro && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-dianteiro" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={usinagemQuantidades.usinagemCabecoteDianteiro}
                            onChange={(value) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemCabecoteDianteiro: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-usinagem-dianteiro" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-usinagem-dianteiro"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(usinagemQuantidades as any).usinagemCabecoteDianteiro_codigo || ""}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemCabecoteDianteiro_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-usinagem-dianteiro" className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                          <Input
                            id="nome-usinagem-dianteiro"
                            value={usinagemNomes.usinagemCabecoteDianteiro}
                            onChange={(e) => setUsinagemNomes({
                              ...usinagemNomes, 
                              usinagemCabecoteDianteiro: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUsinagem({...usinagem, usinagemCabecoteDianteiro: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {usinagem.usinagemCabecoteTraseiro && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-traseiro" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={usinagemQuantidades.usinagemCabecoteTraseiro}
                            onChange={(value) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemCabecoteTraseiro: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-usinagem-traseiro" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-usinagem-traseiro"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(usinagemQuantidades as any).usinagemCabecoteTraseiro_codigo || ""}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemCabecoteTraseiro_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-usinagem-traseiro" className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                          <Input
                            id="nome-usinagem-traseiro"
                            value={usinagemNomes.usinagemCabecoteTraseiro}
                            onChange={(e) => setUsinagemNomes({
                              ...usinagemNomes, 
                              usinagemCabecoteTraseiro: e.target.value
                            })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUsinagem({...usinagem, usinagemCabecoteTraseiro: false})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {usinagemPersonalizada.trim() && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-personalizada" className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={usinagemQuantidades.personalizada}
                            onChange={(value) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              personalizada: value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="codigo-usinagem-personalizada" className="text-xs text-muted-foreground">Código</Label>
                          <Input
                            id="codigo-usinagem-personalizada"
                            placeholder="Código"
                            className="w-24 h-8"
                            value={(usinagemQuantidades as any).personalizada_codigo || ""}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              personalizada_codigo: e.target.value
                            } as any)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nome-usinagem-personalizada" className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                          <Input
                            id="nome-usinagem-personalizada"
                            value={usinagemPersonalizada}
                            onChange={(e) => setUsinagemPersonalizada(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUsinagemPersonalizada("")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔧 Peças Utilizadas
              </CardTitle>
              <CardDescription>
                Adicione as peças necessárias para o reparo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <Label>Quantidade</Label>
                    <QuantityInput
                      value={novaPecaAdicional.quantidade}
                      onChange={(value) => setNovaPecaAdicional({
                        ...novaPecaAdicional,
                        quantidade: value
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Nome da Peça</Label>
                    <Input
                      placeholder="Descreva a peça..."
                      value={novaPecaAdicional.peca}
                      onChange={(e) => setNovaPecaAdicional({
                        ...novaPecaAdicional,
                        peca: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="bg-primary hover:bg-primary-hover text-primary-foreground"
                      onClick={() => {
                        if (novaPecaAdicional.peca && novaPecaAdicional.quantidade) {
                          setPecasUtilizadas([...pecasUtilizadas, { 
                            quantidade: novaPecaAdicional.quantidade,
                            peca: novaPecaAdicional.peca
                          }]);
                          setNovaPecaAdicional({
                            quantidade: 1,
                            peca: ""
                          });
                        }
                      }}
                    >
                      Adicionar Peça
                    </Button>
                  </div>
                </div>

                {/* Lista de Peças Adicionadas */}
                {pecasUtilizadas.length > 0 && (
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      ✅ Peças Adicionadas
                    </h4>
                    <div className="space-y-3">
                      {pecasUtilizadas.map((peca, index) => (
                        <div key={index} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center p-3 bg-background rounded-lg border">
                          <div>
                            <Label htmlFor={`qtd-peca-${index}`} className="text-xs text-muted-foreground">Quantidade</Label>
                            <QuantityInput
                              value={peca.quantidade}
                              onChange={(value) => {
                                const newPecas = [...pecasUtilizadas];
                                newPecas[index].quantidade = value;
                                setPecasUtilizadas(newPecas);
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`nome-peca-${index}`} className="text-xs text-muted-foreground">Nome da Peça</Label>
                            <Input
                              id={`nome-peca-${index}`}
                              className="h-8"
                              value={peca.peca}
                              onChange={(e) => {
                                const newPecas = [...pecasUtilizadas];
                                newPecas[index].peca = e.target.value;
                                setPecasUtilizadas(newPecas);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mt-4"
                            onClick={() => {
                              setPecasUtilizadas(pecasUtilizadas.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seção de Documentos PDF */}
          {documentosPdf.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📄 Documentos Técnicos
                </CardTitle>
                <CardDescription>
                  PDFs e documentos anexados à ordem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documentosPdf.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{doc.nome_arquivo}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.tamanho_bytes ? `${(doc.tamanho_bytes / 1024).toFixed(2)} KB` : 'Tamanho desconhecido'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            // Fazer chamada para a edge function com responseType blob
                            const response = await fetch(
                              `https://fmbfkufkxvyncadunlhh.supabase.co/functions/v1/download-file`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  fileUrl: doc.arquivo_url,
                                  fileName: doc.nome_arquivo
                                })
                              }
                            );

                            if (!response.ok) throw new Error('Erro ao baixar arquivo');

                            // Obter o blob da resposta
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = doc.nome_arquivo;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            
                            toast({
                              title: "Download iniciado",
                              description: `O arquivo ${doc.nome_arquivo} está sendo baixado.`,
                            });
                          } catch (error) {
                            console.error('Erro ao baixar:', error);
                            toast({
                              title: "Erro ao baixar",
                              description: "Não foi possível baixar o arquivo.",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/analise')}
            >
              {t('novaAnalise.cancel')}
            </Button>
            <Button 
              type="button"
              variant="outline" 
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth"
              onClick={() => exportToPDF(ordemExistente, recebimento)}
            >
              <FileText className="mr-2 h-4 w-4" />
              {t('novaAnalise.exportPdf')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEdicao ? t('novaAnalise.saveChanges') : t('novaAnalise.createServiceOrder')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NovaOrdemServico;
