import { handlersLapangan } from '@/lib/admin/lapangan/handlers';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handlersLapangan.ubahFasilitas(req, (await params).id);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handlersLapangan.hapusFasilitas(req, (await params).id);
}
