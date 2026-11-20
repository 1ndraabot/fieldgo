import { pengecualianDeps } from '@/lib/admin/pengecualian/deps';
import { selesaikanRefundApi } from '@/lib/admin/pengecualian/handlers';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ kode: string }> }) {
  return selesaikanRefundApi(pengecualianDeps, req, (await params).kode);
}
