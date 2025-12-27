import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Upload, Plus, Minus, X, Camera, UserPlus, FileText } from "lucide-react";
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
  const { t } = useLanguage();
  
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
    observacoes: ""
  });

  const [orcamentosDisponiveis, setOrcamentosDisponiveis] = useState<any[]>([]);

  const [dadosTecnicos, setDadosTecnicos] = useState({
    categoriaEquipamento: "cilindro",
    tipoEquipamento: "",
    camisa: "",
    hasteComprimento: "",
    curso: "",
    pressaoTrabalho: "",
    conexaoA: "",
    conexaoB: "",
    ambienteTrabalho: "",
    observacoesTecnicas: ""
  });

  const [pecasUtilizadas, setPecasUtilizadas] = useState<Array<{
    quantidade: number;
    peca: string;
  }>>([]);
  
  const [novaPeca, setNovaPeca] = useState({
    quantidade: 1,
    peca: ""
  });

  const [servicosPreDeterminados, setServicosPreDeterminados] = useState({
    desmontagem: false,
    limpeza: false,
    teste: false,
    pintura: false,
    recondicionamento: false
  });

  const [servicosQuantidades, setServicosQuantidades] = useState({
    desmontagem: 1,
    limpeza: 1,
    teste: 1,
    pintura: 1,
    recondicionamento: 1,
    personalizado: 1
  });

  const [servicosNomes, setServicosNomes] = useState({
    desmontagem: t('analise.disassemblyAssembly'),
    limpeza: t('analise.equipmentCleaning'),
    teste: t('analise.performanceTest'),
    pintura: t('analise.equipmentPainting'),
    recondicionamento: t('analise.threadReconditioning')
  });

  const [servicosAdicionais, setServicosAdicionais] = useState<Array<{ quantidade: number; nome: string; codigo?: string }>>([]);
  const [novoServicoAdicional, setNovoServicoAdicional] = useState({ quantidade: 1, nome: "", codigo: "" });

  const [usinagem, setUsinagem] = useState({
    usinagemHaste: false,
    usinagemTampaGuia: false,
    usinagemEmbolo: false,
    usinagemCabecoteDianteiro: false,
    usinagemCabecoteTraseiro: false
  });

  const [usinagemQuantidades, setUsinagemQuantidades] = useState({
    usinagemHaste: 1,
    usinagemTampaGuia: 1,
    usinagemEmbolo: 1,
    usinagemCabecoteDianteiro: 1,
    usinagemCabecoteTraseiro: 1,
    personalizada: 1
  });

  const [usinagemNomes, setUsinagemNomes] = useState({
    usinagemHaste: t('analise.rodMachining'),
    usinagemTampaGuia: t('analise.guideCapMachining'),
    usinagemEmbolo: t('analise.pistonMachining'),
    usinagemCabecoteDianteiro: t('analise.frontHeadMachining'),
    usinagemCabecoteTraseiro: t('analise.rearHeadMachining')
  });

  const [usinagemAdicional, setUsinagemAdicional] = useState<Array<{ quantidade: number; nome: string; codigo?: string }>>([]);
  const [novaUsinagemAdicional, setNovaUsinagemAdicional] = useState({ quantidade: 1, nome: "", codigo: "" });

  const [fotos, setFotos] = useState<Array<{ file: File; preview: string }>>([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);

  const [documentos, setDocumentos] = useState<Array<{ file: File; nome: string; tipo: string }>>([]);
  const [uploadingDocumentos, setUploadingDocumentos] = useState(false);

  // Gerar número da ordem automaticamente
  useEffect(() => {
    const gerarNumeroOrdem = async () => {
      try {
        const ano = new Date().getFullYear().toString().slice(-2);
        
        // Buscar todas as ordens do ano atual em AMBAS as tabelas
        const [ordensData, recebimentosData] = await Promise.all([
          supabase
            .from('ordens_servico')
            .select('numero_ordem')
            .ilike('numero_ordem', `MH-%-${ano}`),
          supabase
            .from('recebimentos')
            .select('numero_ordem')
            .ilike('numero_ordem', `MH-%-${ano}`)
        ]);

        if (ordensData.error) throw ordensData.error;
        if (recebimentosData.error) throw recebimentosData.error;

        // Combinar os resultados de ambas as tabelas
        const todasOrdens = [
          ...(ordensData.data || []),
          ...(recebimentosData.data || [])
        ];

        let proximoNumero = 1;
        if (todasOrdens.length > 0) {
          // Extrair todos os números e encontrar o maior
          const numeros = todasOrdens
            .map(ordem => {
              const match = ordem.numero_ordem.match(/MH-(\d+)-/);
              return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);
          
          if (numeros.length > 0) {
            proximoNumero = Math.max(...numeros) + 1;
          }
        }

        const numeroFormatado = `MH-${proximoNumero.toString().padStart(3, '0')}-${ano}`;
        
        setFormData(prev => ({ ...prev, numeroOrdem: numeroFormatado }));
      } catch (error) {
        console.error('Erro ao gerar número da ordem:', error);
      }
    };

    gerarNumeroOrdem();
  }, []);

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

  const adicionarPeca = () => {
    if (!novaPeca.peca.trim()) {
      toast({
        title: "Atenção",
        description: "Preencha o nome da peça",
        variant: "destructive"
      });
      return;
    }

    setPecasUtilizadas([...pecasUtilizadas, { ...novaPeca }]);
    setNovaPeca({
      quantidade: 1,
      peca: ""
    });
  };

  const removerPeca = (index: number) => {
    setPecasUtilizadas(pecasUtilizadas.filter((_, i) => i !== index));
  };

  const adicionarServicoAdicional = () => {
    if (!novoServicoAdicional.nome.trim()) {
      toast({
        title: "Atenção",
        description: "Preencha o nome do serviço",
        variant: "destructive"
      });
      return;
    }

    setServicosAdicionais([...servicosAdicionais, { ...novoServicoAdicional }]);
    setNovoServicoAdicional({ quantidade: 1, nome: "", codigo: "" });
  };

  const removerServicoAdicional = (index: number) => {
    setServicosAdicionais(servicosAdicionais.filter((_, i) => i !== index));
  };

  const adicionarUsinagemAdicional = () => {
    if (!novaUsinagemAdicional.nome.trim()) {
      toast({
        title: "Atenção",
        description: "Preencha o nome da usinagem",
        variant: "destructive"
      });
      return;
    }

    setUsinagemAdicional([...usinagemAdicional, { ...novaUsinagemAdicional }]);
    setNovaUsinagemAdicional({ quantidade: 1, nome: "", codigo: "" });
  };

  const removerUsinagemAdicional = (index: number) => {
    setUsinagemAdicional(usinagemAdicional.filter((_, i) => i !== index));
  };

  const montarServicos = () => {
    const servicos: Array<{ quantidade: number; nome: string; codigo?: string }> = [];

    Object.entries(servicosPreDeterminados).forEach(([key, value]) => {
      if (value) {
        servicos.push({
          quantidade: servicosQuantidades[key as keyof typeof servicosQuantidades],
          nome: servicosNomes[key as keyof typeof servicosNomes],
          codigo: ""
        });
      }
    });

    servicosAdicionais.forEach(servico => {
      servicos.push(servico);
    });

    return servicos;
  };

  const montarUsinagem = () => {
    const usinagens: Array<{ quantidade: number; nome: string; codigo?: string }> = [];

    Object.entries(usinagem).forEach(([key, value]) => {
      if (value) {
        usinagens.push({
          quantidade: usinagemQuantidades[key as keyof typeof usinagemQuantidades],
          nome: usinagemNomes[key as keyof typeof usinagemNomes],
          codigo: ""
        });
      }
    });

    usinagemAdicional.forEach(item => {
      usinagens.push(item);
    });

    return usinagens;
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFotos: Array<{ file: File; preview: string }> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newFotos.push({ file, preview });
      }
    }

    setFotos([...fotos, ...newFotos]);
  };

  const removerFoto = (index: number) => {
    const fotoParaRemover = fotos[index];
    URL.revokeObjectURL(fotoParaRemover.preview);
    setFotos(fotos.filter((_, i) => i !== index));
  };

  const handleDocumentoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocumentos: Array<{ file: File; nome: string; tipo: string }> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tipo = file.type;
      
      // Aceitar PDF, Excel (xls, xlsx), Word (doc, docx), e outros documentos
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

  const removerDocumento = (index: number) => {
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  const uploadFotos = async (ordemId: string) => {
    if (fotos.length === 0) return;

    setUploadingFotos(true);
    
    try {
      for (const foto of fotos) {
        const timestamp = Date.now();
        const fileName = `${ordemId}_${timestamp}_${foto.file.name}`;
        const filePath = `${fileName}`;

        // Upload para o bucket equipamentos
        const { error: uploadError } = await supabase.storage
          .from('equipamentos')
          .upload(filePath, foto.file);

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('equipamentos')
          .getPublicUrl(filePath);

        // Salvar referência no banco
        const { error: dbError } = await supabase
          .from('fotos_equipamentos')
          .insert({
            ordem_servico_id: ordemId,
            arquivo_url: urlData.publicUrl,
            nome_arquivo: foto.file.name,
            apresentar_orcamento: false,
            empresa_id: empresaAtual?.id || null
          });

        if (dbError) throw dbError;
      }
    } catch (error) {
      console.error('Erro ao fazer upload de fotos:', error);
      throw error;
    } finally {
      setUploadingFotos(false);
    }
  };

  const uploadDocumentos = async (ordemId: string) => {
    if (documentos.length === 0) return;

    setUploadingDocumentos(true);
    
    try {
      for (const documento of documentos) {
        const timestamp = Date.now();
        const fileName = `${ordemId}_${timestamp}_${documento.file.name}`;
        const filePath = `${fileName}`;

        // Upload para o bucket documentos-tecnicos
        const { error: uploadError } = await supabase.storage
          .from('documentos-tecnicos')
          .upload(filePath, documento.file);

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('documentos-tecnicos')
          .getPublicUrl(filePath);

        // Salvar referência no banco
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
    } catch (error) {
      console.error('Erro ao fazer upload de documentos:', error);
      throw error;
    } finally {
      setUploadingDocumentos(false);
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

      // Buscar nome do cliente
      const clienteSelecionado = clientes.find(c => c.id === formData.cliente);

      const ordemData = {
        numero_ordem: formData.numeroOrdem,
        cliente_nome: clienteSelecionado?.nome || '',
        equipamento: formData.equipamento,
        tecnico: formData.tecnico,
        descricao_problema: formData.problemas,
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

      // Upload das fotos e documentos após criar a ordem
      if (fotos.length > 0) {
        await uploadFotos(data.id);
      }

      if (documentos.length > 0) {
        await uploadDocumentos(data.id);
      }

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
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Nova Ordem de Serviço</h1>
              <p className="text-muted-foreground">Ordem sem vinculação a recebimento</p>
            </div>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Ordem
          </Button>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Dados principais da ordem de serviço</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numeroOrdem">Nº da Ordem*</Label>
                <Input
                  id="numeroOrdem"
                  value={formData.numeroOrdem}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                  placeholder="Ex: 0065/25"
                />
                <p className="text-xs text-muted-foreground">Número gerado automaticamente</p>
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
                <Label htmlFor="cliente">Cliente*</Label>
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
                        {orc.numero} - {orc.cliente_nome} - {orc.equipamento} - R$ {orc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se vinculado, a ordem irá direto para finalizadas ao ser concluída
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="solicitante">Solicitante</Label>
                <Input
                  id="solicitante"
                  value={formData.solicitante}
                  onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataAbertura">Data de Abertura*</Label>
                <Input
                  id="dataAbertura"
                  type="date"
                  value={formData.dataAbertura}
                  onChange={(e) => setFormData({...formData, dataAbertura: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroNota">Nº da Nota</Label>
                <Input
                  id="numeroNota"
                  value={formData.numeroNota}
                  onChange={(e) => setFormData({...formData, numeroNota: e.target.value})}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroSerie">Nº de Série</Label>
              <Input
                id="numeroSerie"
                value={formData.numeroSerie}
                onChange={(e) => setFormData({...formData, numeroSerie: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipamento">Equipamento*</Label>
              <Input
                id="equipamento"
                value={formData.equipamento}
                onChange={(e) => setFormData({...formData, equipamento: e.target.value})}
                placeholder="Tipo de equipamento"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados Técnicos */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Técnicos</CardTitle>
            <CardDescription>Informações técnicas do equipamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="categoriaEquipamento">Categoria do Equipamento*</Label>
              <Select 
                value={dadosTecnicos.categoriaEquipamento} 
                onValueChange={(value) => setDadosTecnicos({...dadosTecnicos, categoriaEquipamento: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cilindro">Cilindro</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dadosTecnicos.categoriaEquipamento === 'cilindro' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="camisa">Camisa</Label>
                    <Input
                      id="camisa"
                      value={dadosTecnicos.camisa}
                      onChange={(e) => setDadosTecnicos({...dadosTecnicos, camisa: e.target.value})}
                      placeholder="Ex: 80mm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hasteComprimento">Haste - Comprimento</Label>
                    <Input
                      id="hasteComprimento"
                      value={dadosTecnicos.hasteComprimento}
                      onChange={(e) => setDadosTecnicos({...dadosTecnicos, hasteComprimento: e.target.value})}
                      placeholder="Ex: 1200mm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Input
                      id="curso"
                      value={dadosTecnicos.curso}
                      onChange={(e) => setDadosTecnicos({...dadosTecnicos, curso: e.target.value})}
                      placeholder="Ex: 500mm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pressaoTrabalho">Pressão de Trabalho</Label>
                    <Input
                      id="pressaoTrabalho"
                      value={dadosTecnicos.pressaoTrabalho}
                      onChange={(e) => setDadosTecnicos({...dadosTecnicos, pressaoTrabalho: e.target.value})}
                      placeholder="Ex: 200 bar"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conexaoA">Conexão A</Label>
                    <Input
                      id="conexaoA"
                      value={dadosTecnicos.conexaoA}
                      onChange={(e) => setDadosTecnicos({...dadosTecnicos, conexaoA: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conexaoB">Conexão B</Label>
                    <Input
                      id="conexaoB"
                      value={dadosTecnicos.conexaoB}
                      onChange={(e) => setDadosTecnicos({...dadosTecnicos, conexaoB: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}

            {dadosTecnicos.categoriaEquipamento === 'outros' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tipoEquipamento">Tipo de Equipamento*</Label>
                  <Input
                    id="tipoEquipamento"
                    value={dadosTecnicos.tipoEquipamento}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, tipoEquipamento: e.target.value})}
                    placeholder="Ex: Bomba hidráulica, Motor, Válvula..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pressaoTrabalho">Pressão de Trabalho</Label>
                  <Input
                    id="pressaoTrabalho"
                    value={dadosTecnicos.pressaoTrabalho}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, pressaoTrabalho: e.target.value})}
                    placeholder="Ex: 200 bar"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="ambienteTrabalho">Ambiente de Trabalho*</Label>
              <Select 
                value={dadosTecnicos.ambienteTrabalho} 
                onValueChange={(value) => setDadosTecnicos({...dadosTecnicos, ambienteTrabalho: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                  <SelectItem value="submerso">Submerso</SelectItem>
                  <SelectItem value="controlado">Ambiente Controlado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoesTecnicas">Observações</Label>
              <Textarea
                id="observacoesTecnicas"
                value={dadosTecnicos.observacoesTecnicas}
                onChange={(e) => setDadosTecnicos({...dadosTecnicos, observacoesTecnicas: e.target.value})}
                placeholder="Observações técnicas adicionais..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Peças Necessárias */}
        <Card>
          <CardHeader>
            <CardTitle>Peças Necessárias</CardTitle>
            <CardDescription>Adicione as peças que serão utilizadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="w-24">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={novaPeca.quantidade}
                  onChange={(e) => setNovaPeca({...novaPeca, quantidade: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="flex-1">
                <Label>Nome da Peça</Label>
                <Input
                  value={novaPeca.peca}
                  onChange={(e) => setNovaPeca({...novaPeca, peca: e.target.value})}
                  placeholder="Digite o nome da peça..."
                />
              </div>
              <div className="flex items-end">
                <Button onClick={adicionarPeca} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            {pecasUtilizadas.length > 0 && (
              <div className="space-y-2">
                {pecasUtilizadas.map((peca, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <span className="font-semibold text-lg min-w-[3rem]">{peca.quantidade}x</span>
                    <span className="flex-1">{peca.peca}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerPeca(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços Realizados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(servicosPreDeterminados).map(([key, checked]) => (
              <div key={key} className="flex items-center gap-4">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    setServicosPreDeterminados({...servicosPreDeterminados, [key]: !!value})
                  }
                />
                <Input
                  type="number"
                  min="1"
                  className="w-20"
                  value={servicosQuantidades[key as keyof typeof servicosQuantidades]}
                  onChange={(e) =>
                    setServicosQuantidades({
                      ...servicosQuantidades,
                      [key]: parseInt(e.target.value) || 1
                    })
                  }
                  disabled={!checked}
                />
                <Label className="flex-1">{servicosNomes[key as keyof typeof servicosNomes]}</Label>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <Label>Qtd</Label>
                  <Input
                    type="number"
                    min="1"
                    value={novoServicoAdicional.quantidade}
                    onChange={(e) =>
                      setNovoServicoAdicional({
                        ...novoServicoAdicional,
                        quantidade: parseInt(e.target.value) || 1
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Serviço Adicional</Label>
                  <Input
                    value={novoServicoAdicional.nome}
                    onChange={(e) =>
                      setNovoServicoAdicional({...novoServicoAdicional, nome: e.target.value})
                    }
                    placeholder="Nome do serviço"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={adicionarServicoAdicional} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {servicosAdicionais.length > 0 && (
              <div className="space-y-2">
                {servicosAdicionais.map((servico, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="font-semibold">{servico.quantidade}x</span>
                    <span>{servico.nome}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerServicoAdicional(index)}
                      className="ml-auto"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usinagem */}
        <Card>
          <CardHeader>
            <CardTitle>Usinagem Necessária</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(usinagem).map(([key, checked]) => (
              <div key={key} className="flex items-center gap-4">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    setUsinagem({...usinagem, [key]: !!value})
                  }
                />
                <Input
                  type="number"
                  min="1"
                  className="w-20"
                  value={usinagemQuantidades[key as keyof typeof usinagemQuantidades]}
                  onChange={(e) =>
                    setUsinagemQuantidades({
                      ...usinagemQuantidades,
                      [key]: parseInt(e.target.value) || 1
                    })
                  }
                  disabled={!checked}
                />
                <Label className="flex-1">{usinagemNomes[key as keyof typeof usinagemNomes]}</Label>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <Label>Qtd</Label>
                  <Input
                    type="number"
                    min="1"
                    value={novaUsinagemAdicional.quantidade}
                    onChange={(e) =>
                      setNovaUsinagemAdicional({
                        ...novaUsinagemAdicional,
                        quantidade: parseInt(e.target.value) || 1
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Usinagem Adicional</Label>
                  <Input
                    value={novaUsinagemAdicional.nome}
                    onChange={(e) =>
                      setNovaUsinagemAdicional({...novaUsinagemAdicional, nome: e.target.value})
                    }
                    placeholder="Tipo de usinagem"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={adicionarUsinagemAdicional} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {usinagemAdicional.length > 0 && (
              <div className="space-y-2">
                {usinagemAdicional.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="font-semibold">{item.quantidade}x</span>
                    <span>{item.nome}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerUsinagemAdicional(index)}
                      className="ml-auto"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fotos do Equipamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos do Equipamento
            </CardTitle>
            <CardDescription>Adicione fotos do equipamento e dos trabalhos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFotoUpload}
                className="hidden"
                id="foto-upload"
              />
              <Label
                htmlFor="foto-upload"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary-hover transition-colors"
              >
                <Upload className="h-4 w-4" />
                Adicionar Fotos
              </Label>
              <span className="text-sm text-muted-foreground">
                {fotos.length} {fotos.length === 1 ? 'foto adicionada' : 'fotos adicionadas'}
              </span>
            </div>

            {fotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={foto.preview}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removerFoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded truncate">
                      {foto.file.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                      onClick={() => removerDocumento(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações Técnicas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Observações adicionais sobre a ordem de serviço..."
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NovaOrdemDireta;
