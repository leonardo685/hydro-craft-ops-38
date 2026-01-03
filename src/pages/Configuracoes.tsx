import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Globe, Building2, Upload, Loader2, Search, Webhook } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TipoIdentificacao = 'cnpj' | 'ein';

export default function Configuracoes() {
  const { language, setLanguage, t } = useLanguage();
  const { empresaAtual, isOwner, recarregarEmpresas } = useEmpresa();
  const { userRole } = useAuth();
  
  // Owner ou Admin podem editar
  const canEdit = isOwner || userRole === 'admin';
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchingCNPJ, setSearchingCNPJ] = useState(false);
  
  // Form state
  const [tipoIdentificacao, setTipoIdentificacao] = useState<TipoIdentificacao>('cnpj');
  const [nome, setNome] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  // Load empresa data
  useEffect(() => {
    if (empresaAtual) {
      // Type assertion para acessar tipo_identificacao
      const empresa = empresaAtual as typeof empresaAtual & { tipo_identificacao?: string };
      setTipoIdentificacao((empresa.tipo_identificacao as TipoIdentificacao) || 'cnpj');
      setNome(empresaAtual.nome || "");
      setRazaoSocial(empresaAtual.razao_social || "");
      setCnpj(empresaAtual.cnpj || "");
      setEmail(empresaAtual.email || "");
      setTelefone(empresaAtual.telefone || "");
      setEndereco(empresaAtual.endereco || "");
      setCidade(empresaAtual.cidade || "");
      setEstado(empresaAtual.estado || "");
      setCep(empresaAtual.cep || "");
      setLogoUrl(empresaAtual.logo_url || "");
      // Carregar webhook da empresa
      const config = empresaAtual.configuracoes as { webhook_url?: string } | null;
      setWebhookUrl(config?.webhook_url || "");
    }
  }, [empresaAtual]);

  const handleLanguageChange = (value: 'pt-BR' | 'en') => {
    setLanguage(value);
    toast.success(t('settings.saved'));
  };

  // Formatadores para Brasil
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatTelefoneBR = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  // Formatadores para EUA
  const formatEIN = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{2})(\d)/, '$1-$2').slice(0, 10);
  };

  const formatTelefoneUS = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const formatZIPCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 9)}`;
  };

  // Handler dinâmico baseado no tipo
  const handleIdentificacaoChange = (value: string) => {
    if (tipoIdentificacao === 'cnpj') {
      setCnpj(formatCNPJ(value));
    } else {
      setCnpj(formatEIN(value));
    }
  };

  const handleTelefoneChange = (value: string) => {
    if (tipoIdentificacao === 'cnpj') {
      setTelefone(formatTelefoneBR(value));
    } else {
      setTelefone(formatTelefoneUS(value));
    }
  };

  const handleCodigoPostalChange = (value: string) => {
    if (tipoIdentificacao === 'cnpj') {
      setCep(formatCEP(value));
    } else {
      setCep(formatZIPCode(value));
    }
  };

  const handleEstadoChange = (value: string) => {
    if (tipoIdentificacao === 'cnpj') {
      setEstado(value.toUpperCase().slice(0, 2));
    } else {
      // EUA: permite abreviação de 2 letras
      setEstado(value.toUpperCase().slice(0, 2));
    }
  };

  // Busca dados do CNPJ via ReceitaWS
  const handleSearchCNPJ = async () => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos");
      return;
    }

    setSearchingCNPJ(true);
    try {
      // Usando proxy para evitar CORS
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        throw new Error("CNPJ não encontrado");
      }

      const data = await response.json();
      
      // Preenche os campos com os dados retornados
      if (data.razao_social) setRazaoSocial(data.razao_social);
      if (data.nome_fantasia) setNome(data.nome_fantasia || data.razao_social);
      if (data.email) setEmail(data.email);
      if (data.ddd_telefone_1) setTelefone(formatTelefoneBR(data.ddd_telefone_1));
      if (data.cep) setCep(formatCEP(data.cep));
      if (data.logradouro) {
        const enderecoCompleto = [
          data.logradouro,
          data.numero,
          data.complemento,
          data.bairro
        ].filter(Boolean).join(', ');
        setEndereco(enderecoCompleto);
      }
      if (data.municipio) setCidade(data.municipio);
      if (data.uf) setEstado(data.uf);
      
      toast.success("Dados do CNPJ carregados com sucesso!");
    } catch (error: any) {
      console.error("Erro ao buscar CNPJ:", error);
      toast.error("Não foi possível buscar os dados do CNPJ");
    } finally {
      setSearchingCNPJ(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaAtual) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${empresaAtual.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      toast.success("Logo enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao enviar logo:", error);
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEmpresa = async () => {
    if (!empresaAtual) return;

    setSaving(true);
    try {
      // Preparar configurações incluindo webhook
      const configuracoesAtuais = (empresaAtual.configuracoes as Record<string, any>) || {};
      const novasConfiguracoes = {
        ...configuracoesAtuais,
        webhook_url: webhookUrl || null,
      };

      const { error } = await supabase
        .from('empresas')
        .update({
          nome,
          razao_social: razaoSocial || null,
          cnpj: cnpj || null,
          email: email || null,
          telefone: telefone || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          cep: cep || null,
          logo_url: logoUrl || null,
          tipo_identificacao: tipoIdentificacao,
          configuracoes: novasConfiguracoes,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', empresaAtual.id);

      if (error) throw error;

      await recarregarEmpresas();
      toast.success("Informações da empresa salvas com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar empresa:", error);
      toast.error("Erro ao salvar informações da empresa");
    } finally {
      setSaving(false);
    }
  };

  // Labels dinâmicos baseados no tipo de identificação
  const labels = {
    identificacao: tipoIdentificacao === 'cnpj' ? 'CNPJ' : 'EIN',
    placeholderIdentificacao: tipoIdentificacao === 'cnpj' ? '00.000.000/0000-00' : '00-0000000',
    codigoPostal: tipoIdentificacao === 'cnpj' ? 'CEP' : 'ZIP Code',
    placeholderCodigoPostal: tipoIdentificacao === 'cnpj' ? '00000-000' : '00000 ou 00000-0000',
    placeholderTelefone: tipoIdentificacao === 'cnpj' ? '(00) 00000-0000' : '(000) 000-0000',
    placeholderEstado: tipoIdentificacao === 'cnpj' ? 'UF' : 'State',
    razaoSocial: tipoIdentificacao === 'cnpj' ? 'Razão Social' : 'Legal Name',
    nomeFantasia: tipoIdentificacao === 'cnpj' ? 'Nome Fantasia' : 'Trade Name',
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            {t('settings.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Informações da Empresa */}
          {empresaAtual && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informações da Empresa
                </CardTitle>
                <CardDescription>
                  {canEdit 
                    ? "Gerencie as informações da sua empresa"
                    : "Visualize as informações da empresa"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tipo de Identificação */}
                {canEdit && (
                  <div className="space-y-2">
                    <Label>País / Tipo de Identificação</Label>
                    <RadioGroup
                      value={tipoIdentificacao}
                      onValueChange={(value) => {
                        setTipoIdentificacao(value as TipoIdentificacao);
                        // Limpa o campo de identificação ao trocar
                        setCnpj("");
                        setTelefone("");
                        setCep("");
                      }}
                      className="flex gap-4"
                      disabled={!canEdit}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cnpj" id="tipo-cnpj" />
                        <Label htmlFor="tipo-cnpj" className="flex items-center gap-2 cursor-pointer">
                          <span>🇧🇷</span>
                          Brasil (CNPJ)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ein" id="tipo-ein" />
                        <Label htmlFor="tipo-ein" className="flex items-center gap-2 cursor-pointer">
                          <span>🇺🇸</span>
                          EUA (EIN)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="h-16 w-16 object-contain rounded-lg border"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center border">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {canEdit && (
                      <div>
                        <Label 
                          htmlFor="logo-upload" 
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {uploading ? "Enviando..." : "Enviar Logo"}
                        </Label>
                        <Input 
                          id="logo-upload"
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={uploading}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG até 2MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">{labels.nomeFantasia}</Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Nome da empresa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="razaoSocial">{labels.razaoSocial}</Label>
                    <Input
                      id="razaoSocial"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      disabled={!canEdit}
                      placeholder={tipoIdentificacao === 'cnpj' ? "Razão social" : "Legal name"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">{labels.identificacao}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cnpj"
                        value={cnpj}
                        onChange={(e) => handleIdentificacaoChange(e.target.value)}
                        disabled={!canEdit}
                        placeholder={labels.placeholderIdentificacao}
                        className="flex-1"
                      />
                      {tipoIdentificacao === 'cnpj' && canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleSearchCNPJ}
                          disabled={searchingCNPJ || cnpj.replace(/\D/g, '').length !== 14}
                          title="Buscar dados do CNPJ"
                        >
                          {searchingCNPJ ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    {tipoIdentificacao === 'cnpj' && (
                      <p className="text-xs text-muted-foreground">
                        Clique na lupa para buscar dados automaticamente
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!canEdit}
                      placeholder="contato@empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) => handleTelefoneChange(e.target.value)}
                      disabled={!canEdit}
                      placeholder={labels.placeholderTelefone}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">{labels.codigoPostal}</Label>
                    <Input
                      id="cep"
                      value={cep}
                      onChange={(e) => handleCodigoPostalChange(e.target.value)}
                      disabled={!canEdit}
                      placeholder={labels.placeholderCodigoPostal}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco">Endereço / Address</Label>
                    <Input
                      id="endereco"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      disabled={!canEdit}
                      placeholder={tipoIdentificacao === 'cnpj' ? "Rua, número, complemento" : "Street, number, suite"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cidade">{tipoIdentificacao === 'cnpj' ? 'Cidade' : 'City'}</Label>
                    <Input
                      id="cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      disabled={!canEdit}
                      placeholder={tipoIdentificacao === 'cnpj' ? "Cidade" : "City"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">{tipoIdentificacao === 'cnpj' ? 'Estado' : 'State'}</Label>
                    <Input
                      id="estado"
                      value={estado}
                      onChange={(e) => handleEstadoChange(e.target.value)}
                      disabled={!canEdit}
                      placeholder={labels.placeholderEstado}
                      maxLength={2}
                    />
                  </div>

                  {/* Webhook URL */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="webhookUrl" className="flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      URL do Webhook (n8n)
                    </Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      disabled={!canEdit}
                      placeholder="https://seu-servidor.com/webhook/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      URL do webhook para receber notificações de orçamentos aprovados, ordens finalizadas, etc.
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="pt-4">
                    <Button 
                      onClick={handleSaveEmpresa} 
                      disabled={saving}
                      className="w-full md:w-auto"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Informações"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Idioma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>
                {t('settings.languageDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={language}
                onValueChange={handleLanguageChange}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="pt-BR" id="pt-BR" />
                  <Label htmlFor="pt-BR" className="flex-1 cursor-pointer flex items-center gap-3">
                    <span className="text-2xl">🇧🇷</span>
                    <div>
                      <p className="font-medium">{t('settings.portuguese')}</p>
                      <p className="text-sm text-muted-foreground">Português do Brasil</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="en" id="en" />
                  <Label htmlFor="en" className="flex-1 cursor-pointer flex items-center gap-3">
                    <span className="text-2xl">🇺🇸</span>
                    <div>
                      <p className="font-medium">{t('settings.english')}</p>
                      <p className="text-sm text-muted-foreground">English (US)</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
