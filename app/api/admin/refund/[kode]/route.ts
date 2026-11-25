import { pengecualianDeps } from '@/lib/admin/pengecualian/deps';
import { buatRefundApi } from '@/lib/admin/pengecualian/handlers';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ kode: string }> }) {
  return buatRefundApi(pengecualianDeps, req, (await params).kode);
}
