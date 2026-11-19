import { handlersLapangan } from '@/lib/admin/lapangan/handlers';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handlersLapangan.tarif(req, (await params).id);
}
