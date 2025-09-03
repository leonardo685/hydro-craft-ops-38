import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Plus, ThumbsUp, ThumbsDown, Edit, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const analisesDefault: any[] = [];

export default function Analise() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [analises, setAnalises] = useState<any[]>([]);

  useEffect(() => {
    // Carregar análises do localStorage
    const analisesStorage = JSON.parse(localStorage.getItem('analises') || '[]');
    setAnalises(analisesStorage);
  }, []);

  const filteredAnalises = analises.filter(analise =>
    analise.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analise.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analise.equipamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Em Análise":
        return "bg-warning text-warning-foreground";
      case "Concluída":
        return "bg-accent text-accent-foreground";
      case "Aguardando Peças":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "media":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "baixa":
        return "bg-accent/10 text-accent-foreground border-accent/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const html2canvas = (await import('html2canvas')).default;
    
    const doc = new jsPDF();
    
    // Cabeçalho da empresa
    doc.setFillColor(220, 53, 69); // Vermelho da empresa
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MEC-HIDRO MECÂNICA E HIDRÁULICA LTDA', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('CNPJ: 93.338.138/0001-97', 15, 28);
    doc.text('Fone/Fax: (19) 3945-4527', 15, 34);
    
    // Título do relatório
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Análises Técnicas', 15, 55);
    
    // Data do relatório
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, 55);
    
    // Tabela de análises
    let yPosition = 70;
    const lineHeight = 8;
    
    // Cabeçalho da tabela
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Nº Ordem', 20, yPosition + 7);
    doc.text('Cliente', 50, yPosition + 7);
    doc.text('Equipamento', 100, yPosition + 7);
    doc.text('Status', 150, yPosition + 7);
    
    yPosition += 15;
    
    // Dados das análises
    doc.setFont('helvetica', 'normal');
    filteredAnalises.forEach((analise, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(analise.id, 20, yPosition);
      doc.text(analise.cliente.substring(0, 25) + (analise.cliente.length > 25 ? '...' : ''), 50, yPosition);
      doc.text(analise.equipamento.substring(0, 20) + (analise.equipamento.length > 20 ? '...' : ''), 100, yPosition);
      doc.text(analise.status, 150, yPosition);
      
      yPosition += lineHeight;
    });
    
    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(220, 53, 69);
      doc.triangle(180, 280, 210, 280, 210, 297, 'F');
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, 15, 290);
    }
    
    doc.save('relatorio-analises.pdf');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Análises Técnicas</h2>
            <p className="text-muted-foreground">
              Gerencie todas as análises de equipamentos
            </p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium"
            onClick={() => navigate('/analise/novo')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Análise
          </Button>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Lista de Análises</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, ordem ou equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={exportToPDF}
              variant="outline"
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
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
                    <TableHead className="font-semibold text-foreground">Técnico</TableHead>
                    <TableHead className="font-semibold text-foreground">Data de Entrada</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalises.map((analise) => (
                    <TableRow key={analise.id} className="hover:bg-muted/30 transition-fast">
                      <TableCell className="font-medium text-primary">{analise.id}</TableCell>
                      <TableCell className="text-primary font-medium">{analise.cliente}</TableCell>
                      <TableCell className="text-foreground">{analise.equipamento}</TableCell>
                      <TableCell className="text-muted-foreground">{analise.tecnico}</TableCell>
                      <TableCell className="text-muted-foreground">{analise.dataEntrada}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/analise/novo/${encodeURIComponent(analise.id)}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
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