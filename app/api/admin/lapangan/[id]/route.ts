import { handlersLapangan } from '@/lib/admin/lapangan/handlers';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handlersLapangan.ubah(req, (await params).id);
}
