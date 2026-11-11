import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), single: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
  from: () => ({ update: mocks.update }),
} }));
import { saveDeliverySignature } from './delivery-signature';
describe('save delivery signature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ eq: mocks.eq, select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({ data: { id: 'order' }, error: null });
  });
  it('saves on the company order without any quote, approval or PO requirement', async () => {
    const result = await saveDeliverySignature('us', 'order', new Blob(['signature']));
    expect(result.path).toMatch(/^us\/order\/.+\.png$/);
    expect(mocks.eq).toHaveBeenCalledWith('empresa_id', 'us');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'order');
    expect(mocks.update).toHaveBeenCalledWith({ assinatura_entrega_path: result.path, data_assinatura_entrega: result.date });
    expect(Number.isNaN(Date.parse(result.date))).toBe(false);
  });
  it('cleans up upload and reports denied or missing order updates', async () => {
    mocks.single.mockResolvedValue({ data: null, error: new Error('denied') });
    await expect(saveDeliverySignature('us', 'order', new Blob(['signature']))).rejects.toThrow('denied');
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});