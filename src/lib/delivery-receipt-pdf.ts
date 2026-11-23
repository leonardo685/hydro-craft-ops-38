import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { loadLogoForPDF } from '@/lib/pdf-logo-utils';
import { deliverySignatureURL } from '@/lib/delivery-signature';

export type DeliveryReceiptData = {
  empresaNome: string; empresaEndereco?: string | null; empresaTelefone?: string | null; empresaEmail?: string | null; logoUrl?: string | null;
  numeroOrdem: string; cliente: string; equipamento: string; numeroSerie?: string | null;
  po?: string | null; tag?: string | null; solicitante?: string | null; quoteNumero?: string | null;
  dataEntrega: string; assinaturaDataUrl: string;
};

const blank = (v?: string | null) => !v || /^(none|n\/?a|-)$/i.test(v.trim());

export function solicitanteFromObservacoes(obs?: string | null) {
  const m = obs?.match(/Solicitante:\s*([^|]*)/i);
  return m?.[1]?.trim() || null;
}

async function toDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(blob); });
}

/** Loads everything for an order's delivery receipt, scoped to the company. */
export async function loadDeliveryReceiptData(empresa: { id: string; nome: string; endereco?: string | null; telefone?: string | null; email?: string | null; logo_url?: string | null }, ordemId: string): Promise<DeliveryReceiptData> {
  const { data: o, error } = await supabase.from('ordens_servico')
    .select('id, numero_ordem, cliente_nome, equipamento, numero_serie, orcamento_id, assinatura_entrega_path, data_assinatura_entrega')
    .eq('empresa_id', empresa.id).eq('id', ordemId).maybeSingle();
  if (error || !o) throw new Error('Order not found');
  if (!o.assinatura_entrega_path || !o.data_assinatura_entrega) throw new Error('Customer signature required');
  let q: any = null;
  if (o.orcamento_id) q = (await supabase.from('orcamentos').select('numero, numero_pedido, equipamento, assunto_proposta, observacoes').eq('empresa_id', empresa.id).eq('id', o.orcamento_id).maybeSingle()).data;
  if (!q) q = (await supabase.from('orcamentos').select('numero, numero_pedido, equipamento, assunto_proposta, observacoes').eq('empresa_id', empresa.id).eq('ordem_servico_id', o.id).order('created_at', { ascending: false }).limit(1)).data?.[0] ?? null;
  const assinaturaDataUrl = await toDataUrl(await deliverySignatureURL(o.assinatura_entrega_path));
  return {
    empresaNome: empresa.nome, empresaEndereco: empresa.endereco, empresaTelefone: empresa.telefone, empresaEmail: empresa.email, logoUrl: empresa.logo_url,
    numeroOrdem: o.numero_ordem, cliente: o.cliente_nome, equipamento: q?.assunto_proposta || o.equipamento, numeroSerie: o.numero_serie,
    po: blank(q?.numero_pedido) ? null : q.numero_pedido, tag: q?.equipamento || o.equipamento, solicitante: solicitanteFromObservacoes(q?.observacoes),
    quoteNumero: q?.numero || null, dataEntrega: o.data_assinatura_entrega, assinaturaDataUrl,
  };
}

export function deliveryReceiptFilename(d: Pick<DeliveryReceiptData, 'numeroOrdem'>) {
  return `Delivery-Receipt-${d.numeroOrdem.replace(/[^A-Za-z0-9-]/g, '_')}.pdf`;
}

export async function gerarComprovanteEntregaPDF(d: DeliveryReceiptData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 18;
  const RED: [number, number, number] = [200, 30, 40], DARK: [number, number, number] = [25, 28, 34], MUTED: [number, number, number] = [110, 115, 125], LINE: [number, number, number] = [225, 228, 232];
  // header band
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 38, 'F');
  doc.setFillColor(...RED); doc.rect(0, 38, W, 2, 'F');
  try {
    const logo = await loadLogoForPDF(d.logoUrl);
    const img = new Image(); img.src = logo.dataUrl; await img.decode();
    const h = 22, w = Math.min(60, h * img.naturalWidth / img.naturalHeight);
    doc.setFillColor(255, 255, 255); doc.roundedRect(M - 2, 6, w + 4, h + 4, 2, 2, 'F');
    doc.addImage(logo.dataUrl, logo.format, M, 8, w, h);
  } catch { /* logo optional */ }
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('DELIVERY RECEIPT', W - M, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`Work Order ${d.numeroOrdem}`, W - M, 27, { align: 'right' });

  let y = 52;
  doc.setTextColor(...MUTED); doc.setFontSize(9);
  const contato = [d.empresaNome, d.empresaEndereco, d.empresaTelefone, d.empresaEmail].filter(Boolean).join('  •  ');
  doc.text(doc.splitTextToSize(contato, W - 2 * M), M, y); y += 12;

  const fecha = new Date(d.dataEntrega);
  const campos: [string, string][] = [
    ['Equipment', d.equipamento || '-'],
    ['Customer', d.cliente || '-'],
    ['Delivered by', d.empresaNome],
    ['P.O. Number', d.po || '-'],
    ['Equipment Tag', d.tag || '-'],
    ['Requester', d.solicitante || '-'],
    ['Work Order', d.numeroOrdem],
    ['Quote', d.quoteNumero || '-'],
    ['Serial Number', d.numeroSerie || '-'],
    ['Delivery Date', fecha.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + fecha.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })],
  ];
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK);
  doc.text('Delivery Details', M, y); doc.setFillColor(...RED); doc.rect(M, y + 2, 18, 0.8, 'F'); y += 9;
  const colW = (W - 2 * M - 6) / 2;
  campos.forEach(([k, v], i) => {
    const x = M + (i % 2) * (colW + 6), yy = y + Math.floor(i / 2) * 18;
    doc.setDrawColor(...LINE); doc.setFillColor(248, 249, 250); doc.roundedRect(x, yy, colW, 15, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(k.toUpperCase(), x + 4, yy + 5.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(v, colW - 8)[0], x + 4, yy + 11.5);
  });
  y += Math.ceil(campos.length / 2) * 18 + 6;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...DARK);
  const decl = `I confirm that the equipment described above was delivered by ${d.empresaNome} and received in good condition.`;
  doc.text(doc.splitTextToSize(decl, W - 2 * M), M, y); y += 14;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Customer Signature', M, y);
  doc.setFillColor(...RED); doc.rect(M, y + 2, 18, 0.8, 'F'); y += 7;
  doc.setDrawColor(...LINE); doc.roundedRect(M, y, W - 2 * M, 60, 2, 2, 'S');
  doc.addImage(d.assinaturaDataUrl, 'PNG', M + 10, y + 3, W - 2 * M - 20, (W - 2 * M - 20) * 0.4 > 54 ? 54 : (W - 2 * M - 20) * 0.4);
  y += 60;
  doc.setDrawColor(...MUTED); doc.line(M + 10, y - 8, W - M - 10, y - 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text(`${d.solicitante || d.cliente}  —  signed ${fecha.toLocaleString('en-US')}`, W / 2, y - 3, { align: 'center' });

  doc.setFillColor(...DARK); doc.rect(0, 287, W, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(8);
  doc.text(`${d.empresaNome}  •  Delivery Receipt ${d.numeroOrdem}`, W / 2, 293, { align: 'center' });
  return doc.output('blob');
}
