import jsPDF from "jspdf";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { translateTerm } from "@/i18n/dynamicTerms";

export interface AnaliseTecnicaEmpresa {
  nome?: string | null;
  razao_social?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  tipo_identificacao?: string | null;
}

export interface GerarAnaliseTecnicaParams {
  ordem: any;
  recebimento?: any | null;
  fotos?: string[];
  empresa?: AnaliseTecnicaEmpresa | null;
  language: string;
}

const DICT: Record<string, any> = {
  "pt-BR": {
    titulo: "ORDEM DE SERVIÇO", tel: "Tel", email: "Email",
    infoBasicas: "Informações Básicas", cliente: "Cliente", doc: "CNPJ/CPF",
    equipamento: "Equipamento", dataEntrada: "Data de Entrada", tecnico: "Técnico",
    prioridade: "Prioridade", peritagem: "Peritagem", camisa: "Ø Camisa",
    haste: "Ø Haste x Comprimento", curso: "Curso", conexaoA: "Conexão A",
    conexaoB: "Conexão B", pressao: "Pressão de Trabalho",
    problemas: "Problemas Identificados", descricao: "Descrição",
    servicos: "Serviços Realizados", usinagem: "Usinagem", pecas: "Peças Utilizadas",
    qtd: "Qtd.", fotos: "Fotos da Análise", continuacao: "(continuação)",
    pagina: "Página", de: "de", geradoEm: "Gerado em",
  },
  en: {
    titulo: "SERVICE ORDER", tel: "Phone", email: "Email",
    infoBasicas: "Basic Information", cliente: "Client", doc: "Tax ID",
    equipamento: "Equipment", dataEntrada: "Entry Date", tecnico: "Technician",
    prioridade: "Priority", peritagem: "Inspection", camisa: "Ø Barrel",
    haste: "Ø Rod x Length", curso: "Stroke", conexaoA: "Connection A",
    conexaoB: "Connection B", pressao: "Working Pressure",
    problemas: "Identified Issues", descricao: "Description",
    servicos: "Services Performed", usinagem: "Machining", pecas: "Parts Used",
    qtd: "Qty.", fotos: "Analysis Photos", continuacao: "(continued)",
    pagina: "Page", de: "of", geradoEm: "Generated on",
  },
  es: {
    titulo: "ORDEN DE SERVICIO", tel: "Tel", email: "Email",
    infoBasicas: "Información Básica", cliente: "Cliente", doc: "ID Fiscal",
    equipamento: "Equipo", dataEntrada: "Fecha de Entrada", tecnico: "Técnico",
    prioridade: "Prioridad", peritagem: "Peritaje", camisa: "Ø Camisa",
    haste: "Ø Vástago x Longitud", curso: "Carrera", conexaoA: "Conexión A",
    conexaoB: "Conexión B", pressao: "Presión de Trabajo",
    problemas: "Problemas Identificados", descricao: "Descripción",
    servicos: "Servicios Realizados", usinagem: "Mecanizado", pecas: "Piezas Utilizadas",
    qtd: "Cant.", fotos: "Fotos del Análisis", continuacao: "(continuación)",
    pagina: "Página", de: "de", geradoEm: "Generado el",
  },
};

/**
 * Gera e baixa o PDF de Análise Técnica da ordem de serviço.
 * Layout idêntico ao download de PDF da tela de Análise.
 */
