/** Reserve the window during the click so mobile browsers do not block it. */
export function preparePDFPrint() {
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Allow pop-ups to print this document.');
  preview.document.title = 'Print PDF';
  preview.document.body.textContent = 'Preparing PDF…';
  return {
    close: () => preview.close(),
    show: (bytes: ArrayBuffer, name: string) => {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      preview.document.title = name;
      preview.document.body.textContent = '';
      const print = preview.document.createElement('button');
      print.textContent = 'Print';
      const frame = preview.document.createElement('iframe');
      frame.title = name;
      frame.style.width = '100%';
      frame.style.height = '90vh';
      const trigger = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { preview.location.href = url; } };
      print.onclick = trigger;
      frame.onload = trigger;
      frame.src = url;
      preview.document.body.append(print, frame);
      preview.addEventListener('pagehide', () => URL.revokeObjectURL(url), { once: true });
    },
  };
}