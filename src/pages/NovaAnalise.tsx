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
import { toast } from "@/hooks/use-toast";
import { useRecebimentos } from "@/hooks/use-recebimentos";

const NovaAnalise = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { recebimentos, loading } = useRecebimentos();
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

  // Buscar recebimento baseado no ID da URL
  const recebimento = id ? recebimentos.find(r => r.numero_ordem === id) : null;

  useEffect(() => {
    console.log('Debug NovaAnalise - ID:', id);
    console.log('Debug NovaAnalise - Recebimentos:', recebimentos);
    console.log('Debug NovaAnalise - Loading:', loading);
    console.log('Debug NovaAnalise - Recebimento encontrado:', recebimento);
    
    if (id && !loading) {
      if (recebimento) {
        console.log('Recebimento encontrado:', recebimento);
      } else {
        console.log('Recebimento não encontrado para ID:', id);
      }
    }
  }, [id, recebimento, loading, recebimentos]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "Análise Salva",
      description: "A análise técnica foi salva com sucesso! Dados serão migrados para o Supabase.",
    });

    console.log('Dados da análise:', {
      formData,
      dadosTecnicos,
      pecasUtilizadas,
      servicosPreDeterminados,
      servicosPersonalizados,
      usinagem,
      usinagemPersonalizada
    });

    navigate('/analise');
  };

  const adicionarPeca = () => {
    if (novaPeca.peca.trim()) {
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
  };

  const removerPeca = (index: number) => {
    setPecasUtilizadas(pecasUtilizadas.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <p>Carregando dados...</p>
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
            {isEdicao ? 'Editando análise para:' : 'Criar análise para:'} {recebimento.tipo_equipamento} - {recebimento.cliente_nome}
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
                  <p className="font-semibold text-primary">{recebimento.cliente_nome}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Entrada</Label>
                  <p className="font-medium">{new Date(recebimento.data_entrada).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nota Fiscal</Label>
                  <p className="font-medium">{recebimento.nota_fiscal}</p>
                </div>
                <div>
                  <Label htmlFor="tecnico">Técnico Responsável*</Label>
                  <Input
                    id="tecnico"
                    value={formData.tecnico}
                    onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prioridade">Prioridade*</Label>
                  <Select value={formData.prioridade} onValueChange={(value) => setFormData({...formData, prioridade: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="prazoEstimado">Prazo Estimado (dias)</Label>
                  <Input
                    id="prazoEstimado"
                    type="number"
                    value={formData.prazoEstimado}
                    onChange={(e) => setFormData({...formData, prazoEstimado: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="problemas">Problemas Identificados*</Label>
                <Textarea
                  id="problemas"
                  value={formData.problemas}
                  onChange={(e) => setFormData({...formData, problemas: e.target.value})}
                  placeholder="Descreva os problemas encontrados no equipamento..."
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados Técnicos */}
          <Card>
            <CardHeader>
              <CardTitle>🔧 Dados Técnicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tipoEquipamento">Tipo de Equipamento</Label>
                  <Input
                    id="tipoEquipamento"
                    value={dadosTecnicos.tipoEquipamento}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, tipoEquipamento: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="pressaoTrabalho">Pressão de Trabalho</Label>
                  <Input
                    id="pressaoTrabalho"
                    value={dadosTecnicos.pressaoTrabalho}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, pressaoTrabalho: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="curso">Curso</Label>
                  <Input
                    id="curso"
                    value={dadosTecnicos.curso}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, curso: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="camisa">Camisa</Label>
                  <Input
                    id="camisa"
                    value={dadosTecnicos.camisa}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, camisa: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="hasteComprimento">Haste x Comprimento</Label>
                  <Input
                    id="hasteComprimento"
                    value={dadosTecnicos.hasteComprimento}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, hasteComprimento: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="conexaoA">Conexão A</Label>
                  <Input
                    id="conexaoA"
                    value={dadosTecnicos.conexaoA}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, conexaoA: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="conexaoB">Conexão B</Label>
                  <Input
                    id="conexaoB"
                    value={dadosTecnicos.conexaoB}
                    onChange={(e) => setDadosTecnicos({...dadosTecnicos, conexaoB: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peças Utilizadas */}
          <Card>
            <CardHeader>
              <CardTitle>🔩 Peças Utilizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <div>
                    <Label htmlFor="quantidade">Qtd</Label>
                    <Input
                      id="quantidade"
                      type="number"
                      min="1"
                      value={novaPeca.quantidade}
                      onChange={(e) => setNovaPeca({...novaPeca, quantidade: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="peca">Peça</Label>
                    <Input
                      id="peca"
                      value={novaPeca.peca}
                      onChange={(e) => setNovaPeca({...novaPeca, peca: e.target.value})}
                      placeholder="Nome da peça"
                    />
                  </div>
                  <div>
                    <Label htmlFor="material">Material</Label>
                    <Input
                      id="material"
                      value={novaPeca.material}
                      onChange={(e) => setNovaPeca({...novaPeca, material: e.target.value})}
                      placeholder="Material"
                    />
                  </div>
                  <div>
                    <Label htmlFor="medida1">Medida 1</Label>
                    <Input
                      id="medida1"
                      value={novaPeca.medida1}
                      onChange={(e) => setNovaPeca({...novaPeca, medida1: e.target.value})}
                      placeholder="mm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="medida2">Medida 2</Label>
                    <Input
                      id="medida2"
                      value={novaPeca.medida2}
                      onChange={(e) => setNovaPeca({...novaPeca, medida2: e.target.value})}
                      placeholder="mm"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={adicionarPeca} className="w-full">
                      Adicionar
                    </Button>
                  </div>
                </div>

                {pecasUtilizadas.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Peças Adicionadas:</h4>
                    {pecasUtilizadas.map((peca, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{peca.quantidade}x {peca.peca} ({peca.material}) - {peca.medida1} x {peca.medida2}</span>
                        <Button type="button" variant="destructive" size="sm" onClick={() => removerPeca(index)}>
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>📝 Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Observações adicionais sobre a análise..."
                rows={4}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {isEdicao ? 'Atualizar Análise' : 'Salvar Análise'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/analise')}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NovaAnalise;