import { handlersLapangan } from '@/lib/admin/lapangan/handlers';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handlersLapangan.tambahJenis(req);
}
