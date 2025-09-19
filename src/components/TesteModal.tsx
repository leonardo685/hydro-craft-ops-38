import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Video, FileText, Calendar } from "lucide-react";
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
    tipoTeste: '',
    pressaoTeste: '',
    temperaturaOperacao: '',
    observacoesTeste: '',
    resultadoTeste: '',
    dataHoraTeste: new Date().toISOString().slice(0, 16)
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar se é um arquivo de vídeo
      if (file.type.startsWith('video/')) {
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
    if (!formData.tipoTeste || !formData.resultadoTeste) {
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

      // Upload do vídeo se fornecido
      if (videoFile) {
        const fileName = `teste_${ordem.id}_${Date.now()}_${videoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('videos-teste')
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        // Obter URL pública do vídeo
        const { data: urlData } = supabase.storage
          .from('videos-teste')
          .getPublicUrl(fileName);
        
        videoUrl = urlData.publicUrl;
      }

      // Salvar dados do teste usando edge function
      const { data: result, error } = await supabase.functions.invoke('salvar-teste', {
        body: {
          ordemId: ordem.id,
          dadosTeste: {
            tipoTeste: formData.tipoTeste,
            pressaoTeste: formData.pressaoTeste,
            temperaturaOperacao: formData.temperaturaOperacao,
            observacoesTeste: formData.observacoesTeste,
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
        tipoTeste: '',
        pressaoTeste: '',
        temperaturaOperacao: '',
        observacoesTeste: '',
        resultadoTeste: '',
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
            Iniciar Teste do Equipamento
          </DialogTitle>
          <DialogDescription>
            Registre as informações do teste e anexe o vídeo de demonstração
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
                  <span className="font-medium">Ordem:</span> {ordem.numero_ordem}
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
                <Label htmlFor="tipoTeste">Tipo de Teste *</Label>
                <Input
                  id="tipoTeste"
                  value={formData.tipoTeste}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipoTeste: e.target.value }))}
                  placeholder="Ex: Teste hidrostático, Teste de funcionamento"
                />
              </div>
              <div>
                <Label htmlFor="pressaoTeste">Pressão de Teste</Label>
                <Input
                  id="pressaoTeste"
                  value={formData.pressaoTeste}
                  onChange={(e) => setFormData(prev => ({ ...prev, pressaoTeste: e.target.value }))}
                  placeholder="Ex: 350 bar"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="temperaturaOperacao">Temperatura de Operação</Label>
                <Input
                  id="temperaturaOperacao"
                  value={formData.temperaturaOperacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperaturaOperacao: e.target.value }))}
                  placeholder="Ex: 20°C"
                />
              </div>
              <div>
                <Label htmlFor="dataHoraTeste">Data e Hora do Teste</Label>
                <Input
                  id="dataHoraTeste"
                  type="datetime-local"
                  value={formData.dataHoraTeste}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataHoraTeste: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="resultadoTeste">Resultado do Teste *</Label>
              <Input
                id="resultadoTeste"
                value={formData.resultadoTeste}
                onChange={(e) => setFormData(prev => ({ ...prev, resultadoTeste: e.target.value }))}
                placeholder="Ex: Aprovado, Reprovado, Requer ajustes"
              />
            </div>

            <div>
              <Label htmlFor="observacoesTeste">Observações do Teste</Label>
              <Textarea
                id="observacoesTeste"
                value={formData.observacoesTeste}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoesTeste: e.target.value }))}
                placeholder="Descreva detalhes importantes do teste, anomalias encontradas, etc."
                rows={3}
              />
            </div>

            {/* Upload de Vídeo */}
            <div>
              <Label htmlFor="videoTeste">Vídeo do Teste</Label>
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