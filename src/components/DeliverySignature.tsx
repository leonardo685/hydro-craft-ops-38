import { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Eraser, Save, Loader2 } from 'lucide-react';

export function DeliverySignature({ onSave, busy }: { onSave: (image: Blob) => Promise<void>; busy: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pad = useRef<SignaturePad | null>(null);
  const [empty, setEmpty] = useState(true);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const color = getComputedStyle(node).color;
    const instance = new SignaturePad(node, { penColor: color });
    pad.current = instance;
    instance.addEventListener('endStroke', () => setEmpty(instance.isEmpty()));
    return () => { instance.off(); pad.current = null; };
  }, []);
  return <div className="space-y-3">
    <canvas ref={canvas} width={900} height={360} aria-label="Customer signature" className="w-full aspect-[5/2] touch-none border rounded-md bg-[hsl(var(--signature-paper))] text-[hsl(var(--signature-ink))]" />
    <div className="flex justify-between gap-2">
      <Button variant="outline" disabled={busy} title="Clear signature" onClick={() => { pad.current?.clear(); setEmpty(true); }}><Eraser className="h-4 w-4 mr-2" />Clear</Button>
      <Button disabled={busy || empty} title="Save signature" onClick={() => canvas.current?.toBlob(blob => { if (blob) void onSave(blob); }, 'image/png')}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save signature
      </Button>
    </div>
  </div>;
}