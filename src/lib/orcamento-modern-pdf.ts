import { STATUS_APROVADO_INVOICE, nomeArquivoOrcamentoPDF, numeroOrcamentoParaArquivo } from "@/lib/quote-filename";
import { normalizarNumeroPedido } from "@/lib/pedido-utils";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { translateTerm } from "@/i18n/dynamicTerms";
import { invoiceDeliveryPhotos, type DeliveryOrder } from "@/lib/invoice-delivery-photos";
import { showsOrderReference } from "@/lib/company-features";

type Lang = "pt-BR" | "en" | "es";

const TXT: Record<Lang, Record<string, string>> = {
  "pt-BR": {
    proposal: "PROPOSTA COMERCIAL", invoice: "FATURA", quote: "Orçamento", quoteUp: "ORÇAMENTO",
    preparedFor: "CLIENTE", refOrder: "Ordem de referência", taxId: "ID fiscal do cliente",
    entryInvoice: "Nota de entrada", totalTax: "VALOR TOTAL COM IMPOSTO", total: "VALOR TOTAL",
    subtotal: "Subtotal da reforma", salesTax: "Imposto sobre vendas", validity: "VALIDADE",
    warranty: "GARANTIA", freight: "FRETE", payment: "Pagamento", delivery: "Prazo de entrega",
    days: "dias", months: "meses", noWarranty: "Sem garantia", toArrange: "A combinar",
    scope: "Escopo técnico", findings: "RELATÓRIO DE INSPEÇÃO", identifiedProblems: "CONSTATAÇÕES", technicalReport: "LAUDO TÉCNICO", equipData: "DADOS DO EQUIPAMENTO",
    pressure: "PRESSÃO DE TRABALHO", bore: "DIÂMETRO INTERNO", stroke: "CURSO",
    rod: "HASTE: DIÂM. x COMPR.", connA: "CONEXÃO A", connB: "CONEXÃO B",
    temperature: "TEMPERATURA", fluid: "FLUIDO", power: "POTÊNCIA",
    parts: "PEÇAS NECESSÁRIAS", services: "SERVIÇOS", machining: "USINAGEM", qty: "QTD",
    unitValue: "VALOR UNIT.", lineTotal: "TOTAL", partsTotal: "TOTAL DE PEÇAS",
    photos: "Condição do equipamento", photosSub: "Registro fotográfico do equipamento",
    photoRecord: "REGISTRO FOTOGRÁFICO", defaultTitle: "Reforma / Manutenção",
    deliveredPhotos: "Equipamento entregue", deliveredPhotosSub: "Registro fotográfico da entrega",
  },
  en: {
    proposal: "COMMERCIAL PROPOSAL", invoice: "INVOICE", quote: "Quote", quoteUp: "QUOTE",
    preparedFor: "PREPARED FOR", refOrder: "Reference order", taxId: "Client tax ID",
    entryInvoice: "Entry invoice", totalTax: "TOTAL INCLUDING SALES TAX", total: "TOTAL",
    subtotal: "Repair subtotal", salesTax: "Sales tax", validity: "VALIDITY",
    warranty: "WARRANTY", freight: "FREIGHT", payment: "Payment terms", delivery: "Delivery time",
    days: "days", months: "months", noWarranty: "No warranty", toArrange: "To be arranged",
    scope: "Technical scope", findings: "INSPECTION FINDINGS", identifiedProblems: "FINDINGS", technicalReport: "TECHNICAL REPORT", equipData: "EQUIPMENT DATA",
    pressure: "WORKING PRESSURE", bore: "BORE", stroke: "STROKE",
    rod: "ROD DIA. x LENGTH", connA: "CONNECTION A", connB: "CONNECTION B",
    temperature: "TEMPERATURE", fluid: "FLUID", power: "POWER",
    parts: "REQUIRED PARTS", services: "SERVICES", machining: "MACHINING", qty: "QTY",
    unitValue: "UNIT VALUE", lineTotal: "TOTAL", partsTotal: "PARTS TOTAL",
    photos: "Equipment condition", photosSub: "Photographic record of the equipment",
    photoRecord: "PHOTO RECORD", defaultTitle: "Repair / Maintenance",
    deliveredPhotos: "Delivered equipment", deliveredPhotosSub: "Delivery photo record",
  },
  es: {
    proposal: "PROPUESTA COMERCIAL", invoice: "FACTURA", quote: "Cotización", quoteUp: "COTIZACIÓN",
    preparedFor: "CLIENTE", refOrder: "Orden de referencia", taxId: "ID fiscal del cliente",
    entryInvoice: "Nota de entrada", totalTax: "TOTAL CON IMPUESTO", total: "TOTAL",
    subtotal: "Subtotal de la reparación", salesTax: "Impuesto sobre ventas", validity: "VALIDEZ",
    warranty: "GARANTÍA", freight: "FLETE", payment: "Pago", delivery: "Plazo de entrega",
    days: "días", months: "meses", noWarranty: "Sin garantía", toArrange: "A convenir",
    scope: "Alcance técnico", findings: "INFORME DE INSPECCIÓN", identifiedProblems: "HALLAZGOS", technicalReport: "INFORME TÉCNICO", equipData: "DATOS DEL EQUIPO",
    pressure: "PRESIÓN DE TRABAJO", bore: "DIÁMETRO INTERNO", stroke: "CARRERA",
    rod: "VÁSTAGO: DIÁM. x LONG.", connA: "CONEXIÓN A", connB: "CONEXIÓN B",
    temperature: "TEMPERATURA", fluid: "FLUIDO", power: "POTENCIA",
    parts: "PIEZAS NECESARIAS", services: "SERVICIOS", machining: "MECANIZADO", qty: "CANT.",
    unitValue: "VALOR UNIT.", lineTotal: "TOTAL", partsTotal: "TOTAL DE PIEZAS",
    photos: "Condición del equipo", photosSub: "Registro fotográfico del equipo",
    photoRecord: "REGISTRO FOTOGRÁFICO", defaultTitle: "Reparación / Mantenimiento",
    deliveredPhotos: "Equipo entregado", deliveredPhotosSub: "Registro fotográfico de la entrega",
  },
};

