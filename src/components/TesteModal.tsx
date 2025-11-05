import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TesteModalProps {
  ordem: any;
  children: React.ReactNode;
  onTesteIniciado: () => void;
}

export function TesteModal({ ordem, children, onTesteIniciado }: TesteModalProps) {
  const [open, setOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    curso: '',
    qtdCiclos: '',
    pressaoMaximaTrabalho: '',
    tempoMinutos: '',
    pressaoAvanco: '',
    pressaoRetorno: '',
    checkVazamentoPistao: false,
    checkVazamentoVedacoesEstaticas: false,
    checkVazamentoHaste: false,
    testePerformancePR004: '',
    espessuraCamada: '',
    checkOk: false,
    observacao: '',
    resultadoTeste: 'aprovado',
    dataHoraTeste: new Date().toISOString().slice(0, 16)
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar se é um arquivo de vídeo
      if (file.type.startsWith('video/')) {
        // Verificar tamanho do arquivo (máximo 50MB)
        const maxSize = 500 * 1024 * 1024; // 500MB em bytes
        if (file.size > maxSize) {
          toast({
            title: "Arquivo muito grande",
            description: "O vídeo deve ter no máximo 500MB. Tente comprimir o arquivo.",
            variant: "destructive",
          });
          return;
        }
        setVideoFile(file);
      } else {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de vídeo",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.curso || !formData.qtdCiclos) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      let videoUrl = null;

      // Upload do vídeo se fornecido (agora opcional)
      if (videoFile) {
        try {
          const fileName = `teste_${ordem.id}_${Date.now()}_${videoFile.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('videos-teste')
            .upload(fileName, videoFile);

          if (uploadError) {
            console.warn('Erro no upload do vídeo:', uploadError);
            toast({
              title: "Aviso",
              description: "Teste salvo, mas o vídeo não pôde ser enviado. Arquivo muito grande ou erro de conexão.",
              variant: "default",
            });
          } else {
            // Obter URL pública do vídeo
            const { data: urlData } = supabase.storage
              .from('videos-teste')
              .getPublicUrl(fileName);
            
            videoUrl = urlData.publicUrl;
          }
        } catch (videoError) {
          console.warn('Erro no upload do vídeo:', videoError);
        }
      }

      // Salvar dados do teste usando edge function
      const { data: result, error } = await supabase.functions.invoke('salvar-teste', {
        body: {
          ordemId: ordem.id,
          dadosTeste: {
            curso: formData.curso,
            qtdCiclos: formData.qtdCiclos,
            pressaoMaximaTrabalho: formData.pressaoMaximaTrabalho,
            tempoMinutos: formData.tempoMinutos,
            pressaoAvanco: formData.pressaoAvanco,
            pressaoRetorno: formData.pressaoRetorno,
            checkVazamentoPistao: formData.checkVazamentoPistao,
            checkVazamentoVedacoesEstaticas: formData.checkVazamentoVedacoesEstaticas,
            checkVazamentoHaste: formData.checkVazamentoHaste,
            testePerformancePR004: formData.testePerformancePR004,
            espessuraCamada: formData.espessuraCamada,
            checkOk: formData.checkOk,
            observacao: formData.observacao,
            resultadoTeste: formData.resultadoTeste,
            dataHoraTeste: formData.dataHoraTeste,
            videoUrl: videoUrl
          }
        }
      });

      if (error || !result?.success) throw error || new Error('Falha ao salvar teste');

      toast({
        title: "Sucesso",
        description: "Teste registrado com sucesso!",
      });

      setOpen(false);
      onTesteIniciado();
      
      // Limpar formulário
      setFormData({
        curso: '',
        qtdCiclos: '',
        pressaoMaximaTrabalho: '',
        tempoMinutos: '',
        pressaoAvanco: '',
        pressaoRetorno: '',
        checkVazamentoPistao: false,
        checkVazamentoVedacoesEstaticas: false,
        checkVazamentoHaste: false,
        testePerformancePR004: '',
        espessuraCamada: '',
        checkOk: false,
        observacao: '',
        resultadoTeste: 'aprovado',
        dataHoraTeste: new Date().toISOString().slice(0, 16)
      });
      setVideoFile(null);

    } catch (error) {
      console.error('Erro ao salvar teste:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar informações do teste",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Testes Finais
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do teste final do equipamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Equipamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Equipamento em Teste</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Ordem:</span> {ordem.recebimentos?.numero_ordem || ordem.numero_ordem}
                </div>
                <div>
                  <span className="font-medium">Cliente:</span> {ordem.cliente_nome || ordem.recebimentos?.cliente_nome}
                </div>
                <div>
                  <span className="font-medium">Equipamento:</span> {ordem.equipamento || ordem.recebimentos?.tipo_equipamento}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Teste */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="curso">Curso *</Label>
                <Input
                  id="curso"
                  value={formData.curso}
                  onChange={(e) => setFormData(prev => ({ ...prev, curso: e.target.value }))}
                  placeholder="Ex: 500mm"
                />
              </div>
              <div>
                <Label htmlFor="qtdCiclos">Qtd. Ciclos *</Label>
                <Input
                  id="qtdCiclos"
                  value={formData.qtdCiclos}
                  onChange={(e) => setFormData(prev => ({ ...prev, qtdCiclos: e.target.value }))}
                  placeholder="Ex: 10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pressaoMaximaTrabalho">Pressão máxima de trabalho (bar)</Label>
                <Input
                  id="pressaoMaximaTrabalho"
                  value={formData.pressaoMaximaTrabalho}
                  onChange={(e) => setFormData(prev => ({ ...prev, pressaoMaximaTrabalho: e.target.value }))}
                  placeholder="Ex: 350"
                />
              </div>
              <div>
                <Label htmlFor="tempoMinutos">Tempo (minutos)</Label>
                <Input
                  id="tempoMinutos"
                  value={formData.tempoMinutos}
                  onChange={(e) => setFormData(prev => ({ ...prev, tempoMinutos: e.target.value }))}
                  placeholder="Ex: 30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pressaoAvanco">Pressão no avanço (bar)</Label>
                <Input
                  id="pressaoAvanco"
                  value={formData.pressaoAvanco}
                  onChange={(e) => setFormData(prev => ({ ...prev, pressaoAvanco: e.target.value }))}
                  placeholder="Ex: 300"
                />
              </div>
              <div>
                <Label htmlFor="pressaoRetorno">Pressão no retorno (bar)</Label>
                <Input
                  id="pressaoRetorno"
                  value={formData.pressaoRetorno}
                  onChange={(e) => setFormData(prev => ({ ...prev, pressaoRetorno: e.target.value }))}
                  placeholder="Ex: 280"
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkVazamentoPistao"
                  checked={formData.checkVazamentoPistao}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, checkVazamentoPistao: checked as boolean }))
                  }
                />
                <label
                  htmlFor="checkVazamentoPistao"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Verificar a ausência de vazamento de fluido na vedação do pistão
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkVazamentoVedacoesEstaticas"
                  checked={formData.checkVazamentoVedacoesEstaticas}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, checkVazamentoVedacoesEstaticas: checked as boolean }))
                  }
                />
                <label
                  htmlFor="checkVazamentoVedacoesEstaticas"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Verificar a ausência de vazamento de fluido em todas as vedações estáticas
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkVazamentoHaste"
                  checked={formData.checkVazamentoHaste}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, checkVazamentoHaste: checked as boolean }))
                  }
                />
                <label
                  htmlFor="checkVazamentoHaste"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Observar o vazamento do fluido na vedação da haste
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="testePerformancePR004">Teste de performance realizado de acordo com procedimento interno PR-004</Label>
              <Input
                id="testePerformancePR004"
                value={formData.testePerformancePR004}
                onChange={(e) => setFormData(prev => ({ ...prev, testePerformancePR004: e.target.value }))}
                placeholder="Descreva o teste de performance"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="espessuraCamada">Espessura da camada</Label>
                <Input
                  id="espessuraCamada"
                  value={formData.espessuraCamada}
                  onChange={(e) => setFormData(prev => ({ ...prev, espessuraCamada: e.target.value }))}
                  placeholder="Ex: 50μm"
                />
              </div>
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                  id="checkOk"
                  checked={formData.checkOk}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, checkOk: checked as boolean }))
                  }
                />
                <label
                  htmlFor="checkOk"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Ok
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="resultadoTeste">Resultado do Teste *</Label>
              <Select
                value={formData.resultadoTeste}
                onValueChange={(value) => setFormData(prev => ({ ...prev, resultadoTeste: value }))}
              >
                <SelectTrigger id="resultadoTeste">
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                placeholder="Observações adicionais sobre o teste"
                rows={3}
              />
            </div>

            {/* Upload de Vídeo */}
            <div>
              <Label htmlFor="videoTeste">Vídeo do Teste (Opcional - máx. 500MB)</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-4">
                  <Input
                    id="videoTeste"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                {videoFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Video className="h-4 w-4" />
                    <span>{videoFile.name}</span>
                    <span>({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  O vídeo é opcional. Se for muito grande, o teste será salvo sem o vídeo.
                </p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={uploading}
              className="flex items-center gap-2"
            >
              {uploading ? (
                "Salvando..."
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Registrar Teste
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}