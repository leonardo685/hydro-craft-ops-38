import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, Camera } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useClientes } from "@/hooks/use-clientes";

export default function NovoRecebimento() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientes } = useClientes();
  
  // Função para gerar o próximo número da ordem
  const gerarProximoNumero = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
    
    // Aqui você pode implementar uma lógica mais sofisticada
    // Por exemplo, buscar do localStorage ou de uma API
    const ultimoNumero = localStorage.getItem(`ultimoNumero_${ano}`) || "0";
    const proximoNumero = (parseInt(ultimoNumero) + 1).toString().padStart(4, '0');
    
    localStorage.setItem(`ultimoNumero_${ano}`, proximoNumero);
    return `${proximoNumero}/${ano}`;
  };

  const [formData, setFormData] = useState({
    tipoOrdem: "",
    numeroOrdem: gerarProximoNumero(), // Gera automaticamente
    cliente: "",
    tag: "",
    dataAbertura: new Date().toISOString().split('T')[0], // Data atual
    numeroNota: "",
    numeroSerie: "",
    urgencia: false,
    solicitante: "",
    manutencaoCorretiva: false,
    manutencaoPreventiva: false,
    tipoEquipamento: "",
    pressaoTrabalho: "",
    observacoesEntrada: "",
    camisa: "",
    hasteComprimento: "",
    curso: "",
    conexaoA: "",
    conexaoB: "",
    observacoesPeritagem: "",
    apresentarOrcamento: [false, false, false, false],
    fotos: [null, null, null, null] as (File | null)[]
  });

  // Preencher formulário com dados da NFe se fornecidos
  useEffect(() => {
    const dadosNFe = location.state?.dadosNFe;
    if (dadosNFe) {
      setFormData(prev => ({
        ...prev,
        cliente: dadosNFe.cliente || prev.cliente,
        numeroNota: dadosNFe.numero || prev.numeroNota,
        dataAbertura: dadosNFe.dataEmissao || prev.dataAbertura,
        observacoesEntrada: `Chave de acesso NFe: ${dadosNFe.chaveAcesso}\nCNPJ Emitente: ${dadosNFe.cnpjEmitente}` || prev.observacoesEntrada
      }));
    }
  }, [location.state]);

  // Função para lidar com o upload de fotos
  const handlePhotoUpload = (index: number, file: File | null) => {
    const newFotos = [...formData.fotos];
    newFotos[index] = file;
    setFormData({...formData, fotos: newFotos});
  };

  // Função para abrir o seletor de arquivo
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Converter fotos para base64
    const fotosBase64 = await Promise.all(
      formData.fotos.map(async (foto) => {
        if (foto && foto instanceof File) {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(foto);
          });
        }
        return foto;
      })
    );
    
    // Criar novo recebimento com os dados do formulário
    const novoRecebimento = {
      id: Date.now().toString(),
      numeroOrdem: formData.numeroOrdem,
      cliente: formData.cliente,
      dataEntrada: formData.dataAbertura,
      notaFiscal: formData.numeroNota,
      naEmpresa: true,
      tag: formData.tag,
      tipoEquipamento: formData.tipoEquipamento,
      numeroSerie: formData.numeroSerie,
      urgencia: formData.urgencia,
      solicitante: formData.solicitante,
      pressaoTrabalho: formData.pressaoTrabalho,
      observacoesEntrada: formData.observacoesEntrada,
      camisa: formData.camisa,
      hasteComprimento: formData.hasteComprimento,
      curso: formData.curso,
      conexaoA: formData.conexaoA,
      conexaoB: formData.conexaoB,
      observacoesPeritagem: formData.observacoesPeritagem,
      manutencaoCorretiva: formData.manutencaoCorretiva,
      manutencaoPreventiva: formData.manutencaoPreventiva,
      apresentarOrcamento: formData.apresentarOrcamento,
      fotos: fotosBase64
    };

    // Salvar no localStorage
    const recebimentosExistentes = JSON.parse(localStorage.getItem('recebimentos') || '[]');
    const novosRecebimentos = [...recebimentosExistentes, novoRecebimento];
    localStorage.setItem('recebimentos', JSON.stringify(novosRecebimentos));
    
    console.log("Dados do formulário:", formData);
    console.log("Recebimento salvo:", novoRecebimento);
    
    navigate("/recebimentos");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/recebimentos")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Novo Recebimento</h2>
            <p className="text-muted-foreground">
              Cadastro de novo equipamento
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Primeira seção - Dados básicos */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoOrdem">Tipo Ordem*</Label>
                  <Select value={formData.tipoOrdem} onValueChange={(value) => setFormData({...formData, tipoOrdem: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="reparo">Reparo</SelectItem>
                      <SelectItem value="revisao">Revisão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tag">TAG</Label>
                  <Input 
                    id="tag"
                    value={formData.tag}
                    onChange={(e) => setFormData({...formData, tag: e.target.value})}
                  />
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
                  <Label htmlFor="numeroNota">Nº da Nota*</Label>
                  <Input 
                    id="numeroNota"
                    value={formData.numeroNota}
                    onChange={(e) => setFormData({...formData, numeroNota: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroSerie">Nº de Série*</Label>
                <Input 
                  id="numeroSerie"
                  value={formData.numeroSerie}
                  onChange={(e) => setFormData({...formData, numeroSerie: e.target.value})}
                />
              </div>

              {/* Seção Manutenção */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Manutenção</h3>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="corretiva"
                      checked={formData.manutencaoCorretiva}
                      onCheckedChange={(checked) => setFormData({...formData, manutencaoCorretiva: checked as boolean})}
                    />
                    <Label htmlFor="corretiva">Corretiva</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="preventiva"
                      checked={formData.manutencaoPreventiva}
                      onCheckedChange={(checked) => setFormData({...formData, manutencaoPreventiva: checked as boolean})}
                    />
                    <Label htmlFor="preventiva">Preventiva</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados de Entrada */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">Dados de Entrada</h3>
              
              <div className="space-y-2">
                <Label htmlFor="tipoEquipamento">Tipo Equipamento</Label>
                <Input 
                  id="tipoEquipamento"
                  value={formData.tipoEquipamento}
                  onChange={(e) => setFormData({...formData, tipoEquipamento: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoesEntrada">Observações</Label>
                <Textarea 
                  id="observacoesEntrada"
                  value={formData.observacoesEntrada}
                  onChange={(e) => setFormData({...formData, observacoesEntrada: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Chegada Equipamento */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">Chegada Equipamento</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="space-y-3">
                    <Card 
                      className="aspect-square bg-muted/30 border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => openFileSelector(index)}
                    >
                      <CardContent className="flex items-center justify-center h-full p-4">
                        {formData.fotos[index] ? (
                          <div className="relative w-full h-full">
                            <img
                              src={URL.createObjectURL(formData.fotos[index]!)}
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
                        checked={formData.apresentarOrcamento[index]}
                        onCheckedChange={(checked) => {
                          const newArray = [...formData.apresentarOrcamento];
                          newArray[index] = checked as boolean;
                          setFormData({...formData, apresentarOrcamento: newArray});
                        }}
                      />
                      <Label htmlFor={`orcamento-${index}`} className="text-sm">Apresentar Orçamento</Label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


          {/* Botões de ação */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/recebimentos")}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Recebimento
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}