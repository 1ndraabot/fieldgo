import { pengecualianDeps } from '@/lib/admin/pengecualian/deps';
import { sinkronkanApi } from '@/lib/admin/pengecualian/handlers';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ kode: string }> }) {
  return sinkronkanApi(pengecualianDeps, req, (await params).kode);
}
