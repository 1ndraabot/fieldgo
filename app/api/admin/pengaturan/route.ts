import { simpanPengaturanApi } from '@/lib/admin/pengaturan/handlers';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return simpanPengaturanApi(req);
}