export interface ModernOrcamentoParams {
  orcamento: any;
  itens: any[];
  fotos: { arquivo_url: string; legenda?: string | null }[];
  dadosTecnicos: any | null;
  laudo: string;
  findings?: string;
  clienteDoc: string;
  empresa: any;
  language: string;
  /** Uso interno: retorna só os bytes do invoice (sem P.O., sem download). */
  somenteBytes?: boolean;
  /** Em vez de baixar, entrega o arquivo final (ex.: para envio por e-mail). */
  capturar?: (bytes: ArrayBuffer, nome: string) => void;
}

const RED: [number, number, number] = [200, 30, 30];
const DARK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];
const LINE: [number, number, number] = [225, 225, 225];

const loadImage = (url: string) =>
  new Promise<{ data: string; w: number; h: number } | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const max = 1000;
      let w = img.naturalWidth, h = img.naturalHeight;
      const r = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * r); h = Math.round(h * r);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ data: c.toDataURL("image/jpeg", 0.7), w, h });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

/** Only an unambiguous, existing reference in the current company gets a QR. */
async function referenceOrderQR(orcamento: any, empresa: any) {
  const reference = String(orcamento.ordem_referencia || "").trim();
  const match = reference.match(/^MH-(\d+)-(\d{2})$/i);
  if (!match || !empresa?.id) return null;
  const sequence = Number(match[1]);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) return null;
  const number = `MH-${String(sequence).padStart(3, "0")}-${match[2]}`;
  const variants = [...new Set([reference, number, `MH-${sequence}-${match[2]}`])];
  const { supabase } = await import("@/integrations/supabase/client");
  const budgetId = orcamento.orcamento_id || orcamento.id;
  if (budgetId) {
    const linked = await supabase.from("ordens_servico")
      .select("id")
      .eq("empresa_id", empresa.id)
      .eq("orcamento_id", budgetId)
      .limit(2);
    if (linked.error || (linked.data?.length || 0) > 1) return null;
  }
  const { data, error } = await supabase.from("ordens_servico")
    .select("id, numero_ordem")
    .eq("empresa_id", empresa.id)
    .in("numero_ordem", variants)
    .limit(2);
  if (error || data?.length !== 1) return null;
  const url = new URL(`/ordem/${encodeURIComponent(data[0].numero_ordem)}`, window.location.origin);
  url.searchParams.set("e", empresa.id);
  url.searchParams.set("ordemId", data[0].id);
  const image = await QRCode.toDataURL(url.toString(), {
    width: 600, margin: 4, errorCorrectionLevel: "M",
  });
  return { image, number };
}

/** Peças mostram valores e a somatória (PARTS TOTAL) quando o toggle está ligado
 *  OU quando qualquer peça já tem preço unitário — o valor digitado no formulário
 *  nunca fica de fora do PDF por esquecimento do toggle. */
export function pecasMostramValores(itens: any[], mostrarValoresPecas: unknown): boolean {
  if (Boolean(mostrarValoresPecas)) return true;
  return (itens || []).some((i) => i?.tipo === "peca" && (Number(i.valorUnitario ?? i.valor_unitario ?? 0) || 0) > 0);
}

