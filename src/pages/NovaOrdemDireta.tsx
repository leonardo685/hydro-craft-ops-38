import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Upload, Camera, FileText, Trash2, UserPlus } from "lucide-react";
import { QuantityInput } from "@/components/QuantityInput";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClientes } from "@/hooks/use-clientes";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useLanguage } from "@/contexts/LanguageContext";

const NovaOrdemDireta = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientes } = useClientes();
  const { empresaAtual } = useEmpresa();
  const { t, language } = useLanguage();
  
  const [formData, setFormData] = useState({
    cliente: "",
    orcamentoVinculado: "",
    dataAbertura: new Date().toISOString().split('T')[0],
    numeroNota: "",
    numeroSerie: "",
    urgencia: false,
    solicitante: "",
    equipamento: "",
    numeroOrdem: "",
    tecnico: "",
    problemas: "",
    prazoEstimado: "",
    prioridade: "Média",
    observacoes: "",
    motivoFalha: ""
  });

  const [orcamentosDisponiveis, setOrcamentosDisponiveis] = useState<any[]>([]);

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

  // Fotos de chegada (4 slots fixos) - igual ao NovaAnalise
  const [fotosChegada, setFotosChegada] = useState<(File | null)[]>([null, null, null, null]);
  const [previewsChegada, setPreviewsChegada] = useState<string[]>([]);
  
  // Fotos de análise/peritagem (8 slots) - igual ao NovaAnalise
  const [fotosAnalise, setFotosAnalise] = useState<File[]>([]);
  const [previewsAnalise, setPreviewsAnalise] = useState<string[]>([]);

  const [pecasUtilizadas, setPecasUtilizadas] = useState<Array<{
    quantidade: number;
    peca: string;
  }>>([]);
  
  const [novaPecaAdicional, setNovaPecaAdicional] = useState({
    quantidade: 1,
    peca: ""
  });

  const [documentos, setDocumentos] = useState<Array<{ file: File; nome: string; tipo: string }>>([]);

  // Serviços pré-determinados
  const [servicosPreDeterminados, setServicosPreDeterminados] = useState({
    desmontagem: false,
    limpeza: false,
    teste: false,
    pintura: false,
    recondicionamento: false
  });
  const [servicosPersonalizados, setServicosPersonalizados] = useState("");

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

  // Usinagem
  const [usinagem, setUsinagem] = useState({
    usinagemHaste: false,
    usinagemTampaGuia: false,
    usinagemEmbolo: false,
    usinagemCabecoteDianteiro: false,
    usinagemCabecoteTraseiro: false
  });
  const [usinagemPersonalizada, setUsinagemPersonalizada] = useState("");

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

  // Atualizar nomes quando o idioma mudar
  useEffect(() => {
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

  // Gerar número da ordem automaticamente
  useEffect(() => {
    const gerarNumeroOrdem = async () => {
      try {
        if (empresaAtual?.id) {
          const { data, error } = await supabase.rpc('gerar_proximo_numero_ordem', {
            p_empresa_id: empresaAtual.id
          });
          
          if (!error && data) {
            setFormData(prev => ({ ...prev, numeroOrdem: data }));
            return;
          }
          console.warn('Erro na RPC, usando fallback:', error);
        }
        
        const ano = new Date().getFullYear().toString().slice(-2);
        const timestamp = Date.now().toString().slice(-4);
        const numeroFormatado = `MH-${timestamp}-${ano}`;
        setFormData(prev => ({ ...prev, numeroOrdem: numeroFormatado }));
      } catch (error) {
        console.error('Erro ao gerar número da ordem:', error);
        const ano = new Date().getFullYear().toString().slice(-2);
        const timestamp = Date.now().toString().slice(-4);
        setFormData(prev => ({ ...prev, numeroOrdem: `MH-${timestamp}-${ano}` }));
      }
    };

    gerarNumeroOrdem();
  }, [empresaAtual?.id]);

  // Carregar orçamentos disponíveis
  useEffect(() => {
    const carregarOrcamentos = async () => {
      try {
        const { data, error } = await supabase
          .from('orcamentos')
          .select('*')
          .in('status', ['pendente', 'aprovado', 'faturamento'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrcamentosDisponiveis(data || []);
      } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
      }
    };

    carregarOrcamentos();
  }, []);

  // Handler para fotos de chegada (igual ao NovaAnalise)
  const handlePhotoUpload = (index: number, file: File | null) => {
    const newFotos = [...fotosChegada];
    newFotos[index] = file;
    setFotosChegada(newFotos);

    const newPreviews = [...previewsChegada];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string;
        setPreviewsChegada([...newPreviews]);
      };
      reader.readAsDataURL(file);
    } else {
      newPreviews[index] = '';
      setPreviewsChegada([...newPreviews]);
    }
  };

  const openFileSelector = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      handlePhotoUpload(index, file);
    };
    input.click();
  };

  // Handler para fotos de análise (igual ao NovaAnalise)
  const handleFotoAnaliseChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFotos = [...fotosAnalise];
      newFotos[index] = file;
      setFotosAnalise(newFotos);

      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...previewsAnalise];
        newPreviews[index] = reader.result as string;
        setPreviewsAnalise(newPreviews);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler para documentos
  const handleDocumentoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocumentos: Array<{ file: File; nome: string; tipo: string }> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tipo = file.type;
      
      if (
        tipo.includes('pdf') || 
        tipo.includes('spreadsheet') || 
        tipo.includes('excel') ||
        tipo.includes('word') ||
        tipo.includes('document') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.pdf') ||
        file.name.endsWith('.doc') ||
        file.name.endsWith('.docx')
      ) {
        newDocumentos.push({ 
          file, 
          nome: file.name,
          tipo: file.type || 'application/octet-stream'
        });
      } else {
        toast({
          title: "Formato não suportado",
          description: `O arquivo ${file.name} não é um documento válido (PDF, Excel, Word)`,
          variant: "destructive"
        });
      }
    }

    setDocumentos([...documentos, ...newDocumentos]);
  };

  // Montar serviços para salvar
  const montarServicos = () => {
    const servicos: Array<{ quantidade: number; nome: string; codigo?: string }> = [];

    if (servicosPreDeterminados.desmontagem) {
      servicos.push({
        quantidade: servicosQuantidades.desmontagem,
        nome: servicosNomes.desmontagem,
        codigo: (servicosQuantidades as any).desmontagem_codigo || ""
      });
    }
    if (servicosPreDeterminados.limpeza) {
      servicos.push({
        quantidade: servicosQuantidades.limpeza,
        nome: servicosNomes.limpeza,
        codigo: (servicosQuantidades as any).limpeza_codigo || ""
      });
    }
    if (servicosPreDeterminados.teste) {
      servicos.push({
        quantidade: servicosQuantidades.teste,
        nome: servicosNomes.teste,
        codigo: (servicosQuantidades as any).teste_codigo || ""
      });
    }
    if (servicosPreDeterminados.pintura) {
      servicos.push({
        quantidade: servicosQuantidades.pintura,
        nome: servicosNomes.pintura,
        codigo: (servicosQuantidades as any).pintura_codigo || ""
      });
    }
    if (servicosPreDeterminados.recondicionamento) {
      servicos.push({
        quantidade: servicosQuantidades.recondicionamento,
        nome: servicosNomes.recondicionamento,
        codigo: (servicosQuantidades as any).recondicionamento_codigo || ""
      });
    }
    if (servicosPersonalizados.trim()) {
      servicos.push({
        quantidade: servicosQuantidades.personalizado,
        nome: servicosPersonalizados,
        codigo: (servicosQuantidades as any).personalizado_codigo || ""
      });
    }

    servicosAdicionais.forEach(servico => {
      servicos.push(servico);
    });

    return servicos;
  };

  // Montar usinagem para salvar
  const montarUsinagem = () => {
    const usinagens: Array<{ quantidade: number; nome: string; codigo?: string }> = [];

    if (usinagem.usinagemHaste) {
      usinagens.push({
        quantidade: usinagemQuantidades.usinagemHaste,
        nome: usinagemNomes.usinagemHaste,
        codigo: (usinagemQuantidades as any).usinagemHaste_codigo || ""
      });
    }
    if (usinagem.usinagemTampaGuia) {
      usinagens.push({
        quantidade: usinagemQuantidades.usinagemTampaGuia,
        nome: usinagemNomes.usinagemTampaGuia,
        codigo: (usinagemQuantidades as any).usinagemTampaGuia_codigo || ""
      });
    }
    if (usinagem.usinagemEmbolo) {
      usinagens.push({
        quantidade: usinagemQuantidades.usinagemEmbolo,
        nome: usinagemNomes.usinagemEmbolo,
        codigo: (usinagemQuantidades as any).usinagemEmbolo_codigo || ""
      });
    }
    if (usinagem.usinagemCabecoteDianteiro) {
      usinagens.push({
        quantidade: usinagemQuantidades.usinagemCabecoteDianteiro,
        nome: usinagemNomes.usinagemCabecoteDianteiro,
        codigo: (usinagemQuantidades as any).usinagemCabecoteDianteiro_codigo || ""
      });
    }
    if (usinagem.usinagemCabecoteTraseiro) {
      usinagens.push({
        quantidade: usinagemQuantidades.usinagemCabecoteTraseiro,
        nome: usinagemNomes.usinagemCabecoteTraseiro,
        codigo: (usinagemQuantidades as any).usinagemCabecoteTraseiro_codigo || ""
      });
    }
    if (usinagemPersonalizada.trim()) {
      usinagens.push({
        quantidade: usinagemQuantidades.personalizada,
        nome: usinagemPersonalizada,
        codigo: (usinagemQuantidades as any).personalizada_codigo || ""
      });
    }

    usinagemAdicional.forEach(item => {
      usinagens.push(item);
    });

    return usinagens;
  };

  // Upload de fotos
  const uploadFotos = async (ordemId: string) => {
    const todasFotos = [
      ...fotosChegada.filter(f => f !== null),
      ...fotosAnalise.filter(f => f !== undefined && f !== null)
    ];

    if (todasFotos.length === 0) return;

    for (const foto of todasFotos) {
      if (!foto) continue;
      
      const timestamp = Date.now();
      const fileName = `${ordemId}_${timestamp}_${foto.name}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('equipamentos')
        .upload(filePath, foto);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('equipamentos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('fotos_equipamentos')
        .insert({
          ordem_servico_id: ordemId,
          arquivo_url: urlData.publicUrl,
          nome_arquivo: foto.name,
          apresentar_orcamento: false,
          empresa_id: empresaAtual?.id || null
        });

      if (dbError) throw dbError;
    }
  };

  // Upload de documentos
  const uploadDocumentos = async (ordemId: string) => {
    if (documentos.length === 0) return;

    for (const documento of documentos) {
      const timestamp = Date.now();
      const fileName = `${ordemId}_${timestamp}_${documento.file.name}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-tecnicos')
        .upload(filePath, documento.file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documentos-tecnicos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('documentos_ordem')
        .insert({
          ordem_servico_id: ordemId,
          arquivo_url: urlData.publicUrl,
          nome_arquivo: documento.file.name,
          tipo_arquivo: documento.tipo,
          tamanho_bytes: documento.file.size,
          empresa_id: empresaAtual?.id || null
        });

      if (dbError) throw dbError;
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.cliente || !formData.equipamento) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha Cliente e Equipamento",
          variant: "destructive"
        });
        return;
      }

      const clienteSelecionado = clientes.find(c => c.id === formData.cliente);

      const ordemData = {
        numero_ordem: formData.numeroOrdem,
        cliente_nome: clienteSelecionado?.nome || '',
        equipamento: formData.equipamento,
        tecnico: formData.tecnico,
        descricao_problema: formData.problemas,
        motivo_falha: formData.motivoFalha,
        tempo_estimado: formData.prazoEstimado,
        prioridade: formData.prioridade.toLowerCase(),
        observacoes_tecnicas: formData.observacoes,
        status: 'pendente',
        data_entrada: formData.dataAbertura,
        recebimento_id: null,
        orcamento_id: formData.orcamentoVinculado || null,
        pecas_necessarias: pecasUtilizadas,
        servicos_necessarios: montarServicos(),
        usinagem_necessaria: montarUsinagem(),
        empresa_id: empresaAtual?.id || null
      };

      const { data, error } = await supabase
        .from('ordens_servico')
        .insert(ordemData)
        .select()
        .single();

      if (error) throw error;

      await uploadFotos(data.id);
      await uploadDocumentos(data.id);

      toast({
        title: "Sucesso!",
        description: "Ordem de serviço criada com sucesso"
      });

      navigate('/analise');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar ordem de serviço",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/analise')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('novaAnalise.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Nova Análise</h1>
              <p className="text-muted-foreground">Ordem sem vinculação a recebimento</p>
            </div>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {t('novaAnalise.save')}
          </Button>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>{t('novaAnalise.basicInfo')}</CardTitle>
            <CardDescription>Dados principais da ordem de serviço</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">{t('novaAnalise.orderNumber')}</Label>
                <p className="font-medium">{formData.numeroOrdem}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">{t('novaAnalise.entryDate')}</Label>
                <Input
                  type="date"
                  value={formData.dataAbertura}
                  onChange={(e) => setFormData({...formData, dataAbertura: e.target.value})}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="urgencia"
                  checked={formData.urgencia}
                  onCheckedChange={(checked) => setFormData({...formData, urgencia: checked as boolean})}
                />
                <Label htmlFor="urgencia">Urgência</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">{t('novaAnalise.client')}*</Label>
                <Select value={formData.cliente} onValueChange={(value) => setFormData({...formData, cliente: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome} {cliente.cnpj_cpf ? `(${cliente.cnpj_cpf.slice(-4)})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => navigate("/cadastros")}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Cliente
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipamento">{t('novaAnalise.equipmentType')}*</Label>
                <Input
                  id="equipamento"
                  value={formData.equipamento}
                  onChange={(e) => setFormData({...formData, equipamento: e.target.value})}
                  placeholder="Tipo de equipamento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroSerie">{t('novaAnalise.serialNumber')}</Label>
                <Input
                  id="numeroSerie"
                  value={formData.numeroSerie}
                  onChange={(e) => setFormData({...formData, numeroSerie: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numeroNota">{t('novaAnalise.invoice')}</Label>
                <Input
                  id="numeroNota"
                  value={formData.numeroNota}
                  onChange={(e) => setFormData({...formData, numeroNota: e.target.value})}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orcamentoVinculado">Vincular Orçamento (Opcional)</Label>
                <Select 
                  value={formData.orcamentoVinculado} 
                  onValueChange={(value) => setFormData({...formData, orcamentoVinculado: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum orçamento vinculado" />
                  </SelectTrigger>
                  <SelectContent>
                    {orcamentosDisponiveis.map(orc => (
                      <SelectItem key={orc.id} value={orc.id}>
                        {orc.numero} - {orc.cliente_nome} - {orc.equipamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos de Chegada - igual ao NovaAnalise */}
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

        {/* Dados Técnicos - igual ao NovaAnalise */}
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

        {/* Dados da Peritagem */}
        <Card>
          <CardHeader>
            <CardTitle>{t('novaAnalise.expertiseData')}</CardTitle>
            <CardDescription>
              {t('novaAnalise.expertiseInfo')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="problemas">{t('novaAnalise.identifiedProblems')}</Label>
              <Textarea
                id="problemas"
                value={formData.problemas}
                onChange={(e) => setFormData({ ...formData, problemas: e.target.value })}
                placeholder={t('novaAnalise.identifiedProblemsPlaceholder')}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="motivoFalha">Motivo da Falha / Diagnóstico</Label>
              <Textarea
                id="motivoFalha"
                value={formData.motivoFalha}
                onChange={(e) => setFormData({ ...formData, motivoFalha: e.target.value })}
                placeholder="Descreva a causa raiz da falha do equipamento..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="observacoes">{t('novaAnalise.additionalObservations')}</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder={t('novaAnalise.additionalObservationsPlaceholder')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fotos da Peritagem - igual ao NovaAnalise */}
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
              {Array.from({ length: 8 }, (_, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('novaAnalise.photo')} {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previewsAnalise[index] ? (
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
                          <p className="text-xs text-muted-foreground">{t('novaAnalise.upload')}</p>
                        </label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Serviços - igual ao NovaAnalise */}
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
            
            {/* Serviços Adicionais */}
            <div>
              <Label htmlFor="servicosPersonalizados">{t('novaAnalise.additionalServices')}</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-end p-3 bg-background rounded-lg border">
                  <div>
                    <Label className="text-xs text-muted-foreground">Quantidade</Label>
                    <QuantityInput
                      value={novoServicoAdicional.quantidade}
                      onChange={(value) => setNovoServicoAdicional({
                        ...novoServicoAdicional,
                        quantidade: value
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Código</Label>
                    <Input
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
                    <Label className="text-xs text-muted-foreground">Nome do Serviço</Label>
                    <Input
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
              servicosPreDeterminados.recondicionamento) && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  ✅ Serviços Selecionados
                </h4>
                <div className="space-y-3">
                  {servicosPreDeterminados.desmontagem && (
                    <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                      <div>
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={servicosQuantidades.desmontagem}
                          onChange={(value) => setServicosQuantidades({
                            ...servicosQuantidades, 
                            desmontagem: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome do Serviço</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={servicosQuantidades.limpeza}
                          onChange={(value) => setServicosQuantidades({
                            ...servicosQuantidades, 
                            limpeza: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome do Serviço</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={servicosQuantidades.teste}
                          onChange={(value) => setServicosQuantidades({
                            ...servicosQuantidades, 
                            teste: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome do Serviço</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={servicosQuantidades.pintura}
                          onChange={(value) => setServicosQuantidades({
                            ...servicosQuantidades, 
                            pintura: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome do Serviço</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={servicosQuantidades.recondicionamento}
                          onChange={(value) => setServicosQuantidades({
                            ...servicosQuantidades, 
                            recondicionamento: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome do Serviço</Label>
                        <Input
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
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usinagem - igual ao NovaAnalise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔩 {t('novaAnalise.machining')}
            </CardTitle>
            <CardDescription>
              {t('novaAnalise.selectMachining')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="usinagemHaste"
                  checked={usinagem.usinagemHaste}
                  onCheckedChange={(checked) => 
                    setUsinagem({...usinagem, usinagemHaste: checked as boolean})
                  }
                />
                <Label htmlFor="usinagemHaste">{t('novaAnalise.rodMachining')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="usinagemTampaGuia"
                  checked={usinagem.usinagemTampaGuia}
                  onCheckedChange={(checked) => 
                    setUsinagem({...usinagem, usinagemTampaGuia: checked as boolean})
                  }
                />
                <Label htmlFor="usinagemTampaGuia">{t('novaAnalise.guideCapMachining')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="usinagemEmbolo"
                  checked={usinagem.usinagemEmbolo}
                  onCheckedChange={(checked) => 
                    setUsinagem({...usinagem, usinagemEmbolo: checked as boolean})
                  }
                />
                <Label htmlFor="usinagemEmbolo">{t('novaAnalise.pistonMachining')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="usinagemCabecoteDianteiro"
                  checked={usinagem.usinagemCabecoteDianteiro}
                  onCheckedChange={(checked) => 
                    setUsinagem({...usinagem, usinagemCabecoteDianteiro: checked as boolean})
                  }
                />
                <Label htmlFor="usinagemCabecoteDianteiro">{t('novaAnalise.frontHeadMachining')}</Label>
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox 
                  id="usinagemCabecoteTraseiro"
                  checked={usinagem.usinagemCabecoteTraseiro}
                  onCheckedChange={(checked) => 
                    setUsinagem({...usinagem, usinagemCabecoteTraseiro: checked as boolean})
                  }
                />
                <Label htmlFor="usinagemCabecoteTraseiro">{t('novaAnalise.rearHeadMachining')}</Label>
              </div>
            </div>
            
            {/* Usinagem Adicional */}
            <div>
              <Label>{t('novaAnalise.additionalMachining')}</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-end p-3 bg-background rounded-lg border">
                  <div>
                    <Label className="text-xs text-muted-foreground">Quantidade</Label>
                    <QuantityInput
                      value={novaUsinagemAdicional.quantidade}
                      onChange={(value) => setNovaUsinagemAdicional({
                        ...novaUsinagemAdicional,
                        quantidade: value
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Código</Label>
                    <Input
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
                    <Label className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                    <Input
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
                    {usinagemAdicional.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-muted/30 rounded-lg border">
                        <div>
                          <Label className="text-xs text-muted-foreground">Quantidade</Label>
                          <QuantityInput
                            value={item.quantidade}
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
                            value={item.codigo || ""}
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
                            value={item.nome}
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
              usinagem.usinagemCabecoteTraseiro) && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  ✅ Usinagens Selecionadas
                </h4>
                <div className="space-y-3">
                  {usinagem.usinagemHaste && (
                    <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] gap-2 items-center p-3 bg-background rounded-lg border">
                      <div>
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={usinagemQuantidades.usinagemHaste}
                          onChange={(value) => setUsinagemQuantidades({
                            ...usinagemQuantidades, 
                            usinagemHaste: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={usinagemQuantidades.usinagemTampaGuia}
                          onChange={(value) => setUsinagemQuantidades({
                            ...usinagemQuantidades, 
                            usinagemTampaGuia: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={usinagemQuantidades.usinagemEmbolo}
                          onChange={(value) => setUsinagemQuantidades({
                            ...usinagemQuantidades, 
                            usinagemEmbolo: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={usinagemQuantidades.usinagemCabecoteDianteiro}
                          onChange={(value) => setUsinagemQuantidades({
                            ...usinagemQuantidades, 
                            usinagemCabecoteDianteiro: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Quantidade</Label>
                        <QuantityInput
                          value={usinagemQuantidades.usinagemCabecoteTraseiro}
                          onChange={(value) => setUsinagemQuantidades({
                            ...usinagemQuantidades, 
                            usinagemCabecoteTraseiro: value
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
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
                        <Label className="text-xs text-muted-foreground">Nome da Usinagem</Label>
                        <Input
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
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peças Utilizadas - igual ao NovaAnalise */}
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
                          <Label className="text-xs text-muted-foreground">Quantidade</Label>
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
                          <Label className="text-xs text-muted-foreground">Nome da Peça</Label>
                          <Input
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

        {/* Documentos Técnicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Técnicos
            </CardTitle>
            <CardDescription>Adicione documentos como PDFs, planilhas Excel, desenhos técnicos, cálculos, etc.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".pdf,.xls,.xlsx,.doc,.docx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                onChange={handleDocumentoUpload}
                className="hidden"
                id="documento-upload"
              />
              <Label
                htmlFor="documento-upload"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary-hover transition-colors"
              >
                <Upload className="h-4 w-4" />
                Adicionar Documentos
              </Label>
              <span className="text-sm text-muted-foreground">
                {documentos.length} {documentos.length === 1 ? 'documento adicionado' : 'documentos adicionados'}
              </span>
            </div>

            {documentos.length > 0 && (
              <div className="space-y-2">
                {documentos.map((documento, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg group hover:bg-muted/80 transition-colors">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{documento.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {(documento.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentos(documentos.filter((_, i) => i !== index))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NovaOrdemDireta;
