import { addLogoToPDF } from "./pdf-logo-utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ManutencaoHistorico {
  id: string;
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  data_entrada: string;
  data_finalizacao: string | null;
  motivo_falha: string | null;
  status: string;
  ordem_anterior: string | null;
  dias_no_servico: number | null;
  dias_desde_ultima: number | null;
}

interface Empresa {
  id?: string;
  nome?: string;
  razao_social?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  tipo_identificacao?: string;
}

export async function gerarPDFHistorico(
  historico: ManutencaoHistorico[],
  empresaAtual: Empresa | null
) {
  const jsPDF = (await import('jspdf')).default;
  
  const tipoIdentificacao = empresaAtual?.tipo_identificacao || 'cnpj';
  const labelIdentificacao = tipoIdentificacao === 'ein' ? 'EIN' : tipoIdentificacao === 'ssn' ? 'SSN' : 'CNPJ';
  
  const EMPRESA_INFO = {
    nome: empresaAtual?.razao_social || empresaAtual?.nome || "N/A",
    cnpj: empresaAtual?.cnpj || "",
    telefone: empresaAtual?.telefone || "",
    email: empresaAtual?.email || "",
    labelIdentificacao
  };
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 10;
  
  // Função para verificar se precisa de nova página
  const verificarNovaPagina = (alturaRequerida: number) => {
    if (yPosition + alturaRequerida > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };
  
  // Função para adicionar rodapé
  const adicionarRodape = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Detalhe decorativo
      doc.setFillColor(220, 38, 38);
      doc.triangle(
        pageWidth - 30, pageHeight - 30,
        pageWidth, pageHeight - 30,
        pageWidth, pageHeight,
        'F'
      );
      
      doc.setFillColor(0, 0, 0);
      doc.triangle(
        pageWidth - 15, pageHeight - 30,
        pageWidth, pageHeight - 30,
        pageWidth, pageHeight,
        'F'
      );
      
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${totalPages}`, 15, pageHeight - 10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 60, pageHeight - 10);
    }
  };
  
  // Adicionar logo dinâmico
  await addLogoToPDF(doc, empresaAtual?.logo_url, pageWidth - 50, 8, 35, 20);
  
  // Cabeçalho Profissional
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${EMPRESA_INFO.labelIdentificacao}: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
  doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
  doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
  
  // Linha separadora vermelha
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
  
  // Detalhe vermelho no canto superior direito
  doc.setFillColor(220, 38, 38);
  doc.triangle(
    pageWidth - 20, 10,
    pageWidth, 10,
    pageWidth, 40,
    'F'
  );
  
  yPosition = 48;
  
  // Título
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text("HISTÓRICO DE MANUTENÇÃO", pageWidth / 2, yPosition, { align: "center" });
  doc.setTextColor(0, 0, 0);
  
  yPosition = 65;
  
  // Informações do equipamento/cliente
  if (historico.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Cliente: ${historico[0].cliente_nome}`, 20, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Equipamento: ${historico[0].equipamento}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Total de Manutenções: ${historico.length}`, 20, yPosition);
    yPosition += 15;
  }
  
  // Tabela de histórico
  const criarTabelaHistorico = () => {
    verificarNovaPagina(30);
    
    // Cabeçalho da tabela
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(128, 128, 128);
    doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
    
    const colunas = ['Ordem', 'Entrada', 'Saída', 'Dias Serv.', 'Dias Última', 'Status'];
    const colWidths = [30, 25, 25, 25, 25, 50];
    let xPos = 17;
    
    colunas.forEach((col, i) => {
      doc.text(col, xPos, yPosition + 7);
      xPos += colWidths[i];
    });
    yPosition += 10;
    
    // Dados
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    historico.forEach((item, index) => {
      verificarNovaPagina(20);
      
      // Alternar cor de fundo
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, yPosition, pageWidth - 30, 8);
      
      xPos = 17;
      const dataEntrada = format(parseISO(item.data_entrada), "dd/MM/yy", { locale: ptBR });
      const dataSaida = item.data_finalizacao 
        ? format(parseISO(item.data_finalizacao), "dd/MM/yy", { locale: ptBR })
        : "-";
      const diasServico = item.dias_no_servico !== null ? `${item.dias_no_servico}` : "-";
      const diasUltima = item.dias_desde_ultima !== null ? `${item.dias_desde_ultima}` : "-";
      const statusMap: Record<string, string> = {
        recebido: "Recebido",
        em_andamento: "Em Andamento",
        aguardando_orcamento: "Aguard. Orçamento",
        aguardando_aprovacao: "Aguard. Aprovação",
        aprovada: "Aprovada",
        em_producao: "Em Produção",
        finalizada: "Finalizada",
        reprovada: "Reprovada",
      };
      const status = statusMap[item.status] || item.status;
      
      const dados = [item.numero_ordem, dataEntrada, dataSaida, diasServico, diasUltima, status];
      
      dados.forEach((dado, i) => {
        doc.text(dado.substring(0, 12), xPos, yPosition + 5.5);
        xPos += colWidths[i];
      });
      
      yPosition += 8;
    });
    
    yPosition += 10;
  };
  
  criarTabelaHistorico();
  
  // Detalhes de cada manutenção (motivos de falha)
  const manutençõesComMotivo = historico.filter(h => h.motivo_falha);
  
  if (manutençõesComMotivo.length > 0) {
    verificarNovaPagina(30);
    
    // Título da seção
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(220, 38, 38);
    doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
    doc.text('DIAGNÓSTICOS / MOTIVOS DE FALHA', pageWidth / 2, yPosition + 7, { align: 'center' });
    yPosition += 15;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    manutençõesComMotivo.forEach((item) => {
      verificarNovaPagina(25);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.numero_ordem}:`, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      
      // Quebrar texto longo
      const textoQuebrado = doc.splitTextToSize(item.motivo_falha || '', pageWidth - 60);
      doc.text(textoQuebrado, 50, yPosition);
      
      yPosition += Math.max(7, textoQuebrado.length * 5) + 5;
    });
  }
  
  // Análise de tendência
  if (historico.length >= 2) {
    verificarNovaPagina(40);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(128, 128, 128);
    doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
    doc.text('ANÁLISE DE TENDÊNCIA', pageWidth / 2, yPosition + 7, { align: 'center' });
    yPosition += 15;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const temposEntreManutenções = historico
      .filter(h => h.dias_desde_ultima !== null)
      .map(h => h.dias_desde_ultima as number);
    
    if (temposEntreManutenções.length >= 2) {
      const ultimo = temposEntreManutenções[temposEntreManutenções.length - 1];
      const penultimo = temposEntreManutenções[temposEntreManutenções.length - 2];
      const mediaGeral = temposEntreManutenções.reduce((a, b) => a + b, 0) / temposEntreManutenções.length;
      
      let tendencia = "";
      if (ultimo > penultimo) {
        tendencia = "AUMENTANDO - O tempo entre as manutenções está aumentando, indicando melhora na durabilidade.";
      } else if (ultimo < penultimo) {
        tendencia = "DIMINUINDO - O tempo entre as manutenções está diminuindo, indicando possível degradação.";
      } else {
        tendencia = "ESTÁVEL - O tempo entre as manutenções permanece estável.";
      }
      
      doc.text(`Média de dias entre manutenções: ${Math.round(mediaGeral)} dias`, 20, yPosition);
      yPosition += 7;
      doc.text(`Último intervalo: ${ultimo} dias`, 20, yPosition);
      yPosition += 7;
      doc.text(`Penúltimo intervalo: ${penultimo} dias`, 20, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'bold');
      const textoTendencia = doc.splitTextToSize(`Tendência: ${tendencia}`, pageWidth - 40);
      doc.text(textoTendencia, 20, yPosition);
    }
  }
  
  // Adicionar rodapés
  adicionarRodape();
  
  // Salvar PDF
  const nomeArquivo = `historico-manutencao-${historico[0]?.numero_ordem || 'equipamento'}.pdf`;
  doc.save(nomeArquivo);
}
