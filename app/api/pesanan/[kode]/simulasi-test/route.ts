import { handlersGateway } from '@/lib/gateway/deps';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ kode: string }> }) {
  return handlersGateway.simulasiTest(req, (await params).kode);
}
