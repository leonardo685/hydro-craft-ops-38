import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check, Calendar, FileText, User, DollarSign, Link, Mail, Plus, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadPdfModal } from "./UploadPdfModal";
import { supabase } from "@/integrations/supabase/client";
import EmitirNotaModal from "./EmitirNotaModal";
import { useClientes } from "@/hooks/use-clientes";
import { useEmpresa } from "@/contexts/EmpresaContext";

const WEBHOOK_URL_EMAIL_NF = 'https://primary-production-dc42.up.railway.app/webhook-test/63fc063c-8cd3-4cef-8a5a-efec4c7821a0';

interface EmitirNotaRetornoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: {
    id: string;
    numero_ordem: string;
    cliente_nome: string;
    equipamento: string;
    data_entrada: string;
    nota_fiscal?: string;
    orcamento_vinculado?: string;
  };
  onConfirm: (ordemId: string) => void;
}

export function EmitirNotaRetornoModal({ 
  open, 
  onOpenChange, 
  ordem, 
  onConfirm 
}: EmitirNotaRetornoModalProps) {
  const [copied, setCopied] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConfirmFaturamento, setShowConfirmFaturamento] = useState(false);
  const [orcamentoData, setOrcamentoData] = useState<any>(null);
  const [showEmitirNotaModal, setShowEmitirNotaModal] = useState(false);
  const [notaEmitida, setNotaEmitida] = useState(false);
  const { toast } = useToast();
  const { clientes, adicionarEmail } = useClientes();
  const { empresaAtual } = useEmpresa();

  // Estados para envio por email
  const [mostrarEmailSection, setMostrarEmailSection] = useState(false);
  const [emailsSelecionados, setEmailsSelecionados] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [numeroPedido, setNumeroPedido] = useState('');

  // Buscar cliente e seus emails
  const clienteEncontrado = useMemo(() => {
    if (!ordem?.cliente_nome) return null;
    return clientes.find(c => c.nome === ordem.cliente_nome) || null;
  }, [clientes, ordem?.cliente_nome]);

  const emailsDisponiveis = useMemo(() => {
    if (!clienteEncontrado) return [];
    const emails: string[] = [];
    if (clienteEncontrado.email) emails.push(clienteEncontrado.email);
    if (clienteEncontrado.emails_adicionais) {
      emails.push(...(clienteEncontrado.emails_adicionais as string[]));
    }
    return [...new Set(emails)];
  }, [clienteEncontrado]);

  useEffect(() => {
    if (!open) {
      setMostrarEmailSection(false);
      setEmailsSelecionados([]);
      setNovoEmail('');
      setNumeroPedido('');
      setNotaEmitida(false);
    }
  }, [open]);

  // Buscar numero_pedido do orçamento vinculado
  useEffect(() => {
    const fetchNumeroPedido = async () => {
      if (!open || !ordem?.orcamento_vinculado) return;
      try {
        const { data } = await supabase
          .from('orcamentos')
          .select('numero_pedido')
          .eq('numero', ordem.orcamento_vinculado)
          .maybeSingle();
        if (data?.numero_pedido) {
          setNumeroPedido(data.numero_pedido);
        }
      } catch (err) {
        console.error('Erro ao buscar numero_pedido:', err);
      }
    };
    fetchNumeroPedido();
  }, [open, ordem?.orcamento_vinculado]);

  const handleToggleEmail = (email: string) => {
    setEmailsSelecionados(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleAdicionarEmail = async () => {
    const emailTrimmed = novoEmail.trim().toLowerCase();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast({ title: "Email inválido", description: "Informe um email válido", variant: "destructive" });
      return;
    }
    if (emailsDisponiveis.includes(emailTrimmed)) {
      toast({ title: "Email já cadastrado", description: "Este email já está na lista", variant: "destructive" });
      return;
    }
    if (clienteEncontrado) {
      try {
        await adicionarEmail(clienteEncontrado.id, emailTrimmed);
        setEmailsSelecionados(prev => [...prev, emailTrimmed]);
        setNovoEmail('');
      } catch {
        // toast already shown by hook
      }
    }
  };

  const handleEnviarPorEmail = async () => {
    if (emailsSelecionados.length === 0) {
      toast({ title: "Selecione emails", description: "Selecione pelo menos um email destinatário", variant: "destructive" });
      return;
    }
    setEnviandoEmail(true);
    try {
      // Buscar URL do PDF da nota de retorno do recebimento
      let pdfUrl = '';
      const { data: ordemData } = await supabase
        .from('ordens_servico')
        .select('recebimento_id')
        .eq('id', ordem.id)
        .single();

      if (ordemData?.recebimento_id) {
        const { data: recebimento } = await supabase
          .from('recebimentos')
          .select('pdf_nota_retorno, numero_nota_retorno')
          .eq('id', ordemData.recebimento_id)
          .single();
        pdfUrl = recebimento?.pdf_nota_retorno || '';
      }

      // Buscar dados do orçamento vinculado se existir
      let diasFaturamento = 0;
      let numeroOrcamento = ordem.orcamento_vinculado || '';
      let numeroPedido = '';
      if (ordem.orcamento_vinculado) {
        const { data: orc } = await supabase
          .from('orcamentos')
          .select('prazo_pagamento, numero_pedido, numero_nota_entrada')
          .eq('numero', ordem.orcamento_vinculado)
          .single();
        if (orc) {
          diasFaturamento = orc.prazo_pagamento || 0;
          numeroPedido = orc.numero_pedido || '';
        }
      }

      const payload = {
        tipo: 'envio_nota_fiscal',
        emails_destinatarios: emailsSelecionados,
        numero_nf: ordem.nota_fiscal || '',
        tipo_nota: 'retorno',
        numero_orcamento: numeroOrcamento,
        numero_pedido: numeroPedido,
        dias_faturamento: diasFaturamento,
        nota_entrada: ordem.nota_fiscal || '',
        cliente_nome: ordem.cliente_nome,
        valor: 0,
        pdf_nota_fiscal_url: pdfUrl,
        equipamento: ordem.equipamento,
        empresa_id: empresaAtual?.id || ''
      };

      const response = await fetch(WEBHOOK_URL_EMAIL_NF, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast({ title: "Email enviado!", description: `Nota de retorno enviada para ${emailsSelecionados.length} destinatário(s)` });
        setMostrarEmailSection(false);
      } else {
        toast({ title: "Erro", description: "Falha ao enviar webhook de email", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao enviar email", variant: "destructive" });
    } finally {
      setEnviandoEmail(false);
    }
  };

  const textoNota = `I - Retorno da NF ${ordem.nota_fiscal || 'N/A'}.
II - Pedido ${numeroPedido || 'N (a configurar)'}`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textoNota);
      setCopied(true);
      toast({
        title: "Texto copiado!",
        description: "O texto foi copiado para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar texto para área de transferência",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = () => {
    setShowUploadModal(true);
  };

  const handleUploadComplete = async () => {
    onConfirm(ordem.id);
    setShowUploadModal(false);
    
    if (ordem.orcamento_vinculado) {
      try {
        const { data: orcamento, error } = await supabase
          .from('orcamentos')
          .select('*')
          .eq('numero', ordem.orcamento_vinculado)
          .single();
        
        if (error) {
          console.error('Erro ao buscar orçamento:', error);
          onOpenChange(false);
          return;
        }
        
        if (orcamento && (orcamento.status === 'aprovado' || orcamento.status === 'faturamento')) {
          setOrcamentoData(orcamento);
          setShowConfirmFaturamento(true);
        } else {
          onOpenChange(false);
        }
      } catch (error) {
        console.error('Erro ao verificar orçamento:', error);
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmarFaturamento = () => {
    setShowConfirmFaturamento(false);
    setShowEmitirNotaModal(true);
  };

  const handleRecusarFaturamento = () => {
    setShowConfirmFaturamento(false);
    setOrcamentoData(null);
    onOpenChange(false);
  };

  const handleFaturamentoComplete = () => {
    setShowEmitirNotaModal(false);
    setOrcamentoData(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Emitir Nota de Retorno
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações da Ordem */}
            <div className="bg-gradient-secondary p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrada</p>
                  <p className="font-medium">
                    {new Date(ordem.data_entrada).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{ordem.cliente_nome}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Nº da Nota</p>
                  <p className="font-medium">{ordem.nota_fiscal || 'N/A'}</p>
                </div>
              </div>

              {ordem.orcamento_vinculado && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Link className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Orçamento Vinculado</p>
                    <p className="font-medium text-green-600">{ordem.orcamento_vinculado}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Área de Texto */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Texto da Nota de Retorno:</label>
              <Textarea
                value={textoNota}
                readOnly
                className="min-h-[100px] bg-muted"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar para Área de Transferência
                  </>
                )}
              </Button>
            </div>

            {/* Seção de envio por email */}
            {mostrarEmailSection && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Selecionar destinatários
                </Label>
                
                {emailsDisponiveis.length === 0 && !clienteEncontrado && (
                  <p className="text-sm text-muted-foreground">
                    Cliente não encontrado no cadastro. Adicione um email abaixo.
                  </p>
                )}

                {emailsDisponiveis.length === 0 && clienteEncontrado && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum email cadastrado para este cliente. Adicione abaixo.
                  </p>
                )}

                <div className="space-y-2">
                  {emailsDisponiveis.map(email => (
                    <div key={email} className="flex items-center gap-2">
                      <Checkbox
                        checked={emailsSelecionados.includes(email)}
                        onCheckedChange={() => handleToggleEmail(email)}
                      />
                      <span className="text-sm">{email}</span>
                    </div>
                  ))}
                </div>

                {/* Adicionar novo email */}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="novo@email.com"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdicionarEmail()}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={handleAdicionarEmail} disabled={!clienteEncontrado}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails adicionados serão salvos no cadastro do cliente
                </p>

                <Button
                  onClick={handleEnviarPorEmail}
                  disabled={enviandoEmail || emailsSelecionados.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {enviandoEmail ? (
                    <>
                      <Send className="h-4 w-4 mr-2 animate-pulse" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar para {emailsSelecionados.length} destinatário(s)
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => setMostrarEmailSection(!mostrarEmailSection)}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button onClick={handleConfirm} className="flex-1 bg-gradient-primary">
                Confirmar Emissão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload do PDF da Nota de Retorno */}
      <UploadPdfModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        ordemId={ordem.id}
        onUploadComplete={handleUploadComplete}
        tipoUpload="nota_retorno"
      />

      {/* Modal de Confirmação para Faturamento */}
      <Dialog open={showConfirmFaturamento} onOpenChange={setShowConfirmFaturamento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Orçamento Vinculado Detectado
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-sm text-muted-foreground mb-2">
                A nota de retorno da ordem <strong>{ordem.numero_ordem}</strong> foi emitida com sucesso!
              </p>
              <p className="text-foreground">
                Esta ordem está vinculada ao orçamento <strong className="text-green-600">{ordem.orcamento_vinculado}</strong>.
              </p>
            </div>
            
            <p className="text-center font-medium">
              Deseja emitir a nota de faturamento agora?
            </p>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleRecusarFaturamento}
              >
                Não, apenas retorno
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleConfirmarFaturamento}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Sim, emitir faturamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Emissão de Nota de Faturamento */}
      {orcamentoData && (
        <EmitirNotaModal
          open={showEmitirNotaModal}
          onOpenChange={(open) => {
            setShowEmitirNotaModal(open);
            if (!open) {
              setOrcamentoData(null);
              onOpenChange(false);
            }
          }}
          orcamento={orcamentoData}
          onConfirm={handleFaturamentoComplete}
        />
      )}
    </>
  );
}