export async function gerarOrcamentoModernoPDF(p: ModernOrcamentoParams) {
  const mostraValoresPecas = pecasMostramValores(p.itens || [], p.orcamento?.mostrar_valores_pecas);
  const lang: Lang = (["pt-BR", "en", "es"].includes(p.language) ? p.language : "pt-BR") as Lang;
  const T = TXT[lang];
  const tr = (v: any) => translateTerm(v == null ? "" : String(v), lang as any);
  const o = p.orcamento;
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
  const isMec = String(p.empresa?.nome || "").toUpperCase().includes("MEC HYDRO");
  const mostraOrdemRef = showsOrderReference(p.empresa?.nome);
  const currency = isMec || lang === "en" ? "USD" : "BRL";
  const money = (v: number) => v.toLocaleString(locale, { style: "currency", currency });

  const doc = new jsPDF();
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  const M = 18;
  const CW = W - M * 2;

  const numero = o.numero_revisao ? `${o.numero} REV${o.numero_revisao}` : o.numero || "";
  // "none", "n/a" e similares significam sem pedido: não mostram o prefixo P.O.
  const numeroPedido = normalizarNumeroPedido(o.numero_pedido);
  const aprovado = STATUS_APROVADO_INVOICE.includes(String(o.status || "").toLowerCase());
  // Orçamento aprovado vira invoice. O prefixo "P.O:" só aparece com número real de pedido.
  const isInvoice = aprovado;
  const temPedido = !!numeroPedido;
  const docLabel = isInvoice ? T.invoice : T.proposal;
  const footers: string[] = [];

  const header = async () => {
    await addLogoToPDF(doc, p.empresa?.logo_url, M, 8, 32, 18);
    const nome = p.empresa?.razao_social || p.empresa?.nome || "";
    const tipo = p.empresa?.tipo_identificacao || "cnpj";
    const idLabel = tipo === "ein" ? "EIN" : tipo === "ssn" ? "SSN" : "CNPJ";
    const x = W / 2 + 20;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...DARK);
    doc.text(nome, x, 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    let y = 21;
    if (p.empresa?.email) { doc.text(p.empresa.email, x, y); y += 4.5; }
    if (p.empresa?.telefone) { doc.text(p.empresa.telefone, x, y); y += 4.5; }
    if (p.empresa?.cnpj) doc.text(`${idLabel} ${p.empresa.cnpj}`, x, y);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
    doc.line(M, 33, W - M, 33);
  };

  const newPage = async (footerLabel: string, first = false) => {
    if (!first) doc.addPage();
    footers.push(footerLabel);
    await header();
    return 44;
  };

  const rule = (y: number) => { doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); };
  const small = (s: string, x: number, y: number, color = MUTED, bold = true, size = 6.5, right = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color);
    doc.text(s, x, y, right ? { align: "right" } : undefined);
  };

  // ============ PÁGINA 1 ============
  let y = await newPage(docLabel, true);
  const titleTop = y;
  const qr = await referenceOrderQR(o, p.empresa);
  let qrBottom = titleTop;
  if (qr) {
    const size = 21;
    const x = W - M - size;
    doc.addImage(qr.image, "PNG", x, titleTop - 2, size, size);
    if (mostraOrdemRef) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...DARK);
      doc.text(qr.number, x + size / 2, titleTop + size + 3, { align: "center" });
      qrBottom = titleTop + size + 5;
    } else {
      // QR sem o número da ordem impresso por baixo.
      qrBottom = titleTop + size + 1;
    }
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...RED);
  doc.text(docLabel, W / 2, y + 2, { align: "center" });
  y += 9;
  y = Math.max(y, qrBottom) + 4;
  const titulo = tr(o.assunto_proposta || o.equipamento || T.defaultTitle);
  const tituloFormatado = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  const linhaTitulo = temPedido ? `P.O: ${numeroPedido} - ${tituloFormatado}` : tituloFormatado;
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...DARK);
  const tl = doc.splitTextToSize(linhaTitulo, CW * 0.6);
  doc.text(tl, M, y);
  y += tl.length * 9 + 1;

  const data = new Date(o.data_orcamento || o.created_at || Date.now()).toLocaleDateString(locale, {
    day: "numeric", month: "long", year: "numeric",
  });
  if (mostraOrdemRef) {
    small(`${T.quote} ${numero}   /   ${data}`, M, y, MUTED, false, 7.5);
  } else {
    // Na MEC HYDRO: só o número do orçamento, em fonte maior e negrito.
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...DARK);
    const rotulo = `${T.quoteUp} ${numero}`;
    doc.text(rotulo, M, y);
    const larguraRotulo = doc.getTextWidth(rotulo);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(data, M + larguraRotulo + 10, y - 1);
    y += 8;
  }
  y = Math.max(y, qrBottom) + 9; rule(y); y += 9;

  small(T.preparedFor, M, y); y += 7;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...DARK);
  const cl = doc.splitTextToSize(o.cliente_nome || "N/A", CW);
  doc.text(cl, M, y); y += cl.length * 6 + 1;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...DARK);
  if (mostraOrdemRef) {
    doc.text(`${T.refOrder}  ${o.ordem_referencia || "N/A"}`, M, y); y += 6;
  }
  small(`${T.taxId}  ${p.clienteDoc || "N/A"}    |    ${T.entryInvoice}  ${o.numero_nota_entrada || "N/A"}`, M, y, MUTED, false, 7);
  y += 9; rule(y); y += 10;

  const subtotal = Number(o.valor || 0);
  const taxRate = o.tax_exempt ? 0 : 8.5;
  const feePct = isMec && o.urgency_fee_enabled ? Number(o.urgency_fee_percentual) || 0 : 0;
  const fee = subtotal * (feePct / 100);
  const tax = isMec ? (subtotal + fee) * (taxRate / 100) : 0;
  const total = subtotal + fee + tax;
  if (feePct > 0) {
    // Com fee: valor total (com fee, sem tax) em destaque; abaixo fee %, tax e somatória com imposto
    small(T.total, M, y); y += 14;
    doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(...RED);
    doc.text(money(subtotal + fee), M, y);
    small(currency, M + doc.getTextWidth(money(subtotal + fee)) + 12, y - 1, MUTED, false, 7);
    y += 12;
    small(`URGENCY FEE  ${feePct.toLocaleString(locale)}%`, M, y, MUTED, false, 7);
    y += 8;
    if (isMec && taxRate > 0) {
      small(T.totalTax, M, y, MUTED, false, 7);
      small(`${T.salesTax}  ${taxRate.toLocaleString(locale)}%`, W / 2, y, MUTED, false, 7);
      y += 5;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
      doc.text(money(total), M, y); doc.text(money(tax), W / 2, y);
      y += 8;
    }
  } else {
    small(isMec ? T.subtotal : T.total, M, y); y += 14;
    doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(...RED);
    doc.text(money(subtotal), M, y);
    small(currency, M + doc.getTextWidth(money(subtotal)) + 12, y - 1, MUTED, false, 7);
    y += 12;
    if (isMec) {
      small(T.totalTax, M, y, MUTED, false, 7);
      small(`${T.salesTax}  ${taxRate.toLocaleString(locale)}%`, W / 2, y, MUTED, false, 7);
      y += 5;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
      doc.text(money(total), M, y); doc.text(money(tax), W / 2, y);
      y += 8;
    }
  }
  rule(y); y += 10;

  const garantia =
    o.garantia === "sem" ? T.noWarranty : `${["6", "12", "24"].includes(o.garantia) ? o.garantia : "12"} ${T.months}`;
  const cols = [
    [T.validity, `${o.validade_proposta || 30} ${T.days}`],
    [T.warranty, garantia],
    [T.freight, o.frete || "CIF"],
  ];
  cols.forEach(([k, v], i) => {
    const x = M + (CW / 3) * i;
    small(k, x, y);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
    doc.text(String(v), x, y + 7);
  });
  y += 15; rule(y); y += 9;

  const pagamento = o.condicao_pagamento || (o.prazo_pagamento ? `${o.prazo_pagamento} DDL` : T.toArrange);
  const entrega = o.prazo_entrega || "5";
  [[T.payment, pagamento], [T.delivery, entrega]].forEach(([k, v]) => {
    doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "bold"); doc.text(`${k}:`, M, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(tr(v), CW - 30);
    doc.text(lines, M + doc.getTextWidth(`${k}: `) + 1, y);
    y += lines.length * 4 + 1;
  });

  // ============ PÁGINA 2: ESCOPO TÉCNICO ============
  const scopeLabel = T.scope.toUpperCase();
  y = await newPage(scopeLabel);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...DARK);
  doc.text(T.scope, M, y + 4); y += 14;

  const ensure = async (need: number) => {
    if (y + need > H - 22) { y = await newPage(scopeLabel); }
  };
  const section = async (label: string, right?: string) => {
    await ensure(14);
    small(label, M, y, RED, true, 7.5);
    if (right) small(right, W - M, y, MUTED, true, 6.5, true);
    y += 5;
  };

  const laudo = (p.laudo || "").trim();
  const findings = (p.findings || "").trim();
  if (laudo || findings) {
    await section(T.findings);
    y += 2;
    if (findings) {
      if (laudo) {
        small(T.identifiedProblems, M, y, MUTED, true, 6.5);
        y += 4;
      }
      const findingLines = doc.splitTextToSize(tr(findings), CW);
      await ensure(findingLines.length * 4 + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...DARK);
      findingLines.forEach((line: string) => { doc.text(line, M, y); y += 4; });
      y += 2;
    }
    if (laudo && findings) {
      small(T.technicalReport, M, y, MUTED, true, 6.5);
      y += 5;
    }
    const blocos = laudo.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    for (const bloco of blocos) {
      const linhas = bloco.split("\n");
      const m = linhas[0].match(/^\s*\d+[.)-]\s*(.+)$/);
      let nome = "";
      let desc = bloco;
      if (m && linhas.length > 1) { nome = m[1].trim().replace(/[.:]$/, ""); desc = linhas.slice(1).join(" ").trim(); }
      else if (m) { desc = m[1]; }
      doc.setFontSize(7.5);
      const prefix = nome ? `${nome}. ` : "";
      doc.setFont("helvetica", "bold");
      const pw = doc.getTextWidth(prefix);
      doc.setFont("helvetica", "normal");
      const first = doc.splitTextToSize(desc, CW - pw);
      const rest = first.length > 1 ? doc.splitTextToSize(first.slice(1).join(" "), CW) : [];
      await ensure(5 + rest.length * 4);
      doc.setTextColor(...DARK);
      if (prefix) { doc.setFont("helvetica", "bold"); doc.text(prefix, M, y); }
      doc.setFont("helvetica", "normal");
      doc.text(first[0] || "", M + pw, y);
      y += 4;
      rest.forEach((l: string) => { doc.text(l, M, y); y += 4; });
      y += 1.5;
    }
    rule(y); y += 7;
  }

  const d = p.dadosTecnicos;
  if (d) {
    const campos = [
      [T.pressure, d.pressaoTrabalho], [T.bore, d.camisa], [T.stroke, d.curso],
      [T.rod, d.hasteComprimento], [T.connA, d.conexaoA], [T.connB, d.conexaoB],
      [T.temperature, d.temperaturaTrabalho], [T.fluid, d.fluidoTrabalho], [T.power, d.potencia],
    ].filter(([, v]) => v && String(v).trim());
    if (campos.length) {
      await section(T.equipData, d.categoriaEquipamento ? tr(d.categoriaEquipamento).toUpperCase() : undefined);
      y += 4;
      for (let i = 0; i < campos.length; i += 3) {
        await ensure(14);
        campos.slice(i, i + 3).forEach(([k, v], j) => {
          const x = M + (CW / 3) * j;
          small(String(k), x, y, MUTED, true, 6);
          doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...DARK);
          doc.text(doc.splitTextToSize(tr(v), CW / 3 - 4)[0], x, y + 6);
        });
        y += 14;
      }
      y += 1;
    }
  }

  const lista = async (label: string, arr: any[], showValues = false) => {
    if (!arr.length) return;
    await section(label);
    let sectionTotal = 0;
    if (showValues) {
      const xQty = W - M - 64, xUnit = W - M - 32, xTot = W - M;
      small(T.qty, xQty, y - 4, MUTED, true, 6, true);
      small(T.unitValue, xUnit, y - 4, MUTED, true, 6, true);
      small(T.lineTotal, xTot, y - 4, MUTED, true, 6, true);
      for (const it of arr) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        const lines = doc.splitTextToSize(tr(it.descricao || ""), CW - 72);
        await ensure(lines.length * 4 + 5);
        doc.setTextColor(...DARK);
        doc.text(lines, M, y + 1);
        const qty = Number(it.quantidade ?? 1) || 0;
        const unit = Number(it.valorUnitario ?? it.valor_unitario ?? 0) || 0;
        const tot = Number(it.valorTotal ?? it.valor_total ?? 0) || qty * unit;
        doc.text(String(qty), xQty, y + 1, { align: "right" });
        doc.text(money(unit), xUnit, y + 1, { align: "right" });
        doc.text(money(tot), xTot, y + 1, { align: "right" });
        sectionTotal += tot;
        y += lines.length * 4 + 1.5;
        rule(y); y += 3.5;
      }
      await ensure(10);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...DARK);
      doc.text(T.partsTotal, M, y + 1);
      doc.text(money(sectionTotal), xTot, y + 1, { align: "right" });
      y += 4;
      rule(y); y += 4;
    } else {
      small(T.qty, W - M, y - 4, MUTED, true, 6, true);
      for (const it of arr) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        const lines = doc.splitTextToSize(tr(it.descricao || ""), CW - 20);
        await ensure(lines.length * 4 + 4);
        doc.setTextColor(...DARK);
        doc.text(lines, M, y + 1);
        doc.text(String(it.quantidade ?? 1), W - M, y + 1, { align: "right" });
        y += lines.length * 4 + 1.5;
        rule(y); y += 3.5;
      }
    }
    y += 4;
  };
  const itens = p.itens || [];
  await lista(T.parts, itens.filter((i) => i.tipo === "peca"), mostraValoresPecas);
  await lista(T.services, itens.filter((i) => i.tipo === "servico"));
  await lista(T.machining, itens.filter((i) => i.tipo === "usinagem"));

  // ============ FOTOS ============
  const deliveryPhotos = isMec && isInvoice ? await buscarFotosEntrega(o, p.empresa) : [];
  const photoGroups = [
    { photos: p.fotos, title: T.photos, subtitle: T.photosSub },
    { photos: deliveryPhotos, title: T.deliveredPhotos, subtitle: T.deliveredPhotosSub },
  ];
  for (const group of photoGroups) {
    if (!group.photos.length) continue;
    const imgs = await Promise.all(group.photos.map((f) => loadImage(f.arquivo_url)));
    if (group.photos === deliveryPhotos && imgs.some(img => !img)) {
      throw new Error(lang === 'en' ? 'Could not load delivery photo. Please try again.' : lang === 'es' ? 'No se pudo cargar la foto de entrega. Inténtelo de nuevo.' : 'Não foi possível carregar a foto da entrega. Tente novamente.');
    }
    const cardW = (CW - 8) / 2;
    const cardH = 100;
    for (let i = 0; i < group.photos.length; i += 4) {
      const pageN = i / 4 + 1;
      y = await newPage(`${T.photoRecord} / ${pageN}`);
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...DARK);
      doc.text(group.title, M, y + 4);
      small(group.subtitle, M, y + 10, MUTED, false, 7);
      y += 18;
      for (let j = 0; j < 4 && i + j < group.photos.length; j++) {
        const x = M + (j % 2) * (cardW + 8);
        const cy = y + Math.floor(j / 2) * (cardH + 8);
        doc.setFillColor(242, 243, 243);
        doc.roundedRect(x, cy, cardW, cardH, 2, 2, "F");
        const im = imgs[i + j];
        if (im) {
          const bw = cardW - 8, bh = cardH - 14;
          const r = Math.min(bw / im.w, bh / im.h);
          const w = im.w * r, h = im.h * r;
          doc.addImage(im.data, "JPEG", x + (cardW - w) / 2, cy + 4 + (bh - h) / 2, w, h);
        }
        const leg = `${String(i + j + 1).padStart(2, "0")}  ${tr(group.photos[i + j].legenda || "")}`;
        small(doc.splitTextToSize(leg, cardW - 8)[0], x + 4, cy + cardH - 4, MUTED, false, 6.5);
      }
    }
  }

  // ============ RODAPÉS ============
  const total_p = doc.getNumberOfPages();
  for (let i = 1; i <= total_p; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
    doc.line(M, H - 16, W - M, H - 16);
    small(`MEC-HYDRO  /  ${T.quoteUp} ${numero}`, M, H - 10, MUTED, false, 6);
    small(footers[i - 1] || "", W - M - 45, H - 10, MUTED, false, 6);
    small(String(i).padStart(2, "0"), W - M, H - 10, RED, true, 7, true);
  }

  // Invoice aprovada com P.O.: nome do arquivo começa com o número do P.O. (mesma regra nas abas Approved e Finalized).
  let nomeArquivo = nomeArquivoOrcamentoPDF(o, String(lang || "").startsWith("pt"));

  if (p.somenteBytes) return doc.output("arraybuffer");

  // MEC HYDRO: todas as invoices aprovadas/finalizadas com o mesmo P.O. saem num único arquivo
  // (P.O. primeiro, depois os orçamentos do maior número para o menor).
  let invoiceParts: ArrayBuffer[] = [doc.output("arraybuffer")];
  if (isInvoice && isMec && temPedido && p.empresa?.id) {
    try {
      const irmaos = await buscarOrcamentosMesmoPedido(o, numeroPedido!, p.empresa);
      if (irmaos.length > 1) {
        const partes: ArrayBuffer[] = [];
        for (const irmao of irmaos) {
          if (irmao.id === o.id) { partes.push(invoiceParts[0]); continue; }
          const params = await carregarParamsOrcamento(irmao.id, p.empresa, p.language);
          const bytes = await gerarOrcamentoModernoPDF({ ...params, somenteBytes: true });
          if (bytes) partes.push(bytes as ArrayBuffer);
        }
        invoiceParts = partes;
        const nums = irmaos.map((x) => numeroOrcamentoParaArquivo(x.numero)).join(", ");
        nomeArquivo = `PO ${numeroPedido} - Invoice ${nums}.pdf`;
      }
    } catch (e) {
      console.error("Falha ao agrupar orçamentos do mesmo P.O.:", e);
      invoiceParts = [doc.output("arraybuffer")];
    }
  }

  // Invoice aprovada: P.O. do cliente primeiro, invoice(s) depois.
  if (isInvoice) {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      const poUrl = await buscarAnexoPedidoUrl(o);
      if (poUrl) {
        try {
          const resp = await fetch(poUrl);
          if (resp.ok) {
            const poDoc = await PDFDocument.load(await resp.arrayBuffer(), { ignoreEncryption: true });
            (await merged.copyPages(poDoc, poDoc.getPageIndices())).forEach((pg) => merged.addPage(pg));
          }
        } catch (e) { console.error("Falha ao anexar P.O. ao invoice:", e); }
      }
      if (merged.getPageCount() > 0 || invoiceParts.length > 1) {
        for (const part of invoiceParts) {
          const d = await PDFDocument.load(part);
          (await merged.copyPages(d, d.getPageIndices())).forEach((pg) => merged.addPage(pg));
        }
        const bytes = await merged.save();
        if (p.capturar) { p.capturar(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, nomeArquivo); return; }
        const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return;
      }
    } catch (e) {
      console.error("Falha ao montar invoice com P.O.:", e);
    }
  }
  if (p.capturar) { p.capturar(doc.output("arraybuffer"), nomeArquivo); return; }
  doc.save(nomeArquivo);
}

