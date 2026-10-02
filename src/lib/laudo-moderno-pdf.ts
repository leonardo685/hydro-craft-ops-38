import jsPDF from "jspdf";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";

type Translate = (key: string) => string;
type DynamicTranslate = (value: string | null | undefined) => string;

interface LaudoModernoParams {
  ordem: any;
  teste: any | null;
  fotos: Array<{ arquivo_url: string; nome_arquivo?: string }>;
  dadosDimensionais: any | null;
  empresa: any | null;
  language: string;
  t: Translate;
  tr: DynamicTranslate;
}

const RED: [number, number, number] = [191, 38, 38];
const DARK: [number, number, number] = [35, 35, 35];
const MUTED: [number, number, number] = [105, 110, 115];
const LINE: [number, number, number] = [222, 224, 226];
const SOFT: [number, number, number] = [246, 247, 247];

export async function gerarLaudoPublicoModerno({
  ordem,
  teste,
  fotos,
  dadosDimensionais,
  empresa,
  language,
  t,
  tr,
}: LaudoModernoParams) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const left = 15;
  const right = width - 15;
  const contentWidth = right - left;
  const numeroOrdem = ordem.recebimentos?.numero_ordem || ordem.numero_ordem;
  const locale = language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";
  const labels = language === "en"
    ? { scope: "Technical scope", findings: "Inspection findings", equipmentData: "Equipment data", photoSubtitle: "Photographic record supplied with the technical report", continued: "Photographic record / continued", source: "Values are reproduced as supplied; confirm units and decimal formatting.", testResults: "Test results", photoRecord: "Photo record" }
    : language === "es"
      ? { scope: "Alcance técnico", findings: "Hallazgos de inspección", equipmentData: "Datos del equipo", photoSubtitle: "Registro fotográfico suministrado con el informe técnico", continued: "Registro fotográfico / continuación", source: "Los valores se reproducen según fueron informados; confirme unidades y formato decimal.", testResults: "Resultados de prueba", photoRecord: "Registro fotográfico" }
      : { scope: "Escopo técnico", findings: "Constatações da inspeção", equipmentData: "Dados do equipamento", photoSubtitle: "Registro fotográfico fornecido com o laudo técnico", continued: "Registro fotográfico / continuação", source: "Os valores são reproduzidos conforme informados; confirme unidades e formatação decimal.", testResults: "Resultados do teste", photoRecord: "Registro fotográfico" };

  const empresaNome = empresa?.razao_social || empresa?.nome || "MEC HYDRO LLC";
  const idLabel = empresa?.tipo_identificacao === "ein" ? "EIN" : empresa?.tipo_identificacao === "ssn" ? "SSN" : "CNPJ";
  const clean = (value: unknown, fallback = "-") => value == null || String(value).trim() === "" ? fallback : String(value).trim();
  const date = (value: string | null | undefined, withTime = false) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return clean(value);
    return parsed.toLocaleString(locale, withTime
      ? { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
      : { year: "numeric", month: "long", day: "numeric" });
  };

  const addHeader = async () => {
    await addLogoToPDF(doc, empresa?.logo_url, left, 8, 34, 22);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(empresaNome, 126, 16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.setFontSize(7.5);
    if (empresa?.email) doc.text(clean(empresa.email), 126, 22);
    if (empresa?.cnpj) doc.text(`${idLabel} ${clean(empresa.cnpj)}`, 126, 27);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(left, 36, right, 36);
  };

  const addFooter = (section: string, pageNumber: number) => {
    doc.setDrawColor(...LINE);
    doc.line(left, height - 17, right, height - 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`MEC-HYDRO  /  ${t("laudoPublico.serviceOrder").toUpperCase()} ${numeroOrdem}`, left, height - 10);
    doc.text(section.toUpperCase(), width / 2, height - 10, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...RED);
    doc.text(String(pageNumber).padStart(2, "0"), right, height - 10, { align: "right" });
  };

  const sectionLabel = (label: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...RED);
    doc.text(label.toUpperCase(), left, y);
  };

  const metric = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(clean(value), x, y + 8);
  };

  await addHeader();
  doc.setTextColor(...RED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(t("laudoPublico.technicalReport").toUpperCase(), left, 47);
  doc.setTextColor(...DARK);
  doc.setFontSize(21);
  doc.text(clean(ordem.equipamento), left, 59);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${t("laudoPublico.serviceOrder")}  ${numeroOrdem}`, left, 68);
  doc.line(left, 76, right, 76);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(t("laudoPublico.client").toUpperCase(), left, 86);
  doc.setTextColor(...DARK);
  doc.setFontSize(14);
  doc.text(clean(ordem.cliente_nome), left, 96);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`${t("laudoPublico.entryDate")}  ${date(ordem.data_entrada)}`, left, 106);
  doc.text(`${t("laudoPublico.status")}  ${t("laudoPublico.finished")}`, 126, 106);
  doc.setDrawColor(...LINE);
  doc.line(left, 114, right, 114);

  if (teste) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(t("laudoPublico.testResult").toUpperCase(), left, 124);
    const approved = teste.resultado_teste === "aprovado";
    doc.setTextColor(...(approved ? [38, 145, 81] as [number, number, number] : RED));
    doc.setFontSize(21);
    doc.text((approved ? t("laudoPublico.approved") : t("laudoPublico.rejected")).toUpperCase(), left, 137);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${clean(teste.tipo_teste)}  /  ${date(teste.data_hora_teste, true)}`, left, 146);
    doc.line(left, 154, right, 154);

    sectionLabel(t("laudoPublico.testParametersISO"), 164);
    const params = [
      [t("laudoPublico.testTime"), teste.tempo_minutos ? `${teste.tempo_minutos} ${t("laudoPublico.minutes")}` : "-"],
      [t("laudoPublico.cycleQty"), clean(teste.qtd_ciclos)],
      [t("laudoPublico.stroke"), clean(teste.curso)],
      [t("laudoPublico.maxWorkPressure"), clean(teste.pressao_maxima_trabalho || teste.pressao_teste)],
      [t("laudoPublico.advancePressure"), clean(teste.pressao_avanco)],
      [t("laudoPublico.returnPressure"), clean(teste.pressao_retorno)],
    ];
    params.forEach(([label, value], index) => metric(label, value, left + (index % 3) * 58.5, 174 + Math.floor(index / 3) * 20));
    doc.line(left, 210, right, 210);
    sectionLabel(t("laudoPublico.leakChecks"), 220);
    const checks = [
      [t("laudoPublico.pistonLeak"), teste.check_vazamento_pistao],
      [t("laudoPublico.staticSealsLeak"), teste.check_vazamento_vedacoes_estaticas],
      [t("laudoPublico.stemLeak"), teste.check_vazamento_haste],
    ];
    const allOk = checks.every(([, value]) => value !== false);
    [...checks, [t("laudoPublico.generalCheck"), allOk]].forEach(([label, value], index) => {
      const y = 229 + index * 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(String(label), left, y);
      doc.setFont("helvetica", "bold");
      doc.text(value === false ? t("laudoPublico.pdfNok") : t("laudoPublico.pdfOk"), right, y, { align: "right" });
      doc.setDrawColor(...LINE);
      doc.line(left, y + 3.5, right, y + 3.5);
    });
  }
  addFooter(labels.testResults, 1);

  doc.addPage();
  await addHeader();
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(labels.scope, left, 51);
  let y = 65;
  const laudo = language === "pt-BR" ? ordem.laudo_tecnico || ordem.laudo_tecnico_en : ordem.laudo_tecnico_en || ordem.laudo_tecnico;
  const findings = clean(laudo || ordem.motivo_falha, "");
  if (findings) {
    sectionLabel(labels.findings, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.3);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(findings, contentWidth);
    doc.text(lines, left, y);
    y += lines.length * 4.4 + 5;
    doc.setDrawColor(...LINE);
    doc.line(left, y, right, y);
    y += 9;
  }

  sectionLabel(labels.equipmentData, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(clean(ordem.equipamento).toUpperCase(), right, y, { align: "right" });
  y += 9;
  const dims = [
    [t("laudoPublico.workPressure"), dadosDimensionais?.pressao_trabalho],
    [t("laudoPublico.shirtDiameter"), dadosDimensionais?.camisa],
    [t("laudoPublico.stroke"), dadosDimensionais?.curso],
    [t("laudoPublico.rodLength"), dadosDimensionais?.haste_comprimento],
    [t("laudoPublico.connectionA"), dadosDimensionais?.conexao_a],
    [t("laudoPublico.connectionB"), dadosDimensionais?.conexao_b],
  ];
  dims.forEach(([label, value], index) => metric(label, clean(value), left + (index % 3) * 58.5, y + Math.floor(index / 3) * 20));
  y += 44;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(labels.source, left, y);
  y += 9;

  const renderList = (title: string, items: any[], kind: "parts" | "service") => {
    if (!items.length) return;
    sectionLabel(title, y);
    if (kind === "parts") {
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(t("laudoPublico.qty").toUpperCase(), right, y, { align: "right" });
    }
    y += 7;
    items.forEach((item) => {
      const name = tr(item.peca || item.descricao || item.nome || item.servico) || "-";
      const lines = doc.splitTextToSize(name, kind === "parts" ? contentWidth - 18 : contentWidth);
      const rowHeight = Math.max(7, lines.length * 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(...DARK);
      doc.text(lines, left, y);
      if (kind === "parts") doc.text(String(item.quantidade || 1), right, y, { align: "right" });
      doc.setDrawColor(...LINE);
      doc.line(left, y + rowHeight - 2, right, y + rowHeight - 2);
      y += rowHeight;
    });
    y += 6;
  };
  renderList(t("laudoPublico.partsUsed"), Array.isArray(ordem.pecas_necessarias) ? ordem.pecas_necessarias : [], "parts");
  renderList(t("laudoPublico.servicesPerformed"), Array.isArray(ordem.servicos_necessarios) ? ordem.servicos_necessarios : [], "service");
  renderList(t("laudoPublico.machining"), Array.isArray(ordem.usinagem_necessaria) ? ordem.usinagem_necessaria : [], "service");
  addFooter(labels.scope, 2);

  const loadPhoto = (url: string, x: number, yPos: number, boxWidth: number, boxHeight: number) => new Promise<void>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const ratio = Math.min(boxWidth / image.width, boxHeight / image.height);
        const imageWidth = image.width * ratio;
        const imageHeight = image.height * ratio;
        doc.addImage(image, "JPEG", x + (boxWidth - imageWidth) / 2, yPos + (boxHeight - imageHeight) / 2, imageWidth, imageHeight);
      } catch (error) {
        console.error("Erro ao adicionar foto ao laudo:", error);
      }
      resolve();
    };
    image.onerror = () => resolve();
    image.src = url;
  });

  let pageNumber = 3;
  let photoIndex = 0;
  while (photoIndex < fotos.length) {
    doc.addPage();
    await addHeader();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...DARK);
    doc.text(t("laudoPublico.equipmentPhotos"), left, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(photoIndex === 0 ? labels.photoSubtitle : labels.continued, left, 60);
    const capacity = photoIndex === 0 ? 4 : 6;
    const batch = fotos.slice(photoIndex, photoIndex + capacity);
    const cardWidth = 85;
    const cardHeight = capacity === 4 ? 90 : 63;
    const startY = 70;
    for (let index = 0; index < batch.length; index += 1) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = left + col * 92;
      const cardY = startY + row * (cardHeight + 8);
      doc.setFillColor(...SOFT);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, "F");
      await loadPhoto(batch[index].arquivo_url, x + 2, cardY + 2, cardWidth - 4, cardHeight - 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(`PHOTO ${String(photoIndex + index + 1).padStart(2, "0")}`, x + 4, cardY + cardHeight - 4);
    }
    addFooter(`${labels.photoRecord} / ${pageNumber - 2}`, pageNumber);
    photoIndex += batch.length;
    pageNumber += 1;
  }

  doc.save(`Laudo_${numeroOrdem}.pdf`);
}