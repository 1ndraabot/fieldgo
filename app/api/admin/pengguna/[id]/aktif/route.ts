import { ubahAktifPenggunaApi } from '@/lib/admin/pengguna/handlers';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return ubahAktifPenggunaApi(req, (await params).id);
}
