import jsPDF from "jspdf";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { translateTerm } from "@/i18n/dynamicTerms";

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
    photos: "Condição do equipamento", photosSub: "Registro fotográfico do equipamento",
    photoRecord: "REGISTRO FOTOGRÁFICO", defaultTitle: "Reforma / Manutenção",
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
    photos: "Equipment condition", photosSub: "Photographic record of the equipment",
    photoRecord: "PHOTO RECORD", defaultTitle: "Repair / Maintenance",
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
    photos: "Condición del equipo", photosSub: "Registro fotográfico del equipo",
    photoRecord: "REGISTRO FOTOGRÁFICO", defaultTitle: "Reparación / Mantenimiento",
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

export async function gerarOrcamentoModernoPDF(p: ModernOrcamentoParams) {
  const lang: Lang = (["pt-BR", "en", "es"].includes(p.language) ? p.language : "pt-BR") as Lang;
  const T = TXT[lang];
  const tr = (v: any) => translateTerm(v == null ? "" : String(v), lang as any);
  const o = p.orcamento;
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
  const isMec = String(p.empresa?.nome || "").toUpperCase().includes("MEC HYDRO");
  const currency = isMec || lang === "en" ? "USD" : "BRL";
  const money = (v: number) => v.toLocaleString(locale, { style: "currency", currency });

  const doc = new jsPDF();
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  const M = 18;
  const CW = W - M * 2;

  const numero = o.numero_revisao ? `${o.numero} REV${o.numero_revisao}` : o.numero || "";
  const isInvoice = String(o.observacoes || "").includes("Documento: invoice");
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
  small(docLabel, M, y, RED);
  y += 9;
  const titulo = tr(o.assunto_proposta || o.equipamento || T.defaultTitle);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...DARK);
  const tl = doc.splitTextToSize(titulo.charAt(0).toUpperCase() + titulo.slice(1), CW * 0.6);
  doc.text(tl, M, y);
  y += tl.length * 9 + 1;
  const data = new Date(o.data_orcamento || o.created_at || Date.now()).toLocaleDateString(locale, {
    day: "numeric", month: "long", year: "numeric",
  });
  small(`${T.quote} ${numero}   /   ${data}`, M, y, MUTED, false, 7.5);
  y += 9; rule(y); y += 9;

  small(T.preparedFor, M, y); y += 7;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...DARK);
  const cl = doc.splitTextToSize(o.cliente_nome || "N/A", CW);
  doc.text(cl, M, y); y += cl.length * 6 + 1;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...DARK);
  doc.text(`${T.refOrder}  ${o.ordem_referencia || "N/A"}`, M, y); y += 6;
  small(`${T.taxId}  ${p.clienteDoc || "N/A"}    |    ${T.entryInvoice}  ${o.numero_nota_entrada || "N/A"}`, M, y, MUTED, false, 7);
  y += 9; rule(y); y += 10;

  const subtotal = Number(o.valor || 0);
  const tax = isMec ? subtotal * 0.085 : 0;
  const total = subtotal + tax;
  small(isMec ? T.totalTax : T.total, M, y); y += 14;
  doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(...RED);
  doc.text(money(total), M, y);
  small(currency, M + doc.getTextWidth(money(total)) + 12, y - 1, MUTED, false, 7);
  y += 12;
  if (isMec) {
    small(T.subtotal, M, y, MUTED, false, 7);
    small(`${T.salesTax}  ${(8.5).toLocaleString(locale)}%`, W / 2, y, MUTED, false, 7);
    y += 5;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
    doc.text(money(subtotal), M, y); doc.text(money(tax), W / 2, y);
    y += 8;
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

  const lista = async (label: string, arr: any[]) => {
    if (!arr.length) return;
    await section(label);
    small(T.qty, W - M, y - 5, MUTED, true, 6, true);
    // alinhar QTD à direita
    y += 0;
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
    y += 4;
  };
  const itens = p.itens || [];
  await lista(T.parts, itens.filter((i) => i.tipo === "peca"));
  await lista(T.services, itens.filter((i) => i.tipo === "servico"));
  await lista(T.machining, itens.filter((i) => i.tipo === "usinagem"));

  // ============ FOTOS ============
  if (p.fotos.length) {
    const imgs = await Promise.all(p.fotos.map((f) => loadImage(f.arquivo_url)));
    const cardW = (CW - 8) / 2;
    const cardH = 100;
    for (let i = 0; i < p.fotos.length; i += 4) {
      const pageN = i / 4 + 1;
      y = await newPage(`${T.photoRecord} / ${pageN}`);
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...DARK);
      doc.text(T.photos, M, y + 4);
      small(T.photosSub, M, y + 10, MUTED, false, 7);
      y += 18;
      for (let j = 0; j < 4 && i + j < p.fotos.length; j++) {
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
        const leg = `${String(i + j + 1).padStart(2, "0")}  ${tr(p.fotos[i + j].legenda || "")}`;
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

  const base = numeroParaMH(o.numero);
  doc.save(`${String(lang || "").startsWith("pt") ? "Orcamento" : "Quote"} ${base}${o.numero_revisao ? ` REV${o.numero_revisao}` : ""}.pdf`);
}

/** Busca todos os dados de um orçamento salvo e gera o PDF no novo layout. */
export async function baixarOrcamentoModernoPorId(orcamentoId: string, empresa: any, language: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: orcamento } = await supabase.from("orcamentos").select("*").eq("id", orcamentoId).maybeSingle();
  if (!orcamento) throw new Error("Orçamento não encontrado");
  const o: any = orcamento;
  const { data: itens } = await supabase.from("itens_orcamento").select("*").eq("orcamento_id", o.id);
  const sel = `*, recebimentos!ordens_servico_recebimento_id_fkey (pressao_trabalho, temperatura_trabalho, fluido_trabalho, camisa, haste_comprimento, curso, conexao_a, conexao_b, local_instalacao, potencia, ambiente_trabalho, categoria_equipamento)`;
  let os: any = null;
  if (o.ordem_servico_id) os = (await supabase.from("ordens_servico").select(sel).eq("id", o.ordem_servico_id).maybeSingle()).data;
  else if (o.ordem_referencia) os = (await supabase.from("ordens_servico").select(sel).eq("numero_ordem", o.ordem_referencia).maybeSingle()).data;
  let fotos: any[] = [];
  if (o.ordem_servico_id && os?.recebimento_id) {
    fotos = (await supabase.from("fotos_equipamentos").select("*").eq("recebimento_id", os.recebimento_id).eq("apresentar_orcamento", true)).data || [];
  } else if (!o.ordem_servico_id) {
    fotos = (await supabase.from("fotos_orcamento").select("*").eq("orcamento_id", o.id).eq("apresentar_orcamento", true)).data || [];
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
    ? supabase.from("clientes").select("cnpj_cpf").eq("id", o.cliente_id).maybeSingle()
    : o.cliente_nome ? supabase.from("clientes").select("cnpj_cpf").eq("nome", o.cliente_nome).maybeSingle() : null;
  if (q) clienteDoc = ((await q).data as any)?.cnpj_cpf || "";
  await gerarOrcamentoModernoPDF({ orcamento: o, itens: itens || [], fotos, dadosTecnicos, laudo, findings, clienteDoc, empresa, language });
}
