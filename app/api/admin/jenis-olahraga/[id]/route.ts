import { handlersLapangan } from '@/lib/admin/lapangan/handlers';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handlersLapangan.ubahJenis(req, (await params).id);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handlersLapangan.hapusJenis(req, (await params).id);
}