/** Orçamentos da mesma empresa, aprovados/finalizados, com o mesmo P.O.; ordem decrescente de número. */
async function buscarOrcamentosMesmoPedido(o: any, numeroPedido: string, empresa: any) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.from("orcamentos")
    .select("id, numero, numero_pedido, status")
    .eq("empresa_id", empresa.id)
    .in("status", STATUS_APROVADO_INVOICE);
  if (error) throw error;
  const alvo = numeroPedido.trim().toUpperCase();
  const lista = (data || []).filter((x: any) => String(normalizarNumeroPedido(x.numero_pedido) || "").trim().toUpperCase() === alvo);
  if (!lista.some((x: any) => x.id === o.id)) lista.push({ id: o.id, numero: o.numero, numero_pedido: o.numero_pedido, status: o.status });
  const chave = (n: any) => {
    const m = String(n || "").match(/(\d+)\D+(\d{2,4})$/);
    return m ? Number(m[2].slice(-2)) * 100000 + Number(m[1]) : 0;
  };
  return lista.sort((a: any, b: any) => chave(b.numero) - chave(a.numero));
}

async function buscarFotosEntrega(o: any, empresa: any) {
  const quoteId = o.orcamento_id || o.id;
  if (!quoteId || !empresa?.id) return [];
  const { supabase } = await import("@/integrations/supabase/client");
  const columns = 'id, empresa_id, orcamento_id, numero_ordem, status, documento_entrega_url';
  const linked = await supabase.from('ordens_servico').select(columns)
    .eq('empresa_id', empresa.id).eq('orcamento_id', quoteId);
  if (linked.error) throw linked.error;
  const orders: DeliveryOrder[] = linked.data || [];
  if (o.ordem_servico_id && !orders.some(order => order.id === o.ordem_servico_id)) {
    const direct = await supabase.from('ordens_servico').select(columns)
      .eq('empresa_id', empresa.id).eq('id', o.ordem_servico_id).maybeSingle();
    if (direct.error) throw direct.error;
    if (direct.data) orders.push(direct.data);
  }
  if (!orders.length && o.ordem_referencia) {
    const reference = await supabase.from('ordens_servico').select(columns)
      .eq('empresa_id', empresa.id).eq('numero_ordem', o.ordem_referencia).limit(2);
    if (reference.error) throw reference.error;
    orders.push(...(reference.data || []));
  }
  return invoiceDeliveryPhotos(orders, o, empresa);
}

