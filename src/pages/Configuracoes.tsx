import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Globe, Building2, Upload, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Configuracoes() {
  const { language, setLanguage, t } = useLanguage();
  const { empresaAtual, isOwner, recarregarEmpresas } = useEmpresa();
  const { userRole } = useAuth();
  
  // Owner ou Admin podem editar
  const canEdit = isOwner || userRole === 'admin';
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
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

  // Load empresa data
  useEffect(() => {
    if (empresaAtual) {
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
    }
  }, [empresaAtual]);

  const handleLanguageChange = (value: 'pt-BR' | 'en') => {
    setLanguage(value);
    toast.success(t('settings.saved'));
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatTelefone = (value: string) => {
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
          updated_at: new Date().toISOString(),
        })
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
                    <Label htmlFor="nome">Nome Fantasia</Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Nome da empresa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="razaoSocial">Razão Social</Label>
                    <Input
                      id="razaoSocial"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Razão social"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                      disabled={!canEdit}
                      placeholder="00.000.000/0000-00"
                    />
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
                      onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                      disabled={!canEdit}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={cep}
                      onChange={(e) => setCep(formatCEP(e.target.value))}
                      disabled={!canEdit}
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                      disabled={!canEdit}
                      placeholder="UF"
                      maxLength={2}
                    />
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
