import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Upload, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NovaOrdemDireta = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    cliente: "",
    equipamento: "",
    numeroOrdem: "",
    tecnico: "",
    problemas: "",
    prazoEstimado: "",
    prioridade: "Média",
    observacoes: ""
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
    desmontagem: "Desmontagem e Montagem",
    limpeza: "Limpeza do Equipamento",
    teste: "Teste de Performance ISO 10100",
    pintura: "Pintura do Equipamento",
    recondicionamento: "Recondicionamento de Roscas"
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
    usinagemHaste: "Usinagem de haste",
    usinagemTampaGuia: "Usinagem de tampa guia",
    usinagemEmbolo: "Usinagem de êmbolo",
    usinagemCabecoteDianteiro: "Usinagem de cabeçote dianteiro canal do oring",
    usinagemCabecoteTraseiro: "Usinagem cabeçote traseiro canal do oring"
  });

  const [usinagemAdicional, setUsinagemAdicional] = useState<Array<{ quantidade: number; nome: string; codigo?: string }>>([]);
  const [novaUsinagemAdicional, setNovaUsinagemAdicional] = useState({ quantidade: 1, nome: "", codigo: "" });

  // Gerar número da ordem automaticamente
  useEffect(() => {
    const gerarNumeroOrdem = async () => {
      try {
        const { data, error } = await supabase
          .from('ordens_servico')
          .select('numero_ordem')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        let proximoNumero = 1;
        if (data && data.length > 0 && data[0].numero_ordem) {
          const ultimoNumero = data[0].numero_ordem;
          const match = ultimoNumero.match(/MH-(\d+)-/);
          if (match) {
            proximoNumero = parseInt(match[1]) + 1;
          }
        }

        const ano = new Date().getFullYear().toString().slice(-2);
        const numeroFormatado = `MH-${proximoNumero.toString().padStart(3, '0')}-${ano}`;
        
        setFormData(prev => ({ ...prev, numeroOrdem: numeroFormatado }));
      } catch (error) {
        console.error('Erro ao gerar número da ordem:', error);
      }
    };

    gerarNumeroOrdem();
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

      const ordemData = {
        numero_ordem: formData.numeroOrdem,
        cliente_nome: formData.cliente,
        equipamento: formData.equipamento,
        tecnico: formData.tecnico,
        descricao_problema: formData.problemas,
        tempo_estimado: formData.prazoEstimado,
        prioridade: formData.prioridade.toLowerCase(),
        observacoes_tecnicas: formData.observacoes,
        status: 'em_andamento',
        data_entrada: new Date().toISOString(),
        recebimento_id: null,
        pecas_necessarias: pecasUtilizadas,
        servicos_necessarios: montarServicos(),
        usinagem_necessaria: montarUsinagem()
      };

      const { data, error } = await supabase
        .from('ordens_servico')
        .insert(ordemData)
        .select()
        .single();

      if (error) throw error;

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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <Label htmlFor="equipamento">Equipamento *</Label>
                <Input
                  id="equipamento"
                  value={formData.equipamento}
                  onChange={(e) => setFormData({...formData, equipamento: e.target.value})}
                  placeholder="Tipo de equipamento"
                />
              </div>

              <div>
                <Label htmlFor="notaFiscal">Nota Fiscal</Label>
                <Input
                  id="notaFiscal"
                  value="Não vinculada"
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta ordem não está vinculada a um recebimento
                </p>
              </div>

              <div>
                <Label htmlFor="numeroOrdem">Número da Ordem</Label>
                <Input
                  id="numeroOrdem"
                  value={formData.numeroOrdem}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="tecnico">Técnico Responsável</Label>
                <Input
                  id="tecnico"
                  value={formData.tecnico}
                  onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                  placeholder="Nome do técnico"
                />
              </div>

              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => setFormData({...formData, prioridade: value})}
                >
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
                <Label htmlFor="prazoEstimado">Prazo Estimado</Label>
                <Input
                  id="prazoEstimado"
                  value={formData.prazoEstimado}
                  onChange={(e) => setFormData({...formData, prazoEstimado: e.target.value})}
                  placeholder="Ex: 5 dias"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="problemas">Descrição do Trabalho</Label>
              <Textarea
                id="problemas"
                value={formData.problemas}
                onChange={(e) => setFormData({...formData, problemas: e.target.value})}
                placeholder="Descreva o trabalho a ser realizado..."
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