/** Localiza o PDF do P.O. salvo na aprovação (registrado na descrição do orçamento). */
async function buscarAnexoPedidoUrl(o: any): Promise<string | null> {
  const extrair = (txt: any) => {
    const m = String(txt || "").match(/Anexo do Pedido:\s*(\S+)/);
    return m ? m[1] : null;
  };
  let url = extrair(o.descricao);
  const id = o.orcamento_id || o.id;
  if (!url && id) {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from("orcamentos").select("descricao").eq("id", id).maybeSingle();
    url = extrair(data?.descricao);
  }
  return url;
}

/** Busca todos os dados de um orçamento salvo e gera o PDF no novo layout. */
export async function baixarOrcamentoModernoPorId(orcamentoId: string, empresa: any, language: string) {
  await gerarOrcamentoModernoPDF(await carregarParamsOrcamento(orcamentoId, empresa, language));
}

/** Gera o mesmo arquivo do download (quote ou invoice com P.O.) e devolve os bytes. */
export async function gerarArquivoOrcamentoPorId(orcamentoId: string, empresa: any, language: string) {
  let out: { bytes: ArrayBuffer; nome: string } | null = null;
  const params = await carregarParamsOrcamento(orcamentoId, empresa, language);
  await gerarOrcamentoModernoPDF({ ...params, capturar: (bytes, nome) => { out = { bytes, nome }; } });
  if (!out) throw new Error("Falha ao gerar PDF");
  return out as { bytes: ArrayBuffer; nome: string };
}

