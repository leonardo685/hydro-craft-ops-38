import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileText, AlertCircle, FileCode, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemId: string;
  onUploadComplete: () => void;
  tipoUpload: 'nota_fiscal' | 'nota_retorno';
}

export function UploadPdfModal({ 
  open, 
  onOpenChange, 
  ordemId, 
  onUploadComplete,
  tipoUpload 
}: UploadPdfModalProps) {
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [arquivoXml, setArquivoXml] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [numeroNotaRetorno, setNumeroNotaRetorno] = useState('');
  const { toast } = useToast();

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ title: "Arquivo inválido", description: "Selecione apenas arquivos PDF", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "O arquivo deve ter no máximo 10MB", variant: "destructive" });
        return;
      }
      setArquivoPdf(file);
    }
  };

  const handleXmlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
        toast({ title: "Arquivo inválido", description: "Selecione apenas arquivos XML", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "O arquivo deve ter no máximo 10MB", variant: "destructive" });
        return;
      }
      setArquivoXml(file);
    }
  };

  const handleUpload = async () => {
    if (!arquivoPdf) {
      toast({ title: "Erro", description: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }

    if (tipoUpload === 'nota_retorno' && !numeroNotaRetorno.trim()) {
      toast({ title: "Erro", description: "Informe o número da nota de retorno", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Upload PDF
      const nomePdf = `${tipoUpload}_${ordemId}_${Date.now()}.pdf`;
      const { error: pdfError } = await supabase.storage
        .from('equipamentos')
        .upload(`notas-fiscais/${nomePdf}`, arquivoPdf);
      if (pdfError) throw pdfError;

      const { data: pdfUrlData } = supabase.storage
        .from('equipamentos')
        .getPublicUrl(`notas-fiscais/${nomePdf}`);

      // Upload XML (opcional)
      let xmlUrl: string | null = null;
      if (arquivoXml) {
        const nomeXml = `${tipoUpload}_${ordemId}_${Date.now()}.xml`;
        const { error: xmlError } = await supabase.storage
          .from('equipamentos')
          .upload(`notas-fiscais/${nomeXml}`, arquivoXml);
        if (xmlError) throw xmlError;

        const { data: xmlUrlData } = supabase.storage
          .from('equipamentos')
          .getPublicUrl(`notas-fiscais/${nomeXml}`);
        xmlUrl = xmlUrlData.publicUrl;
      }

      // Atualizar a tabela correspondente
      if (tipoUpload === 'nota_fiscal') {
        const updateData: any = { pdf_nota_fiscal: pdfUrlData.publicUrl };
        if (xmlUrl) updateData.xml_nota_fiscal = xmlUrl;
        
        const { error: updateError } = await supabase
          .from('ordens_servico')
          .update(updateData)
          .eq('id', ordemId);
        if (updateError) throw updateError;
      } else {
        const { data: ordem, error: ordemError } = await supabase
          .from('ordens_servico')
          .select('recebimento_id')
          .eq('id', ordemId)
          .single();
        if (ordemError) throw ordemError;

        if (ordem.recebimento_id) {
          const updateData: any = { 
            pdf_nota_retorno: pdfUrlData.publicUrl,
            data_nota_retorno: new Date().toISOString(),
            numero_nota_retorno: numeroNotaRetorno.trim(),
            na_empresa: false
          };
          if (xmlUrl) updateData.xml_nota_retorno = xmlUrl;

          const { error: updateError } = await supabase
            .from('recebimentos')
            .update(updateData)
            .eq('id', ordem.recebimento_id);
          if (updateError) throw updateError;
        }
      }

      toast({
        title: "Upload concluído",
        description: `Arquivos anexados com sucesso!${arquivoXml ? ' (PDF + XML)' : ' (PDF)'}`,
      });

      onUploadComplete();
      onOpenChange(false);
      setArquivoPdf(null);
      setArquivoXml(null);
      setNumeroNotaRetorno('');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({ title: "Erro no upload", description: "Erro ao anexar os arquivos. Tente novamente.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const getTitulo = () => tipoUpload === 'nota_fiscal' ? 'Anexar Nota Fiscal' : 'Anexar Nota de Retorno';
  const getDescricao = () => tipoUpload === 'nota_fiscal' 
    ? 'Faça upload do PDF e XML da nota fiscal emitida'
    : 'Faça upload do PDF e XML da nota de retorno';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="bg-gradient-secondary p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium">{getDescricao()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF obrigatório, XML opcional — máximo 10MB cada
                </p>
              </div>
            </div>
          </div>

          {tipoUpload === 'nota_retorno' && (
            <div className="space-y-2">
              <Label htmlFor="numeroNotaRetorno">Número da Nota de Retorno *</Label>
              <Input
                id="numeroNotaRetorno"
                value={numeroNotaRetorno}
                onChange={(e) => setNumeroNotaRetorno(e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>
          )}

          {/* PDF Upload */}
          <div className="space-y-2">
            <Label htmlFor="arquivoPdf">Arquivo PDF *</Label>
            <Input
              id="arquivoPdf"
              type="file"
              accept=".pdf"
              onChange={handlePdfChange}
              className="cursor-pointer"
            />
            {arquivoPdf && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm truncate">{arquivoPdf.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {(arquivoPdf.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setArquivoPdf(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* XML Upload */}
          <div className="space-y-2">
            <Label htmlFor="arquivoXml">Arquivo XML <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              id="arquivoXml"
              type="file"
              accept=".xml"
              onChange={handleXmlChange}
              className="cursor-pointer"
            />
            {arquivoXml && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <FileCode className="h-4 w-4 text-primary" />
                <span className="text-sm truncate">{arquivoXml.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {(arquivoXml.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setArquivoXml(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              className="flex-1 bg-gradient-primary"
              disabled={!arquivoPdf || uploading}
            >
              {uploading ? "Enviando..." : "Anexar Arquivos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
