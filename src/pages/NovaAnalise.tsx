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

const NovaAnalise = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { recebimentos, loading } = useRecebimentos();
  const [recebimento, setRecebimento] = useState<any>(null);
  const [analiseExistente, setAnaliseExistente] = useState<any>(null);
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
    conexaoB: ""
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
  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF();
    let yPosition = 70;
    const lineHeight = 8;
    const pageHeight = 280; // Altura útil da página
    
    // Função para adicionar nova página se necessário
    const checkAndAddPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight) {
        doc.addPage();
        yPosition = 20;
      }
    };
    
    // Função para redimensionar e adicionar imagem
    const addImageToPDF = async (imageUrl: string, title: string, maxWidth = 80, maxHeight = 60) => {
      try {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            // Calcular dimensões mantendo proporção
            let width = img.width;
            let height = img.height;
            
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
            
            checkAndAddPage(height + 15);
            
            // Adicionar título da imagem
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(title, 15, yPosition);
            yPosition += 5;
            
            // Adicionar imagem
            doc.addImage(img, 'JPEG', 15, yPosition, width, height);
            yPosition += height + 10;
            
            resolve();
          };
          img.onerror = () => resolve(); // Continue mesmo se a imagem falhar
          img.src = imageUrl;
        });
      } catch (error) {
        console.error('Erro ao adicionar imagem ao PDF:', error);
      }
    };
    
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
    doc.text('Análise Técnica', 15, 55);
    
    // Data do relatório
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, 55);
    
    // Informações básicas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Informações Básicas', 15, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Cliente: ${recebimento?.cliente || ''}`, 15, yPosition);
    yPosition += lineHeight;
    doc.text(`Equipamento: ${recebimento?.equipamento || ''}`, 15, yPosition);
    yPosition += lineHeight;
    doc.text(`Data de Entrada: ${recebimento?.dataEntrada || ''}`, 15, yPosition);
    yPosition += lineHeight;
    doc.text(`Técnico: ${formData.tecnico}`, 15, yPosition);
    yPosition += lineHeight;
    doc.text(`Prioridade: ${formData.prioridade}`, 15, yPosition);
    yPosition += 15;
    
    // Dados técnicos
    if (dadosTecnicos.tipoEquipamento || dadosTecnicos.pressaoTrabalho) {
      checkAndAddPage(50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Dados Técnicos', 15, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (dadosTecnicos.tipoEquipamento) {
        doc.text(`Tipo de Equipamento: ${dadosTecnicos.tipoEquipamento}`, 15, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.pressaoTrabalho) {
        doc.text(`Pressão de Trabalho: ${dadosTecnicos.pressaoTrabalho}`, 15, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.curso) {
        doc.text(`Curso: ${dadosTecnicos.curso}`, 15, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.camisa) {
        doc.text(`Camisa: ${dadosTecnicos.camisa}`, 15, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.hasteComprimento) {
        doc.text(`Haste x Comprimento: ${dadosTecnicos.hasteComprimento}`, 15, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.conexaoA) {
        doc.text(`Conexão A: ${dadosTecnicos.conexaoA}`, 15, yPosition);
        yPosition += lineHeight;
      }
      if (dadosTecnicos.conexaoB) {
        doc.text(`Conexão B: ${dadosTecnicos.conexaoB}`, 15, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 10;
    }
    
    // Fotos de chegada
    if (previewsChegada.some(preview => preview)) {
      checkAndAddPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Fotos de Chegada do Equipamento', 15, yPosition);
      yPosition += 10;
      
      for (let i = 0; i < previewsChegada.length; i++) {
        if (previewsChegada[i]) {
          await addImageToPDF(previewsChegada[i], `Foto de Chegada ${i + 1}`);
        }
      }
    }
    
    // Problemas identificados
    if (formData.problemas) {
      checkAndAddPage(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Problemas Identificados', 15, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitProblemas = doc.splitTextToSize(formData.problemas, 180);
      doc.text(splitProblemas, 15, yPosition);
      yPosition += splitProblemas.length * lineHeight + 10;
    }
    
    // Serviços
    const servicosSelecionados = Object.entries(servicosPreDeterminados)
      .filter(([_, selecionado]) => selecionado)
      .map(([servico, _]) => {
        const quantidade = servicosQuantidades[servico as keyof typeof servicosQuantidades];
        const nome = servicosNomes[servico as keyof typeof servicosNomes];
        return `${quantidade}x ${nome}`;
      });
    
    if (servicosSelecionados.length > 0 || servicosPersonalizados) {
      checkAndAddPage(20 + servicosSelecionados.length * lineHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Serviços', 15, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      servicosSelecionados.forEach(servico => {
        doc.text(`• ${servico}`, 15, yPosition);
        yPosition += lineHeight;
      });
      
      if (servicosPersonalizados) {
        const quantidade = servicosQuantidades.personalizado;
        const splitServicos = doc.splitTextToSize(`• ${quantidade}x ${servicosPersonalizados}`, 180);
        doc.text(splitServicos, 15, yPosition);
        yPosition += splitServicos.length * lineHeight;
      }
      yPosition += 10;
    }
    
    // Usinagem
    const usinagemSelecionada = Object.entries(usinagem)
      .filter(([_, selecionado]) => selecionado)
      .map(([tipo, _]) => {
        const quantidade = usinagemQuantidades[tipo as keyof typeof usinagemQuantidades];
        const nome = usinagemNomes[tipo as keyof typeof usinagemNomes];
        return `${quantidade}x ${nome}`;
      });
    
    if (usinagemSelecionada.length > 0 || usinagemPersonalizada) {
      checkAndAddPage(20 + usinagemSelecionada.length * lineHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Usinagem', 15, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      usinagemSelecionada.forEach(tipo => {
        doc.text(`• ${tipo}`, 15, yPosition);
        yPosition += lineHeight;
      });
      
      if (usinagemPersonalizada) {
        const quantidade = usinagemQuantidades.personalizada;
        const splitUsinagem = doc.splitTextToSize(`• ${quantidade}x ${usinagemPersonalizada}`, 180);
        doc.text(splitUsinagem, 15, yPosition);
        yPosition += splitUsinagem.length * lineHeight;
      }
      yPosition += 10;
    }
    
    // Peças utilizadas
    if (pecasUtilizadas.length > 0) {
      checkAndAddPage(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Peças Utilizadas', 15, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      pecasUtilizadas.forEach(peca => {
        const pecaText = `${peca.quantidade}x ${peca.peca} (${peca.material}) - ${peca.medida1} x ${peca.medida2} x ${peca.medida3}`;
        const splitPecaText = doc.splitTextToSize(pecaText, 180);
        doc.text(splitPecaText, 15, yPosition);
        yPosition += splitPecaText.length * lineHeight;
      });
      yPosition += 10;
    }
    
    // Fotos da análise
    if (previewsAnalise.some(preview => preview)) {
      checkAndAddPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Fotos da Análise', 15, yPosition);
      yPosition += 10;
      
      for (let i = 0; i < previewsAnalise.length; i++) {
        if (previewsAnalise[i]) {
          await addImageToPDF(previewsAnalise[i], `Foto da Análise ${i + 1}`);
        }
      }
    }
    
    // Observações
    if (formData.observacoes) {
      checkAndAddPage(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Observações', 15, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitObservacoes = doc.splitTextToSize(formData.observacoes, 180);
      doc.text(splitObservacoes, 15, yPosition);
    }
    
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
    
    doc.save(`analise-tecnica-${recebimento?.cliente || 'cliente'}.pdf`);
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
    if (loading || !recebimentos.length) return;
    
    const decodedId = id ? decodeURIComponent(id) : '';
    console.log('Looking for recebimento with ID:', decodedId);
    console.log('Available recebimentos:', recebimentos);
    
    // Buscar recebimento pelo numero_ordem ou pelo id
    const recebimentoEncontrado = recebimentos.find((r: any) => 
      r.numero_ordem === decodedId || 
      r.id?.toString() === decodedId
    );
    
    console.log('Found recebimento:', recebimentoEncontrado);
    
    if (recebimentoEncontrado) {
      setRecebimento({
        id: recebimentoEncontrado.id,
        cliente: recebimentoEncontrado.cliente_nome,
        equipamento: recebimentoEncontrado.tipo_equipamento,
        dataEntrada: new Date(recebimentoEncontrado.data_entrada).toLocaleDateString('pt-BR'),
        numeroOrdem: recebimentoEncontrado.numero_ordem,
        fotos: recebimentoEncontrado.fotos || []
      });
      
      // Dados técnicos começam vazios para nova análise
      setDadosTecnicos({
        tipoEquipamento: recebimentoEncontrado.tipo_equipamento || "",
        pressaoTrabalho: recebimentoEncontrado.pressao_trabalho || "",
        camisa: "",
        hasteComprimento: "",
        curso: "",
        conexaoA: "",
        conexaoB: ""
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
    console.log('Botão Criar Análise clicado!');
    console.log('Dados do formulário:', formData);
    console.log('Recebimento encontrado:', recebimento);
    
    // Por enquanto, apenas mostrar os dados no console
    // TODO: Implementar salvamento no Supabase quando for necessário
    const dadosAnalise = {
      recebimento_id: recebimento?.id,
      tecnico: formData.tecnico,
      problemas: formData.problemas,
      prazo_estimado: formData.prazoEstimado,
      prioridade: formData.prioridade.toLowerCase(),
      observacoes: formData.observacoes,
      pecas_utilizadas: pecasUtilizadas,
      servicos: servicos,
      usinagem: usinagem,
      servicos_pre_determinados: servicosPreDeterminados,
      servicos_personalizados: servicosPersonalizados,
      fotos_chegada: previewsChegada,
      fotos_analise: previewsAnalise,
      apresentar_orcamento: apresentarOrcamento,
      dados_tecnicos: dadosTecnicos,
      data_criacao: new Date().toISOString()
    };
    
    console.log('Dados da análise preparados:', dadosAnalise);
    alert('Análise criada com sucesso! (dados salvos no console)');
    navigate('/analise');
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
                  <p className="font-medium">{recebimento.notaFiscal || 'NF-005678'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">TAG</Label>
                  <p className="font-medium">{recebimento.tag || 'EQ002'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Solicitante</Label>
                  <p className="font-medium">{recebimento.solicitante || 'Maria Santos'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nº de Série</Label>
                  <p className="font-medium">{recebimento.numeroSerie || 'BH-002-2025'}</p>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Manutenção</Label>
                  <p className="font-medium">{recebimento.tipoManutencao || 'Corretiva'}</p>
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
                    <Select 
                      value={novaPeca.peca} 
                      onValueChange={(value) => setNovaPeca({
                        ...novaPeca,
                        peca: value
                      })}
                    >
                      <SelectTrigger>
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
              onClick={exportToPDF}
            >
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {isEdicao ? 'Salvar Alterações' : 'Criar Análise'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NovaAnalise;
