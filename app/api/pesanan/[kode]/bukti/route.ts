import { handlersPembayaran } from '@/lib/pembayaran/deps';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ kode: string }> }) {
  return handlersPembayaran.bukti(req, (await params).kode);
}
