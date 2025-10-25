import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const NovaFabricacao = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    cliente: "",
    numeroOrdem: "",
    tipoEquipamento: "",
    descricaoProduto: "",
    tecnico: "",
    prazoEstimado: "",
    prioridade: "media",
    observacoes: ""
  });

  const [pecasUtilizadas, setPecasUtilizadas] = useState<Array<{
    quantidade: number;
    peca: string;
    material: string;
    medida1: string;
    medida2: string;
    medida3: string;
    codigo?: string;
  }>>([]);
  
  const [novaPeca, setNovaPeca] = useState({
    quantidade: 1,
    peca: "",
    material: "",
    medida1: "",
    medida2: "",
    medida3: "",
    codigo: ""
  });
  
  const [servicosPreDeterminados, setServicosPreDeterminados] = useState({
    desmontagem: false,
    limpeza: false,
    teste: false,
    pintura: false,
    recondicionamento: false
  });

  const [servicosNomes, setServicosNomes] = useState({
    desmontagem: "Desmontagem e Montagem",
    limpeza: "Limpeza do Equipamento",
    teste: "Teste de Performance ISO 10100",
    pintura: "Pintura do Equipamento",
    recondicionamento: "Recondicionamento de Roscas"
  });

  const [servicosQuantidades, setServicosQuantidades] = useState({
    desmontagem: 1,
    limpeza: 1,
    teste: 1,
    pintura: 1,
    recondicionamento: 1
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

  const [usinagemNomes, setUsinagemNomes] = useState({
    usinagemHaste: "Usinagem de haste",
    usinagemTampaGuia: "Usinagem de tampa guia",
    usinagemEmbolo: "Usinagem de êmbolo",
    usinagemCabecoteDianteiro: "Usinagem de cabeçote dianteiro canal do oring",
    usinagemCabecoteTraseiro: "Usinagem cabeçote traseiro canal do oring"
  });

  const [usinagemQuantidades, setUsinagemQuantidades] = useState({
    usinagemHaste: 1,
    usinagemTampaGuia: 1,
    usinagemEmbolo: 1,
    usinagemCabecoteDianteiro: 1,
    usinagemCabecoteTraseiro: 1
  });

  const [usinagemAdicional, setUsinagemAdicional] = useState<Array<{ quantidade: number; nome: string; codigo?: string }>>([]);
  const [novaUsinagemAdicional, setNovaUsinagemAdicional] = useState({ quantidade: 1, nome: "", codigo: "" });

  const gerarNumeroOrdem = async () => {
    try {
      const anoAtual = new Date().getFullYear().toString().slice(-2);
      
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('numero_ordem')
        .ilike('numero_ordem', `MH-F-%/${anoAtual}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const ultimoNumero = data[0].numero_ordem;
        const match = ultimoNumero.match(/MH-F-(\d+)\/(\d+)/);
        if (match) {
          const sequencial = parseInt(match[1]) + 1;
          return `MH-F-${sequencial.toString().padStart(3, '0')}/${anoAtual}`;
        }
      }

      return `MH-F-001/${anoAtual}`;
    } catch (error) {
      console.error('Erro ao gerar número da ordem:', error);
      const anoAtual = new Date().getFullYear().toString().slice(-2);
      return `MH-F-001/${anoAtual}`;
    }
  };

  const adicionarPeca = () => {
    if (!novaPeca.peca) {
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
      peca: "",
      material: "",
      medida1: "",
      medida2: "",
      medida3: "",
      codigo: ""
    });
  };

  const removerPeca = (index: number) => {
    setPecasUtilizadas(pecasUtilizadas.filter((_, i) => i !== index));
  };

  const adicionarServicoAdicional = () => {
    if (!novoServicoAdicional.nome) {
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
    if (!novaUsinagemAdicional.nome) {
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

  const handleSalvar = async () => {
    if (!formData.cliente || !formData.tipoEquipamento) {
      toast({
        title: "Atenção",
        description: "Preencha os campos obrigatórios: Cliente e Tipo de Equipamento",
        variant: "destructive"
      });
      return;
    }

    try {
      const numeroOrdem = await gerarNumeroOrdem();

      // Preparar serviços necessários
      const servicosNecessarios = [
        ...Object.entries(servicosPreDeterminados)
          .filter(([_, selecionado]) => selecionado)
          .map(([servico, _]) => ({
            nome: servicosNomes[servico as keyof typeof servicosNomes],
            quantidade: servicosQuantidades[servico as keyof typeof servicosQuantidades]
          })),
        ...servicosAdicionais
      ];

      // Preparar usinagem necessária
      const usinagemNecessaria = [
        ...Object.entries(usinagem)
          .filter(([_, selecionado]) => selecionado)
          .map(([tipo, _]) => ({
            nome: usinagemNomes[tipo as keyof typeof usinagemNomes],
            quantidade: usinagemQuantidades[tipo as keyof typeof usinagemQuantidades]
          })),
        ...usinagemAdicional
      ];

      const { error } = await supabase
        .from('ordens_servico')
        .insert({
          recebimento_id: null, // Marca como fabricação
          numero_ordem: numeroOrdem,
          cliente_nome: formData.cliente,
          equipamento: formData.tipoEquipamento,
          tecnico: formData.tecnico,
          status: 'em_andamento',
          prioridade: formData.prioridade,
          descricao_problema: formData.descricaoProduto,
          tempo_estimado: formData.prazoEstimado,
          observacoes_tecnicas: formData.observacoes,
          data_entrada: new Date().toISOString(),
          pecas_necessarias: pecasUtilizadas.length > 0 ? pecasUtilizadas : null,
          servicos_necessarios: servicosNecessarios.length > 0 ? servicosNecessarios : null,
          usinagem_necessaria: usinagemNecessaria.length > 0 ? usinagemNecessaria : null
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Fabricação ${numeroOrdem} criada com sucesso!`
      });

      navigate('/analise');
    } catch (error) {
      console.error('Erro ao salvar fabricação:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar ordem de fabricação",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/analise')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Nova Fabricação</h1>
              <p className="text-muted-foreground">
                Criar ordem de fabricação sem equipamento de terceiro
              </p>
            </div>
            <Badge variant="secondary" className="ml-4">FABRICAÇÃO</Badge>
          </div>
          <Button onClick={handleSalvar}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Fabricação
          </Button>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Dados principais da fabricação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoEquipamento">Tipo de Produto/Equipamento *</Label>
                <Input
                  id="tipoEquipamento"
                  value={formData.tipoEquipamento}
                  onChange={(e) => setFormData({ ...formData, tipoEquipamento: e.target.value })}
                  placeholder="Ex: Cilindro Hidráulico, Válvula, etc."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricaoProduto">Descrição do Produto</Label>
              <Textarea
                id="descricaoProduto"
                value={formData.descricaoProduto}
                onChange={(e) => setFormData({ ...formData, descricaoProduto: e.target.value })}
                placeholder="Descreva o que será fabricado"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tecnico">Técnico Responsável</Label>
                <Input
                  id="tecnico"
                  value={formData.tecnico}
                  onChange={(e) => setFormData({ ...formData, tecnico: e.target.value })}
                  placeholder="Nome do técnico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazoEstimado">Prazo Estimado</Label>
                <Input
                  id="prazoEstimado"
                  value={formData.prazoEstimado}
                  onChange={(e) => setFormData({ ...formData, prazoEstimado: e.target.value })}
                  placeholder="Ex: 15 dias"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={(value) => setFormData({ ...formData, prioridade: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Peças */}
        <Card>
          <CardHeader>
            <CardTitle>Peças Necessárias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              <div className="space-y-2">
                <Label>Qtd</Label>
                <Input
                  type="number"
                  min="1"
                  value={novaPeca.quantidade}
                  onChange={(e) => setNovaPeca({ ...novaPeca, quantidade: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Peça</Label>
                <Input
                  value={novaPeca.peca}
                  onChange={(e) => setNovaPeca({ ...novaPeca, peca: e.target.value })}
                  placeholder="Nome da peça"
                />
              </div>
              <div className="space-y-2">
                <Label>Material</Label>
                <Input
                  value={novaPeca.material}
                  onChange={(e) => setNovaPeca({ ...novaPeca, material: e.target.value })}
                  placeholder="Material"
                />
              </div>
              <div className="space-y-2">
                <Label>Med. 1</Label>
                <Input
                  value={novaPeca.medida1}
                  onChange={(e) => setNovaPeca({ ...novaPeca, medida1: e.target.value })}
                  placeholder="mm"
                />
              </div>
              <div className="space-y-2">
                <Label>Med. 2</Label>
                <Input
                  value={novaPeca.medida2}
                  onChange={(e) => setNovaPeca({ ...novaPeca, medida2: e.target.value })}
                  placeholder="mm"
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={adicionarPeca} className="w-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {pecasUtilizadas.map((peca, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                <span className="font-semibold">{peca.quantidade}x</span>
                <span>{peca.peca}</span>
                {peca.material && <span className="text-sm text-muted-foreground">({peca.material})</span>}
                <Button variant="ghost" size="sm" onClick={() => removerPeca(index)} className="ml-auto">
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {Object.entries(servicosPreDeterminados).map(([servico, selecionado]) => (
                <div key={servico} className="flex items-center gap-4">
                  <Checkbox
                    checked={selecionado}
                    onCheckedChange={(checked) =>
                      setServicosPreDeterminados({ ...servicosPreDeterminados, [servico]: checked as boolean })
                    }
                  />
                  <Input
                    className="flex-1"
                    value={servicosNomes[servico as keyof typeof servicosNomes]}
                    onChange={(e) =>
                      setServicosNomes({ ...servicosNomes, [servico]: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    className="w-20"
                    min="1"
                    value={servicosQuantidades[servico as keyof typeof servicosQuantidades]}
                    onChange={(e) =>
                      setServicosQuantidades({ ...servicosQuantidades, [servico]: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Serviço adicional"
                value={novoServicoAdicional.nome}
                onChange={(e) => setNovoServicoAdicional({ ...novoServicoAdicional, nome: e.target.value })}
              />
              <Input
                type="number"
                className="w-20"
                min="1"
                value={novoServicoAdicional.quantidade}
                onChange={(e) => setNovoServicoAdicional({ ...novoServicoAdicional, quantidade: parseInt(e.target.value) || 1 })}
              />
              <Button onClick={adicionarServicoAdicional}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {servicosAdicionais.map((servico, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                <span className="font-semibold">{servico.quantidade}x</span>
                <span>{servico.nome}</span>
                <Button variant="ghost" size="sm" onClick={() => removerServicoAdicional(index)} className="ml-auto">
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Usinagem */}
        <Card>
          <CardHeader>
            <CardTitle>Usinagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {Object.entries(usinagem).map(([tipo, selecionado]) => (
                <div key={tipo} className="flex items-center gap-4">
                  <Checkbox
                    checked={selecionado}
                    onCheckedChange={(checked) =>
                      setUsinagem({ ...usinagem, [tipo]: checked as boolean })
                    }
                  />
                  <Input
                    className="flex-1"
                    value={usinagemNomes[tipo as keyof typeof usinagemNomes]}
                    onChange={(e) =>
                      setUsinagemNomes({ ...usinagemNomes, [tipo]: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    className="w-20"
                    min="1"
                    value={usinagemQuantidades[tipo as keyof typeof usinagemQuantidades]}
                    onChange={(e) =>
                      setUsinagemQuantidades({ ...usinagemQuantidades, [tipo]: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Usinagem adicional"
                value={novaUsinagemAdicional.nome}
                onChange={(e) => setNovaUsinagemAdicional({ ...novaUsinagemAdicional, nome: e.target.value })}
              />
              <Input
                type="number"
                className="w-20"
                min="1"
                value={novaUsinagemAdicional.quantidade}
                onChange={(e) => setNovaUsinagemAdicional({ ...novaUsinagemAdicional, quantidade: parseInt(e.target.value) || 1 })}
              />
              <Button onClick={adicionarUsinagemAdicional}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {usinagemAdicional.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                <span className="font-semibold">{item.quantidade}x</span>
                <span>{item.nome}</span>
                <Button variant="ghost" size="sm" onClick={() => removerUsinagemAdicional(index)} className="ml-auto">
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais sobre a fabricação"
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NovaFabricacao;