export async function gerarAnaliseTecnicaPDF({
  ordem,
  recebimento,
  fotos = [],
  empresa,
  language,
}: GerarAnaliseTecnicaParams) {
  const tr = (v: any) => translateTerm(v == null ? "" : String(v), language as any);
  const L = DICT[language] || DICT["pt-BR"];
  const locale = language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";

  const tipoIdentificacao = empresa?.tipo_identificacao || "cnpj";
  const labelIdentificacao =
    tipoIdentificacao === "ein" ? "EIN" : tipoIdentificacao === "ssn" ? "SSN" : "CNPJ";

  const EMPRESA_INFO = {
    nome: empresa?.razao_social || empresa?.nome || "N/A",
    cnpj: empresa?.cnpj || "",
    telefone: empresa?.telefone || "",
    email: empresa?.email || "",
    labelIdentificacao,
  };

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 10;

  await addLogoToPDF(doc, empresa?.logo_url, pageWidth - 50, 8, 35, 20);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${EMPRESA_INFO.labelIdentificacao}: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
  doc.text(`${L.tel}: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
  doc.text(`${L.email}: ${EMPRESA_INFO.email}`, 20, yPosition + 22);

  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);

  yPosition = 48;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text(L.titulo, pageWidth / 2, yPosition, { align: "center" });
  doc.setTextColor(0, 0, 0);

  yPosition = 65;

  const criarTabela = (titulo: string, dados: Array<{ label: string; value: string }>) => {
    if (dados.length === 0) return;
    if (yPosition > 210) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(128, 128, 128);
    doc.rect(20, yPosition, pageWidth - 40, 10, "F");
    doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, { align: "center" });
    yPosition += 10;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    dados.forEach((item, index) => {
      doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
      doc.rect(20, yPosition, pageWidth - 40, 10, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 10);

      doc.setFont("helvetica", "bold");
      doc.text(item.label, 25, yPosition + 7);
      doc.setFont("helvetica", "normal");
      const valorLines = doc.splitTextToSize(item.value, pageWidth - 110);
      doc.text(valorLines, 95, yPosition + 7);
      yPosition += 10;
    });

    yPosition += 10;
  };

  const criarTabelaColunas = (titulo: string, colunas: string[], dados: string[][]) => {
    if (dados.length === 0) return;
    if (yPosition > 210) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(128, 128, 128);
    doc.rect(20, yPosition, pageWidth - 40, 10, "F");
    doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, { align: "center" });
    yPosition += 10;

    const colWidths = colunas.length === 2 ? [20, pageWidth - 80] : [20, 60, 40, 45];

    doc.setFillColor(200, 200, 200);
    doc.rect(20, yPosition, pageWidth - 40, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    let xPos = 25;
    colunas.forEach((col, i) => {
      doc.text(col, xPos, yPosition + 5);
      xPos += colWidths[i];
    });
    yPosition += 8;

    doc.setFont("helvetica", "normal");
    dados.forEach((linha, index) => {
      doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
      doc.rect(20, yPosition, pageWidth - 40, 7, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 7);

      xPos = 25;
      linha.forEach((valor, i) => {
        const textoQuebrado = doc.splitTextToSize(valor, colWidths[i] - 5);
        doc.text(textoQuebrado[0], xPos, yPosition + 5);
        xPos += colWidths[i];
      });
      yPosition += 7;
    });

    yPosition += 10;
  };

  const adicionarFotosGrade = async (lista: string[], titulo: string) => {
    if (lista.length === 0) return;
    if (yPosition > 210) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(titulo, 20, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    const fotosPorPagina = 4;
    const maxFotoWidth = 80;
    const maxFotoHeight = 55;
    const espacoHorizontal = 12;
    const espacoVertical = 12;

    for (let i = 0; i < lista.length; i += fotosPorPagina) {
      if (i > 0) {
        doc.addPage();
        yPosition = 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text(titulo + " " + L.continuacao, 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 10;
      }

      const fotosPagina = lista.slice(i, i + fotosPorPagina);

      for (let j = 0; j < fotosPagina.length; j++) {
        const col = j % 2;
        const row = Math.floor(j / 2);
        const xPos = 20 + col * (maxFotoWidth + espacoHorizontal);
        const yPos = yPosition + row * (maxFotoHeight + espacoVertical);

        try {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const imgAspectRatio = img.width / img.height;
              const maxAspectRatio = maxFotoWidth / maxFotoHeight;

              let finalWidth = maxFotoWidth;
              let finalHeight = maxFotoHeight;

              if (imgAspectRatio > maxAspectRatio) {
                finalHeight = maxFotoWidth / imgAspectRatio;
              } else {
                finalWidth = maxFotoHeight * imgAspectRatio;
              }

              const xOffset = (maxFotoWidth - finalWidth) / 2;
              const yOffset = (maxFotoHeight - finalHeight) / 2;

              doc.addImage(img, "JPEG", xPos + xOffset, yPos + yOffset, finalWidth, finalHeight);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = fotosPagina[j];
          });
        } catch (error) {
          console.error("Erro ao adicionar foto:", error);
        }
      }

      if (i + fotosPorPagina < lista.length) {
        yPosition = 280;
      } else {
        yPosition += Math.ceil(fotosPagina.length / 2) * (maxFotoHeight + espacoVertical) + 10;
      }
    }
  };

  const clienteNome = ordem.recebimentos?.cliente_nome || ordem.cliente_nome || recebimento?.cliente_nome || "";

  const dadosBasicos = [
    { label: `${L.cliente}:`, value: clienteNome },
    { label: `${L.doc}:`, value: ordem.recebimentos?.cliente_cnpj || recebimento?.cliente_cnpj || "-" },
    {
      label: `${L.equipamento}:`,
      value: tr(ordem.recebimentos?.tipo_equipamento || ordem.equipamento || recebimento?.tipo_equipamento || ""),
    },
    {
      label: `${L.dataEntrada}:`,
      value: ordem.data_entrada ? new Date(ordem.data_entrada).toLocaleDateString(locale) : "-",
    },
    { label: `${L.tecnico}:`, value: tr(ordem.tecnico || "") },
    { label: `${L.prioridade}:`, value: tr(ordem.prioridade || "") },
  ];
  criarTabela(L.infoBasicas, dadosBasicos);

  if (recebimento) {
    const dadosPeritagem: Array<{ label: string; value: string }> = [];
    if (recebimento.camisa) dadosPeritagem.push({ label: `${L.camisa}:`, value: tr(recebimento.camisa) });
    if (recebimento.haste_comprimento) dadosPeritagem.push({ label: `${L.haste}:`, value: tr(recebimento.haste_comprimento) });
    if (recebimento.curso) dadosPeritagem.push({ label: `${L.curso}:`, value: tr(recebimento.curso) });
    if (recebimento.conexao_a) dadosPeritagem.push({ label: `${L.conexaoA}:`, value: tr(recebimento.conexao_a) });
    if (recebimento.conexao_b) dadosPeritagem.push({ label: `${L.conexaoB}:`, value: tr(recebimento.conexao_b) });
    if (recebimento.pressao_trabalho) dadosPeritagem.push({ label: `${L.pressao}:`, value: tr(recebimento.pressao_trabalho) });

    if (dadosPeritagem.length > 0) criarTabela(L.peritagem, dadosPeritagem);
  }

  if (ordem.descricao_problema) {
    criarTabela(L.problemas, [{ label: `${L.descricao}:`, value: tr(ordem.descricao_problema) }]);
  }

  if (Array.isArray(ordem.servicos_necessarios) && ordem.servicos_necessarios.length > 0) {
    criarTabelaColunas(
      L.servicos,
      [L.qtd, L.descricao],
      ordem.servicos_necessarios.map((s: any) => [s.quantidade?.toString() || "1", tr(s.nome || s.servico || "")])
    );
  }

  if (Array.isArray(ordem.usinagem_necessaria) && ordem.usinagem_necessaria.length > 0) {
    criarTabelaColunas(
      L.usinagem,
      [L.qtd, L.descricao],
      ordem.usinagem_necessaria.map((u: any) => [u.quantidade?.toString() || "1", tr(u.nome || u.descricao || "")])
    );
  }

  if (Array.isArray(ordem.pecas_necessarias) && ordem.pecas_necessarias.length > 0) {
    criarTabelaColunas(
      L.pecas,
      [L.qtd, L.descricao],
      ordem.pecas_necessarias.map((p: any) => [p.quantidade?.toString() || "1", tr(p.peca || p.nome || "")])
    );
  }

  if (fotos.length > 0) {
    await adicionarFotosGrade(fotos, L.fotos);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`${L.pagina} ${i} ${L.de} ${totalPages}`, 20, 287);
    doc.text(`${L.geradoEm}: ${new Date().toLocaleString(locale)}`, pageWidth - 20, 287, { align: "right" });
  }

  doc.save(`${ordem.numero_ordem || "ordem"}.pdf`);
}
