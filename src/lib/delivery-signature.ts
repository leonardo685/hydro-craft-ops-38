import { supabase } from '@/integrations/supabase/client';

export async function saveDeliverySignature(companyId: string, orderId: string, image: Blob) {
  if (!companyId || !orderId || !image.size) throw new Error('Order and signature are required');
  const path = `${companyId}/${orderId}/${crypto.randomUUID()}.png`;
  const bucket = supabase.storage.from('delivery-signatures');
  const upload = await bucket.upload(path, image, { contentType: 'image/png' });
  if (upload.error) throw upload.error;
  const date = new Date().toISOString();
  const result = await supabase.from('ordens_servico')
    .update({ assinatura_entrega_path: path, data_assinatura_entrega: date })
    .eq('empresa_id', companyId).eq('id', orderId).select('id').single();
  if (result.error || !result.data) {
    await bucket.remove([path]);
    throw result.error || new Error('Order could not be updated');
  }
  return { path, date };
}

export async function deliverySignatureURL(path: string) {
  const { data, error } = await supabase.storage.from('delivery-signatures').createSignedUrl(path, 600);
  if (error || !data?.signedUrl) throw error || new Error('Signature unavailable');
  return data.signedUrl;
}