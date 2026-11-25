import { handlersGateway } from '@/lib/gateway/deps';

export const runtime = 'nodejs';

/** Webhook publik. Provider memverifikasi signature sebelum data dipercaya. */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handlersGateway.notifikasi(req, (await params).provider);
}