async function carregarParamsOrcamento(orcamentoId: string, empresa: any, language: string): Promise<ModernOrcamentoParams> {
  const { supabase } = await import("@/integrations/supabase/client");
  if (!empresa?.id) throw new Error("Selecione uma empresa");
  const { data: orcamento } = await supabase.from("orcamentos").select("*").eq("empresa_id", empresa.id).eq("id", orcamentoId).maybeSingle();
  if (!orcamento) throw new Error("Orçamento não encontrado");
  const o: any = orcamento;
  const { data: itens } = await supabase.from("itens_orcamento").select("*").eq("empresa_id", empresa.id).eq("orcamento_id", o.id);
  const sel = `*, recebimentos!ordens_servico_recebimento_id_fkey (pressao_trabalho, temperatura_trabalho, fluido_trabalho, camisa, haste_comprimento, curso, conexao_a, conexao_b, local_instalacao, potencia, ambiente_trabalho, categoria_equipamento)`;
  let os: any = null;
  if (o.ordem_servico_id) os = (await supabase.from("ordens_servico").select(sel).eq("empresa_id", empresa.id).eq("id", o.ordem_servico_id).maybeSingle()).data;
  else if (o.ordem_referencia) os = (await supabase.from("ordens_servico").select(sel).eq("empresa_id", empresa.id).eq("numero_ordem", o.ordem_referencia).maybeSingle()).data;
  let fotos: any[] = [];
  if (o.ordem_servico_id && os?.recebimento_id) {
    fotos = (await supabase.from("fotos_equipamentos").select("*").eq("empresa_id", empresa.id).eq("recebimento_id", os.recebimento_id).eq("apresentar_orcamento", true)).data || [];
  } else if (!o.ordem_servico_id) {
    fotos = (await supabase.from("fotos_orcamento").select("*").eq("empresa_id", empresa.id).eq("orcamento_id", o.id).eq("apresentar_orcamento", true)).data || [];
  }
  let dadosTecnicos: any = null, laudo = "", findings = "";
  if (os) {
    const r = os.recebimentos || {};
    laudo = (language === "pt-BR" ? os.laudo_tecnico || os.laudo_tecnico_en : os.laudo_tecnico_en || os.laudo_tecnico) || "";
    findings = os.descricao_problema || os.tipo_problema || "";
    dadosTecnicos = {
      pressaoTrabalho: r.pressao_trabalho || os.pressao_trabalho || "", temperaturaTrabalho: r.temperatura_trabalho || os.temperatura_trabalho || "",
      fluidoTrabalho: r.fluido_trabalho || os.fluido_trabalho || "", camisa: r.camisa || os.camisa || "",
      hasteComprimento: r.haste_comprimento || os.haste_comprimento || "", curso: r.curso || os.curso || "",
      conexaoA: r.conexao_a || os.conexao_a || "", conexaoB: r.conexao_b || os.conexao_b || "",
      potencia: r.potencia || os.potencia || "", categoriaEquipamento: r.categoria_equipamento || os.categoria_equipamento || "",
    };
  }
  let clienteDoc = "";
  const q = o.cliente_id
    ? supabase.from("clientes").select("cnpj_cpf").eq("empresa_id", empresa.id).eq("id", o.cliente_id).maybeSingle()
    : o.cliente_nome ? supabase.from("clientes").select("cnpj_cpf").eq("empresa_id", empresa.id).eq("nome", o.cliente_nome).maybeSingle() : null;
  if (q) {
    const cliente = (await q).data;
    clienteDoc = cliente?.cnpj_cpf || "";
  }
  return { orcamento: o, itens: itens || [], fotos, dadosTecnicos, laudo, findings, clienteDoc, empresa, language };
}
