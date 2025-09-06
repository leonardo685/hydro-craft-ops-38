import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileText, TrendingUp, AlertCircle, CheckCircle2, Clock, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRecebimentos } from "@/hooks/use-recebimentos";

export default function Recebimentos() {
  const navigate = useNavigate();
  const { recebimentos, loading } = useRecebimentos();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    console.log('Usando dados do Supabase');
  }, []);

  const filteredRecebimentos = recebimentos.filter(recebimento => {
    const matchesSearch = 
      recebimento.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recebimento.numero_ordem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recebimento.tipo_equipamento.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "todos" || recebimento.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recebido":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "em_analise":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "concluido":
        return "bg-green-100 text-green-800 border-green-200";
      case "aguardando_pecas":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "recebido":
        return "Recebido";
      case "em_analise":
        return "Em Análise";
      case "concluido":
        return "Concluído";
      case "aguardando_pecas":
        return "Aguardando Peças";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "recebido":
        return <FileText className="h-4 w-4" />;
      case "em_analise":
        return <Clock className="h-4 w-4" />;
      case "concluido":
        return <CheckCircle2 className="h-4 w-4" />;
      case "aguardando_pecas":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const stats = {
    total: recebimentos.length,
    recebidos: recebimentos.filter(r => r.status === 'recebido').length,
    emAnalise: recebimentos.filter(r => r.status === 'em_analise').length,
    concluidos: recebimentos.filter(r => r.status === 'concluido').length
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Recebimentos</h2>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Recebimentos</h2>
            <p className="text-muted-foreground">
              Gerencie todos os equipamentos recebidos ({stats.total})
            </p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium"
            onClick={() => navigate('/recebimentos/novo')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Recebimento
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <p className="text-xs text-muted-foreground">equipamentos registrados</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recebidos</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.recebidos}</div>
              <p className="text-xs text-muted-foreground">aguardando análise</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.emAnalise}</div>
              <p className="text-xs text-muted-foreground">sendo analisados</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.concluidos}</div>
              <p className="text-xs text-muted-foreground">finalizados</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Lista de Recebimentos</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, ordem ou equipamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="aguardando_pecas">Aguardando Peças</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold text-foreground">Nº da Ordem</TableHead>
                    <TableHead className="font-semibold text-foreground">Cliente</TableHead>
                    <TableHead className="font-semibold text-foreground">Equipamento</TableHead>
                    <TableHead className="font-semibold text-foreground">Data de Entrada</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecebimentos.map((recebimento) => (
                    <TableRow key={recebimento.id} className="hover:bg-muted/30 transition-fast">
                      <TableCell className="font-medium text-primary">{recebimento.numero_ordem}</TableCell>
                      <TableCell className="text-primary font-medium">{recebimento.cliente_nome}</TableCell>
                      <TableCell className="text-foreground">{recebimento.tipo_equipamento}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(recebimento.data_entrada).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(recebimento.status)}>
                          {getStatusIcon(recebimento.status)}
                          <span className="ml-1">{getStatusText(recebimento.status)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/recebimentos/${recebimento.numero_ordem}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}