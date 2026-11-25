import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download } from 'lucide-react';
import { buildSalesTaxReport } from '@/lib/sales-tax-report';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function SalesTaxReport() {
  const navigate = useNavigate();
  const { empresaAtual } = useEmpresa();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [quotes, setQuotes] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaAtual?.id) return;
    (async () => {
      const [{ data: q }, { data: l }] = await Promise.all([
        supabase.from('orcamentos').select('numero, cliente_nome, valor, desconto_percentual, urgency_fee_enabled, urgency_fee_percentual, tax_exempt').eq('empresa_id', empresaAtual.id).in('status', ['aprovado', 'finalizado']),
        supabase.from('lancamentos_financeiros').select('descricao, pago, data_realizada').eq('empresa_id', empresaAtual.id).eq('tipo', 'entrada').ilike('descricao', 'Invoice %'),
      ]);
      setQuotes(q || []); setEntries(l || []);
    })();
  }, [empresaAtual?.id]);

  const report = useMemo(() => buildSalesTaxReport(quotes, entries, empresaAtual?.nome, year, month), [quotes, entries, empresaAtual?.nome, year, month]);

  const exportCsv = () => {
    const lines = [['Invoice','Customer','Received','Taxable sales','Sales tax','Total collected','Exempt'].join(',')];
    report.rows.forEach(r => lines.push([r.numero, `"${r.cliente}"`, r.dataRecebimento, r.taxable, r.salesTax, r.total, r.exempt ? 'Yes' : 'No'].join(',')));
    lines.push(['TOTAL','','',report.taxableSales,report.salesTax,report.totalSales + report.salesTax,''].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = `sales-tax-${year}-${String(month + 1).padStart(2, '0')}.csv`; a.click();
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/orcamentos')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">Monthly Sales Tax Report — Texas</h1>
          <div className="ml-auto flex gap-2">
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
            <Button onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Based on invoices marked as received in {MONTHS[month]} {year}.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {[['Total sales', report.totalSales], ['Taxable sales', report.taxableSales], ['Sales tax to pay', report.salesTax]].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="text-2xl font-bold text-primary">{usd(v as number)}</p></div>
          ))}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Received</TableHead><TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">Sales tax</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {report.rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No invoices received this month.</TableCell></TableRow>}
            {report.rows.map(r => (
              <TableRow key={r.numero}><TableCell>#{r.numero}</TableCell><TableCell>{r.cliente}</TableCell><TableCell>{r.dataRecebimento}</TableCell>
                <TableCell className="text-right">{r.exempt ? 'Exempt' : usd(r.taxable)}</TableCell><TableCell className="text-right">{usd(r.salesTax)}</TableCell><TableCell className="text-right">{usd(r.total)}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
