import { handlersGateway } from '@/lib/gateway/deps';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ kode: string }> }) {
  return handlersGateway.status(req, (await params).kode);
}
