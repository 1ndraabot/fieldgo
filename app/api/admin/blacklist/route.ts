import { simpanBlokirApi } from '@/lib/admin/blacklist/handlers';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return simpanBlokirApi(req);
}
