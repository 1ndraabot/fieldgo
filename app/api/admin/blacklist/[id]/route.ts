import { hapusBlokirApi } from '@/lib/admin/blacklist/handlers';

export const runtime = 'nodejs';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return hapusBlokirApi(req, (await params).id);
}
