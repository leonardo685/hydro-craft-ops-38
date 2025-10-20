import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Upload, Camera, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useRecebimentos } from "@/hooks/use-recebimentos";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import mecHidroLogo from "@/assets/mec-hidro-logo.png";

const NovaOrdemServico = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { recebimentos, loading } = useRecebimentos();
  const [recebimento, setRecebimento] = useState<any>(null);
  const [ordemExistente, setOrdemExistente] = useState<any>(null);
  const [isEdicao, setIsEdicao] = useState(false);
  
  const [formData, setFormData] = useState({
    tecnico: "",
    problemas: "",
    prazoEstimado: "",
    prioridade: "Média",
    observacoes: ""
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
  const [apresentarOrcamento, setApresentarOrcamento] = useState([false, false, false, false]);
  const [pecasUtilizadas, setPecasUtilizadas] = useState<Array<{
    quantidade: number;
    peca: string;
    material: string;
    medida1: string;
    medida2: string;
    medida3: string;
  }>>([]);
  
  // Estados para controlar os campos de entrada de peças
  const [novaPeca, setNovaPeca] = useState({
    quantidade: 1,
    peca: "",
    material: "",
    medida1: "",
    medida2: "",
    medida3: ""
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
    desmontagem: "Desmontagem e Montagem",
    limpeza: "Limpeza do Equipamento",
    teste: "Teste de Performance ISO 10100",
    pintura: "Pintura do Equipamento",
    recondicionamento: "Recondicionamento de Roscas"
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
    usinagemHaste: "Usinagem de haste",
    usinagemTampaGuia: "Usinagem de tampa guia",
    usinagemEmbolo: "Usinagem de êmbolo",
    usinagemCabecoteDianteiro: "Usinagem de cabeçote dianteiro canal do oring",
    usinagemCabecoteTraseiro: "Usinagem cabeçote traseiro canal do oring"
  });

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
    
    const EMPRESA_INFO = {
      nome: "MEC-HIDRO MECANICA E HIDRAULICA LTDA",
      cnpj: "03.328.334/0001-87",
      telefone: "(19) 3026-6227",
      email: "contato@mechidro.com.br"
    };
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 10;
    const lineHeight = 6;
    
    // Função para adicionar detalhes decorativos
    const adicionarDetalheDecorativo = () => {
      // Triângulo vermelho no canto inferior direito
      doc.setFillColor(220, 38, 38);
      doc.triangle(
        pageWidth - 30, pageHeight - 30,
        pageWidth, pageHeight - 30,
        pageWidth, pageHeight,
        'F'
      );
      
      // Detalhe preto adicional
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
        
        // Adicionar detalhe decorativo em cada página
        adicionarDetalheDecorativo();
        
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${totalPages}`, 15, pageHeight - 10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 60, pageHeight - 10);
      }
    };
    
    // Adicionar logo MEC-HIDRO no canto superior direito
    try {
      const logoImg = new Image();
      logoImg.src = mecHidroLogo;
      
      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          doc.addImage(logoImg, 'PNG', pageWidth - 50, 8, 35, 20);
          resolve();
        };
        logoImg.onerror = () => resolve();
      });
    } catch (error) {
      console.error('Erro ao adicionar logo:', error);
    }
    
    // Cabeçalho Profissional
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
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
    
    // Informações Básicas
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Informações Básicas", 20, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Cliente: ${dadosRecebimento?.cliente_nome || ''}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Equipamento: ${dadosRecebimento?.tipo_equipamento || ''}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Data de Entrada: ${dadosOrdem?.data_entrada ? new Date(dadosOrdem.data_entrada).toLocaleDateString('pt-BR') : ''}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Técnico: ${dadosOrdem?.tecnico || ''}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Prioridade: ${dadosOrdem?.prioridade || ''}`, 20, yPosition);
    yPosition += 15;
    
    // Dados Técnicos (Peritagem)
    if (dadosTecnicos.tipoEquipamento || dadosTecnicos.pressaoTrabalho || dadosTecnicos.curso || 
        dadosTecnicos.camisa || dadosTecnicos.hasteComprimento || dadosTecnicos.conexaoA || 
        dadosTecnicos.conexaoB) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Dados Técnicos (Peritagem)', 20, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      if (dadosTecnicos.tipoEquipamento) {
        doc.text(`• Tipo de Equipamento: ${dadosTecnicos.tipoEquipamento}`, 20, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.pressaoTrabalho) {
        doc.text(`• Pressão de Trabalho: ${dadosTecnicos.pressaoTrabalho}`, 20, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.curso) {
        doc.text(`• Curso: ${dadosTecnicos.curso}`, 20, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.camisa) {
        doc.text(`• Camisa: ${dadosTecnicos.camisa}`, 20, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.hasteComprimento) {
        doc.text(`• Haste x Comprimento: ${dadosTecnicos.hasteComprimento}`, 20, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.conexaoA) {
        doc.text(`• Conexão A: ${dadosTecnicos.conexaoA}`, 20, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.conexaoB) {
        doc.text(`• Conexão B: ${dadosTecnicos.conexaoB}`, 20, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 10;
    }
    
    // Função para adicionar fotos em grade 2x2
    const adicionarFotosGrade = async (fotos: string[], titulo: string) => {
      if (fotos.length === 0) return;
      
      if (yPosition > 240) {
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
      const fotoWidth = 85;
      const fotoHeight = 60;
      const espacoHorizontal = 10;
      const espacoVertical = 15;
      
      for (let i = 0; i < fotos.length; i += fotosPorPagina) {
        if (i > 0) {
          doc.addPage();
          yPosition = 20;
        }
        
        const fotosPagina = fotos.slice(i, i + fotosPorPagina);
        
        for (let j = 0; j < fotosPagina.length; j++) {
          const col = j % 2;
          const row = Math.floor(j / 2);
          const xPos = 20 + col * (fotoWidth + espacoHorizontal);
          const yPos = yPosition + row * (fotoHeight + espacoVertical);
          
          try {
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                doc.addImage(img, 'JPEG', xPos, yPos, fotoWidth, fotoHeight);
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
          yPosition = 280; // Força nova página
        } else {
          yPosition += Math.ceil(fotosPagina.length / 2) * (fotoHeight + espacoVertical) + 10;
        }
      }
    };
    
    // Fotos de Chegada
    if (previewsChegada.some(preview => preview)) {
      await adicionarFotosGrade(previewsChegada.filter(p => p), 'Fotos de Chegada do Equipamento');
    }
    
    // Problemas Identificados
    if (formData.problemas) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Problemas Identificados', 20, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitProblemas = doc.splitTextToSize(formData.problemas, 170);
      doc.text(splitProblemas, 20, yPosition);
      yPosition += splitProblemas.length * lineHeight + 10;
    }
    
    // Serviços Realizados (SEM VALORES)
    const servicosSelecionados = Object.entries(servicosPreDeterminados)
      .filter(([_, selecionado]) => selecionado)
      .map(([servico, _]) => {
        const quantidade = servicosQuantidades[servico as keyof typeof servicosQuantidades];
        const nome = servicosNomes[servico as keyof typeof servicosNomes];
        return `${quantidade}x ${nome}`;
      });
    
    if (servicosSelecionados.length > 0 || servicosPersonalizados) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Serviços Realizados', 20, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      servicosSelecionados.forEach(servico => {
        doc.text(`• ${servico}`, 20, yPosition);
        yPosition += lineHeight;
      });
      
      if (servicosPersonalizados) {
        const quantidade = servicosQuantidades.personalizado;
        const splitServicos = doc.splitTextToSize(`• ${quantidade}x ${servicosPersonalizados}`, 170);
        doc.text(splitServicos, 20, yPosition);
        yPosition += splitServicos.length * lineHeight;
      }
      yPosition += 10;
    }
    
    // Usinagem (SEM VALORES)
    const usinagemSelecionada = Object.entries(usinagem)
      .filter(([_, selecionado]) => selecionado)
      .map(([tipo, _]) => {
        const quantidade = usinagemQuantidades[tipo as keyof typeof usinagemQuantidades];
        const nome = usinagemNomes[tipo as keyof typeof usinagemNomes];
        return `${quantidade}x ${nome}`;
      });
    
    if (usinagemSelecionada.length > 0 || usinagemPersonalizada) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Usinagem', 20, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      usinagemSelecionada.forEach(tipo => {
        doc.text(`• ${tipo}`, 20, yPosition);
        yPosition += lineHeight;
      });
      
      if (usinagemPersonalizada) {
        const quantidade = usinagemQuantidades.personalizada;
        const splitUsinagem = doc.splitTextToSize(`• ${quantidade}x ${usinagemPersonalizada}`, 170);
        doc.text(splitUsinagem, 20, yPosition);
        yPosition += splitUsinagem.length * lineHeight;
      }
      yPosition += 10;
    }
    
    // Peças Utilizadas (SEM VALORES)
    if (pecasUtilizadas.length > 0) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Peças Utilizadas', 20, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      pecasUtilizadas.forEach(peca => {
        const pecaText = `• ${peca.quantidade}x ${peca.peca} (${peca.material}) - ${peca.medida1} x ${peca.medida2} x ${peca.medida3}`;
        const splitPecaText = doc.splitTextToSize(pecaText, 170);
        doc.text(splitPecaText, 20, yPosition);
        yPosition += splitPecaText.length * lineHeight;
      });
      yPosition += 10;
    }
    
    // Fotos da Análise
    if (previewsAnalise.some(preview => preview)) {
      await adicionarFotosGrade(previewsAnalise.filter(p => p), 'Fotos da Análise');
    }
    
    // Observações
    if (formData.observacoes) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Observações', 20, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitObservacoes = doc.splitTextToSize(formData.observacoes, 170);
      doc.text(splitObservacoes, 20, yPosition);
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
      setPreviewsChegada(prev => {
        const newPreviews = [...prev];
        newPreviews[index] = '';
        return newPreviews;
      });
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
    console.log('Looking for recebimento with ID:', decodedId);
    console.log('Available recebimentos:', recebimentos);
    
    // Primeiro tenta buscar diretamente na tabela recebimentos
    let recebimentoEncontrado = recebimentos.find((r: any) => 
      r.numero_ordem === decodedId || 
      r.id?.toString() === decodedId
    );
    
    // Se não encontrou, pode ser que estejamos editando uma ordem de serviço existente
    // Neste caso, precisamos buscar a ordem de serviço e depois o recebimento relacionado
    if (!recebimentoEncontrado && decodedId.startsWith('OS-')) {
      console.log('Searching for order service with number:', decodedId);
      // Buscar ordem de serviço e carregar dados para edição
      const loadOrderForEdit = async () => {
        try {
          const { data: ordem, error } = await supabase
            .from('ordens_servico')
            .select(`
              *,
              recebimentos (
                id,
                numero_ordem,
                cliente_nome,
                tipo_equipamento,
                data_entrada,
                nota_fiscal,
                numero_serie,
                observacoes,
                fotos_equipamentos (*)
              )
            `)
            .eq('numero_ordem', decodedId)
            .maybeSingle();

          if (error) {
            console.error('Erro ao buscar ordem de serviço:', error);
            return;
          }

          if (ordem && ordem.recebimentos) {
            setIsEdicao(true);
            setOrdemExistente(ordem);
            
            // Carregar dados do recebimento
            const recebimentoData = ordem.recebimentos;
            setRecebimento({
              id: recebimentoData.id,
              cliente: recebimentoData.cliente_nome,
              equipamento: recebimentoData.tipo_equipamento,
              dataEntrada: new Date(recebimentoData.data_entrada).toLocaleDateString('pt-BR'),
              numeroOrdem: recebimentoData.numero_ordem,
              nota_fiscal: recebimentoData.nota_fiscal,
              numero_serie: recebimentoData.numero_serie,
              observacoes: recebimentoData.observacoes,
              fotos: recebimentoData.fotos_equipamentos || []
            });

            // Preencher form com dados da ordem existente
            setFormData({
              tecnico: ordem.tecnico || "",
              problemas: ordem.tipo_problema || ordem.descricao_problema || "",
              prazoEstimado: ordem.tempo_estimado || "",
              prioridade: ordem.prioridade === 'alta' ? 'Alta' : 
                         ordem.prioridade === 'baixa' ? 'Baixa' : 'Média',
              observacoes: ordem.observacoes_tecnicas || ""
            });

            // Carregar peças se existirem
            if (ordem.pecas_necessarias && Array.isArray(ordem.pecas_necessarias)) {
              console.log('Carregando peças:', ordem.pecas_necessarias);
              setPecasUtilizadas(ordem.pecas_necessarias as any);
            }

            // Carregar serviços se existirem
            if (ordem.servicos_necessarios && Array.isArray(ordem.servicos_necessarios)) {
              console.log('Carregando serviços:', ordem.servicos_necessarios);
              const servicosObj: any = {};
              const quantidades: any = {};
              const nomes: any = {};
              let personalizado = "";
              
              ordem.servicos_necessarios.forEach((servico: any) => {
                if (servico.tipo === 'personalizado') {
                  personalizado = servico.descricao || servico.servico;
                  quantidades.personalizado = servico.quantidade || 1;
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
            }

            // Carregar usinagem se existir
            if (ordem.usinagem_necessaria && Array.isArray(ordem.usinagem_necessaria)) {
              console.log('Carregando usinagem:', ordem.usinagem_necessaria);
              const usinagemObj: any = {};
              const quantidades: any = {};
              const nomes: any = {};
              let personalizada = "";
              
              ordem.usinagem_necessaria.forEach((usinag: any) => {
                if (usinag.tipo === 'personalizada') {
                  personalizada = usinag.descricao || usinag.trabalho;
                  quantidades.personalizada = usinag.quantidade || 1;
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
              console.log('Carregando fotos:', recebimentoData.fotos_equipamentos);
              
              // Fotos de chegada (apresentar_orcamento = true)
              const fotosChegadaUrls = recebimentoData.fotos_equipamentos
                .filter((foto: any) => foto.apresentar_orcamento === true)
                .map((foto: any) => foto.arquivo_url);
              
              if (fotosChegadaUrls.length > 0) {
                console.log('Fotos de chegada carregadas:', fotosChegadaUrls.length);
                setFotosChegada(fotosChegadaUrls);
                setPreviewsChegada(fotosChegadaUrls);
              }
              
              // Fotos de análise (apresentar_orcamento = false)
              const fotosAnaliseUrls = recebimentoData.fotos_equipamentos
                .filter((foto: any) => foto.apresentar_orcamento === false)
                .map((foto: any) => foto.arquivo_url);
              
              if (fotosAnaliseUrls.length > 0) {
                console.log('Fotos de análise carregadas:', fotosAnaliseUrls.length);
                setFotosAnalise(fotosAnaliseUrls);
                setPreviewsAnalise(fotosAnaliseUrls);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao carregar ordem para edição:', error);
        }
      };

      loadOrderForEdit();
      return;
    }
    
    console.log('Found recebimento:', recebimentoEncontrado);
    
    if (recebimentoEncontrado) {
      setRecebimento({
        id: recebimentoEncontrado.id,
        cliente: recebimentoEncontrado.cliente_nome,
        equipamento: recebimentoEncontrado.tipo_equipamento,
        dataEntrada: new Date(recebimentoEncontrado.data_entrada).toLocaleDateString('pt-BR'),
        numeroOrdem: recebimentoEncontrado.numero_ordem,
        nota_fiscal: recebimentoEncontrado.nota_fiscal,
        numero_serie: recebimentoEncontrado.numero_serie,
        fotos: (recebimentoEncontrado as any).fotos_equipamentos || []
      });
      
      // Dados técnicos começam vazios para nova análise
      setDadosTecnicos({
        tipoEquipamento: recebimentoEncontrado.tipo_equipamento || "",
        pressaoTrabalho: (recebimentoEncontrado as any).pressao_trabalho || "",
        camisa: "",
        hasteComprimento: "",
        curso: "",
        conexaoA: "",
        conexaoB: "",
        temperaturaTrabalho: (recebimentoEncontrado as any).temperatura_trabalho || "",
        fluidoTrabalho: (recebimentoEncontrado as any).fluido_trabalho || "",
        localInstalacao: (recebimentoEncontrado as any).local_instalacao || "",
        potencia: (recebimentoEncontrado as any).potencia || "",
        numeroSerie: (recebimentoEncontrado as any).numero_serie || ""
      });
      
      // Carregar fotos do recebimento se existirem
      if (recebimentoEncontrado.fotos && recebimentoEncontrado.fotos.length > 0) {
        setPreviewsChegada(recebimentoEncontrado.fotos.map((foto: any) => foto.arquivo_url).filter(Boolean));
      }
    } else {
      console.log('Recebimento not found for ID:', decodedId);
    }
  }, [id, recebimentos, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
          tipo: servico
        }));

      // Adicionar serviços personalizados se existirem
      if (servicosPersonalizados.trim()) {
        servicosSelecionados.push({
          quantidade: servicosQuantidades.personalizado,
          servico: servicosPersonalizados.trim(),
          descricao: servicosPersonalizados.trim(),
          tipo: 'personalizado'
        });
      }

      console.log('Serviços selecionados preparados:', servicosSelecionados);

      // Preparar dados das usinagens selecionadas
      const usinagemSelecionada = Object.entries(usinagem)
        .filter(([_, selecionado]) => selecionado)
        .map(([tipo, _]) => ({
          quantidade: usinagemQuantidades[tipo as keyof typeof usinagemQuantidades],
          trabalho: usinagemNomes[tipo as keyof typeof usinagemNomes],
          descricao: usinagemNomes[tipo as keyof typeof usinagemNomes],
          tipo: tipo
        }));

      // Adicionar usinagem personalizada se existir
      if (usinagemPersonalizada.trim()) {
        usinagemSelecionada.push({
          quantidade: usinagemQuantidades.personalizada,
          trabalho: usinagemPersonalizada.trim(),
          descricao: usinagemPersonalizada.trim(),
          tipo: 'personalizada'
        });
      }

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
            prioridade: formData.prioridade.toLowerCase(),
            data_analise: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
        let recebimentoId = recebimento?.id;
        if (!recebimentoId && ordemExistente?.recebimento_id) {
          recebimentoId = ordemExistente.recebimento_id;
        }
        
        if (recebimentoId) {
          console.log('Atualizando dados técnicos do recebimento ID:', recebimentoId);
          console.log('Dados técnicos a salvar:', dadosTecnicos);
          const { error: recebimentoError } = await supabase
            .from('recebimentos')
            .update({
              tipo_equipamento: dadosTecnicos.tipoEquipamento,
              pressao_trabalho: dadosTecnicos.pressaoTrabalho,
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
            .eq('id', recebimentoId);
          
          if (recebimentoError) {
            console.error('Erro ao atualizar recebimento:', recebimentoError);
          } else {
            console.log('✅ Dados técnicos do recebimento atualizados com sucesso!');
          }
        } else {
          console.warn('⚠️ ID do recebimento não encontrado, dados técnicos não foram salvos');
        }
      } else {
        console.log('Criando nova ordem...');
        // Criar nova ordem
        const numeroOrdem = `OS-${Date.now()}`;
        
        const { data: novaOrdem, error } = await supabase
          .from('ordens_servico')
          .insert({
            recebimento_id: recebimento?.id || null,
            numero_ordem: numeroOrdem,
            cliente_nome: recebimento?.cliente || '',
            equipamento: recebimento?.equipamento || '',
            tecnico: formData.tecnico,
            data_entrada: recebimento?.data_entrada || new Date().toISOString(),
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
            observacoes_tecnicas: formData.observacoes
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar ordem:', error);
          throw error;
        }
        ordemId = novaOrdem.id;
        console.log('Nova ordem criada com ID:', ordemId);
      }

      // Upload de fotos de chegada (com flag apresentar_orcamento)
      console.log('Iniciando upload de fotos de chegada...');
      for (let i = 0; i < fotosChegada.length; i++) {
        const foto = fotosChegada[i];
        if (foto && recebimento?.id) {
          // Verificar se é um arquivo novo (File) ou URL existente (string)
          if (typeof foto !== 'string' && foto instanceof File) {
            console.log(`Fazendo upload da foto de chegada ${i + 1}...`);
            try {
              const fileExt = foto.name.split('.').pop();
              const fileName = `${recebimento.id}_chegada_${i}_${Date.now()}.${fileExt}`;
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

              await supabase
                .from('fotos_equipamentos')
                .insert({
                  recebimento_id: recebimento.id,
                  arquivo_url: publicUrl,
                  nome_arquivo: fileName,
                  apresentar_orcamento: apresentarOrcamento[i]
                });
              
              console.log(`Foto de chegada ${i + 1} salva com sucesso!`);
            } catch (error) {
              console.error('Erro ao processar foto de chegada:', error);
            }
          } else {
            console.log(`Foto de chegada ${i + 1} já existe (URL):`, foto);
          }
        }
      }

      // Upload de fotos de análise
      console.log('Iniciando upload de fotos de análise...');
      for (let i = 0; i < fotosAnalise.length; i++) {
        const foto = fotosAnalise[i];
        if (foto && recebimento?.id) {
          // Verificar se é um arquivo novo (File) ou URL existente (string)
          if (typeof foto !== 'string' && foto instanceof File) {
            console.log(`Fazendo upload da foto de análise ${i + 1}...`);
            try {
              const fileExt = foto.name.split('.').pop();
              const fileName = `${recebimento.id}_analise_${i}_${Date.now()}.${fileExt}`;
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

              await supabase
                .from('fotos_equipamentos')
                .insert({
                  recebimento_id: recebimento.id,
                  arquivo_url: publicUrl,
                  nome_arquivo: fileName,
                  apresentar_orcamento: false
                });
              
              console.log(`Foto de análise ${i + 1} salva com sucesso!`);
            } catch (error) {
              console.error('Erro ao processar foto de análise:', error);
            }
          } else {
            console.log(`Foto de análise ${i + 1} já existe (URL):`, foto);
          }
        }
      }

      console.log('Salvamento completo!');
      toast({
        title: isEdicao ? "Ordem de serviço atualizada!" : "Ordem de serviço criada!",
        description: isEdicao ? "A ordem de serviço foi atualizada com sucesso." : "A ordem de serviço foi criada com sucesso.",
      });

      navigate('/analise');
    } catch (error) {
      console.error('Erro ao salvar ordem de serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar a ordem de serviço. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <p>Carregando...</p>
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
              <p>Recebimento não encontrado.</p>
              <Button onClick={() => navigate('/recebimentos')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Recebimentos
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
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdicao ? 'Editar Análise Técnica' : 'Nova Análise Técnica'}
          </h1>
          <p className="text-muted-foreground">
            {isEdicao ? 'Editando análise para:' : 'Criar análise para:'} {recebimento.equipamento} - {recebimento.cliente}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📋 Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                  <p className="font-semibold text-primary">{recebimento.cliente}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Entrada</Label>
                  <p className="font-medium">{recebimento.dataEntrada}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nota Fiscal</Label>
                  <p className="font-medium">{recebimento.nota_fiscal || 'Não informada'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nº da Ordem</Label>
                  <p className="font-medium">{recebimento.numeroOrdem}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Equipamento</Label>
                  <p className="font-medium">{recebimento.equipamento}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nº de Série</Label>
                  <p className="font-medium">{recebimento.numero_serie || 'Não informado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📷 Fotos da Chegada do Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            <p className="text-sm text-muted-foreground">Adicionar Foto</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`orcamento-${index}`}
                        checked={apresentarOrcamento[index]}
                        onCheckedChange={(checked) => {
                          const newArray = [...apresentarOrcamento];
                          newArray[index] = checked as boolean;
                          setApresentarOrcamento(newArray);
                        }}
                      />
                      <Label htmlFor={`orcamento-${index}`} className="text-sm">Apresentar Orçamento</Label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚙️ Dados Técnicos (Editáveis)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tipoEquipamento">Tipo Equipamento</Label>
                  <Input
                    id="tipoEquipamento"
                    value={dadosTecnicos.tipoEquipamento}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, tipoEquipamento: e.target.value })}
                    placeholder="Ex: Bomba Centrífuga"
                  />
                </div>
                <div>
                  <Label htmlFor="pressaoTrabalho">Pressão de Trabalho</Label>
                  <Input
                    id="pressaoTrabalho"
                    value={dadosTecnicos.pressaoTrabalho}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, pressaoTrabalho: e.target.value })}
                    placeholder="Ex: 350 bar"
                  />
                </div>
                <div>
                  <Label htmlFor="camisa">Camisa</Label>
                  <Input
                    id="camisa"
                    value={dadosTecnicos.camisa}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, camisa: e.target.value })}
                    placeholder="Ex: 100mm"
                  />
                </div>
                <div>
                  <Label htmlFor="hasteComprimento">Haste x Comprimento</Label>
                  <Input
                    id="hasteComprimento"
                    value={dadosTecnicos.hasteComprimento}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, hasteComprimento: e.target.value })}
                    placeholder="Ex: 800mm"
                  />
                </div>
                <div>
                  <Label htmlFor="curso">Curso</Label>
                  <Input
                    id="curso"
                    value={dadosTecnicos.curso}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, curso: e.target.value })}
                    placeholder="Ex: 600mm"
                  />
                </div>
                <div>
                  <Label htmlFor="conexaoA">Conexão A</Label>
                  <Input
                    id="conexaoA"
                    value={dadosTecnicos.conexaoA}
                    onChange={(e) => setDadosTecnicos({ ...dadosTecnicos, conexaoA: e.target.value })}
                    placeholder="Ex: 3/4 NPT"
                  />
                </div>
                <div>
                  <Label htmlFor="conexaoB">Conexão B</Label>
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

          {recebimento.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📝 Observações
                </CardTitle>
                <CardDescription>Observações de Entrada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{recebimento.observacoes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Dados de Peritagem</CardTitle>
              <CardDescription>
                Informações da peritagem técnica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="problemas">Problemas Identificados</Label>
                <Textarea
                  id="problemas"
                  value={formData.problemas}
                  onChange={(e) => setFormData({ ...formData, problemas: e.target.value })}
                  placeholder="Descreva os problemas encontrados no equipamento..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações Adicionais</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações gerais sobre o equipamento ou análise..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Upload de Fotos da Análise */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Foto {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  {previewsAnalise[index] ? (
                    // Mostrar preview da foto
                    <div className="relative">
                      <img 
                        src={previewsAnalise[index]} 
                        alt={`Foto análise ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newPreviews = [...previewsAnalise];
                          newPreviews[index] = '';
                          setPreviewsAnalise(newPreviews);
                          
                          const newFotos = [...fotosAnalise];
                          newFotos[index] = undefined as any;
                          setFotosAnalise(newFotos);
                        }}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/80"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    // Mostrar área de upload
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        id={`foto-analise-${index}`}
                        onChange={handleFotoAnaliseChange(index)}
                      />
                      <label htmlFor={`foto-analise-${index}`} className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Upload</p>
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚙️ Serviços
              </CardTitle>
              <CardDescription>
                Selecione os serviços realizados
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
                  <Label htmlFor="desmontagem">Desmontagem e Montagem</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="limpeza"
                    checked={servicosPreDeterminados.limpeza}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, limpeza: checked as boolean})
                    }
                  />
                  <Label htmlFor="limpeza">Limpeza do Equipamento</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="teste"
                    checked={servicosPreDeterminados.teste}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, teste: checked as boolean})
                    }
                  />
                  <Label htmlFor="teste">Teste de Performance ISO 10100</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pintura"
                    checked={servicosPreDeterminados.pintura}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, pintura: checked as boolean})
                    }
                  />
                  <Label htmlFor="pintura">Pintura do Equipamento</Label>
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox 
                    id="recondicionamento"
                    checked={servicosPreDeterminados.recondicionamento}
                    onCheckedChange={(checked) => 
                      setServicosPreDeterminados({...servicosPreDeterminados, recondicionamento: checked as boolean})
                    }
                  />
                  <Label htmlFor="recondicionamento">Recondicionamento de Roscas</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="servicosPersonalizados">Serviços Adicionais</Label>
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                  <div>
                    <Label htmlFor="qtd-servicos-adicionais" className="text-xs text-muted-foreground">Quantidade</Label>
                    <Input
                      id="qtd-servicos-adicionais"
                      type="number"
                      min="1"
                      className="w-20"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nome-servicos-adicionais" className="text-xs text-muted-foreground">Nome do Serviço</Label>
                    <Input
                      id="nome-servicos-adicionais"
                      value={servicosPersonalizados}
                      onChange={(e) => setServicosPersonalizados(e.target.value)}
                      placeholder="Descreva outros serviços realizados no equipamento..."
                    />
                  </div>
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
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-desmontagem" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-desmontagem"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={servicosQuantidades.desmontagem}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              desmontagem: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {servicosPreDeterminados.limpeza && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-limpeza" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-limpeza"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={servicosQuantidades.limpeza}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              limpeza: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {servicosPreDeterminados.teste && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-teste" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-teste"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={servicosQuantidades.teste}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              teste: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {servicosPreDeterminados.pintura && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-pintura" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-pintura"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={servicosQuantidades.pintura}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              pintura: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {servicosPreDeterminados.recondicionamento && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-recondicionamento" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-recondicionamento"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={servicosQuantidades.recondicionamento}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              recondicionamento: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {servicosPersonalizados.trim() && (
                       <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-personalizado" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-personalizado"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={servicosQuantidades.personalizado}
                            onChange={(e) => setServicosQuantidades({
                              ...servicosQuantidades, 
                              personalizado: parseInt(e.target.value) || 1
                            })}
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
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                  <div>
                    <Label htmlFor="qtd-usinagem-adicionais" className="text-xs text-muted-foreground">Quantidade</Label>
                    <Input
                      id="qtd-usinagem-adicionais"
                      type="number"
                      min="1"
                      className="w-20"
                      value={usinagemQuantidades.personalizada}
                      onChange={(e) => setUsinagemQuantidades({
                        ...usinagemQuantidades, 
                        personalizada: parseInt(e.target.value) || 1
                      })}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nome-usinagem-adicionais" className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                    <Input
                      id="nome-usinagem-adicionais"
                      value={usinagemPersonalizada}
                      onChange={(e) => setUsinagemPersonalizada(e.target.value)}
                      placeholder="Descreva outros trabalhos de usinagem realizados..."
                    />
                  </div>
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
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-haste" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-usinagem-haste"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={usinagemQuantidades.usinagemHaste}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemHaste: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {usinagem.usinagemTampaGuia && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-tampa" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-usinagem-tampa"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={usinagemQuantidades.usinagemTampaGuia}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemTampaGuia: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {usinagem.usinagemEmbolo && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-embolo" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-usinagem-embolo"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={usinagemQuantidades.usinagemEmbolo}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemEmbolo: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {usinagem.usinagemCabecoteDianteiro && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-dianteiro" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-usinagem-dianteiro"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={usinagemQuantidades.usinagemCabecoteDianteiro}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemCabecoteDianteiro: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {usinagem.usinagemCabecoteTraseiro && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-traseiro" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-usinagem-traseiro"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={usinagemQuantidades.usinagemCabecoteTraseiro}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              usinagemCabecoteTraseiro: parseInt(e.target.value) || 1
                            })}
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
                      </div>
                    )}
                    {usinagemPersonalizada.trim() && (
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-center p-3 bg-background rounded-lg border">
                        <div>
                          <Label htmlFor="qtd-usinagem-personalizada" className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            id="qtd-usinagem-personalizada"
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={usinagemQuantidades.personalizada}
                            onChange={(e) => setUsinagemQuantidades({
                              ...usinagemQuantidades, 
                              personalizada: parseInt(e.target.value) || 1
                            })}
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
                <div className="grid grid-cols-6 gap-2 items-end">
                  <div>
                    <Label>Peça</Label>
                    <Input
                      placeholder="Nome da peça"
                      value={novaPeca.peca}
                      onChange={(e) => setNovaPeca({
                        ...novaPeca,
                        peca: e.target.value
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Material</Label>
                    <Select 
                      value={novaPeca.material} 
                      onValueChange={(value) => setNovaPeca({
                        ...novaPeca,
                        material: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borracha">Borracha</SelectItem>
                        <SelectItem value="viton">Viton</SelectItem>
                        <SelectItem value="nbr">NBR</SelectItem>
                        <SelectItem value="teflon">Teflon</SelectItem>
                        <SelectItem value="aco-inox">Aço Inox</SelectItem>
                        <SelectItem value="aco-carbono">Aço Carbono</SelectItem>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="lata">Lata</SelectItem>
                        <SelectItem value="plastico">Plástico</SelectItem>
                      </SelectContent>
                    </Select>  
                  </div>
                  
                  <div>
                    <Label>Medida 1</Label>
                    <Input
                      placeholder="Ø"
                      value={novaPeca.medida1}
                      onChange={(e) => setNovaPeca({
                        ...novaPeca,
                        medida1: e.target.value
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Medida 2</Label>
                    <Input
                      placeholder="Altura"
                      value={novaPeca.medida2}
                      onChange={(e) => setNovaPeca({
                        ...novaPeca,
                        medida2: e.target.value
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Medida 3</Label>
                    <Input
                      placeholder="Espessura"
                      value={novaPeca.medida3}
                      onChange={(e) => setNovaPeca({
                        ...novaPeca,
                        medida3: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="bg-primary hover:bg-primary-hover text-primary-foreground"
                      onClick={() => {
                        if (novaPeca.peca && novaPeca.material) {
                          setPecasUtilizadas([...pecasUtilizadas, { ...novaPeca }]);
                          setNovaPeca({
                            quantidade: 1,
                            peca: "",
                            material: "",
                            medida1: "",
                            medida2: "",
                            medida3: ""
                          });
                        }
                      }}
                    >
                      Adicionar Peça
                    </Button>
                  </div>
                </div>

                {/* Seção de Peças Adicionais */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    🔧 Peças Adicionais
                  </h4>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={novaPeca.quantidade}
                        onChange={(e) => setNovaPeca({
                          ...novaPeca,
                          quantidade: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label>Nome da Peça</Label>
                      <Input
                        placeholder="Descreva outros trabalhos de usinagem realizados..."
                        value={novaPeca.peca}
                        onChange={(e) => setNovaPeca({
                          ...novaPeca,
                          peca: e.target.value
                        })}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button
                        type="button"
                        className="bg-primary hover:bg-primary-hover text-primary-foreground"
                        onClick={() => {
                          if (novaPeca.peca && novaPeca.quantidade) {
                            setPecasUtilizadas([...pecasUtilizadas, { 
                              ...novaPeca, 
                              material: "-", 
                              medida1: "-", 
                              medida2: "-", 
                              medida3: "-" 
                            }]);
                            setNovaPeca({
                              quantidade: 1,
                              peca: "",
                              material: "",
                              medida1: "",
                              medida2: "",
                              medida3: ""
                            });
                          }
                        }}
                      >
                        Adicionar Peça
                      </Button>
                    </div>
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
                        <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center p-3 bg-background rounded-lg border">
                          <div>
                            <Label htmlFor={`qtd-peca-${index}`} className="text-xs text-muted-foreground">Quantidade</Label>
                            <Input
                              id={`qtd-peca-${index}`}
                              type="number"
                              min="1"
                              className="w-20 h-8"
                              value={peca.quantidade}
                              onChange={(e) => {
                                const newPecas = [...pecasUtilizadas];
                                newPecas[index].quantidade = parseInt(e.target.value) || 1;
                                setPecasUtilizadas(newPecas);
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`nome-peca-${index}`} className="text-xs text-muted-foreground">Peça</Label>
                            <Select 
                              value={peca.peca} 
                              onValueChange={(value) => {
                                const newPecas = [...pecasUtilizadas];
                                newPecas[index].peca = value;
                                setPecasUtilizadas(newPecas);
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Selecione a peça" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="anel-vedacao">Anel de Vedação</SelectItem>
                                <SelectItem value="oring">O-Ring</SelectItem>
                                <SelectItem value="retentores">Retentores</SelectItem>
                                <SelectItem value="haste">Haste</SelectItem>
                                <SelectItem value="embolo">Êmbolo</SelectItem>
                                <SelectItem value="bucha">Bucha</SelectItem>
                                <SelectItem value="tampa">Tampa</SelectItem>
                                <SelectItem value="parafuso">Parafuso</SelectItem>
                                <SelectItem value="arruela">Arruela</SelectItem>
                                <SelectItem value="porca">Porca</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`material-peca-${index}`} className="text-xs text-muted-foreground">Material</Label>
                            <Select 
                              value={peca.material} 
                              onValueChange={(value) => {
                                const newPecas = [...pecasUtilizadas];
                                newPecas[index].material = value;
                                setPecasUtilizadas(newPecas);
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Material" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="borracha">Borracha</SelectItem>
                                <SelectItem value="viton">Viton</SelectItem>
                                <SelectItem value="nbr">NBR</SelectItem>
                                <SelectItem value="teflon">Teflon</SelectItem>
                                <SelectItem value="aco-inox">Aço Inox</SelectItem>
                                <SelectItem value="aco-carbono">Aço Carbono</SelectItem>
                                <SelectItem value="bronze">Bronze</SelectItem>
                                <SelectItem value="lata">Lata</SelectItem>
                                <SelectItem value="plastico">Plástico</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`medida1-peca-${index}`} className="text-xs text-muted-foreground">Medida 1</Label>
                            <Input
                              id={`medida1-peca-${index}`}
                              placeholder="Ø"
                              className="h-8"
                              value={peca.medida1}
                              onChange={(e) => {
                                const newPecas = [...pecasUtilizadas];
                                newPecas[index].medida1 = e.target.value;
                                setPecasUtilizadas(newPecas);
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`medida2-peca-${index}`} className="text-xs text-muted-foreground">Medida 2</Label>
                            <Input
                              id={`medida2-peca-${index}`}
                              placeholder="Altura"
                              className="h-8"
                              value={peca.medida2}
                              onChange={(e) => {
                                const newPecas = [...pecasUtilizadas];
                                newPecas[index].medida2 = e.target.value;
                                setPecasUtilizadas(newPecas);
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`medida3-peca-${index}`} className="text-xs text-muted-foreground">Medida 3</Label>
                            <Input
                              id={`medida3-peca-${index}`}
                              placeholder="Espessura"
                              className="h-8"
                              value={peca.medida3}
                              onChange={(e) => {
                                const newPecas = [...pecasUtilizadas];
                                newPecas[index].medida3 = e.target.value;
                                setPecasUtilizadas(newPecas);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/analise')}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              variant="outline" 
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth"
              onClick={() => exportToPDF(ordemExistente, recebimento)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {isEdicao ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NovaOrdemServico;
