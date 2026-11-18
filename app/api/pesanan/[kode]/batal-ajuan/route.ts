import { handlersRiwayat } from '@/lib/riwayat/deps';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ kode: string }> }) {
  return handlersRiwayat.ajukan(req, (await params).kode);
}
