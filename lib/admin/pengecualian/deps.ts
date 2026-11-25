import { pilihGateway } from '../../gateway/index.ts';
import { prismaGatewayStore } from '../../gateway/prisma-store.ts';
import { prismaPengecualianStore } from './prisma-store.ts';

/** Satu deps untuk kelima route pengecualian/refund/pembatalan (FR-ADM-06/07). */
export const pengecualianDeps = {
  store: prismaPengecualianStore,
  gatewayStore: prismaGatewayStore,
  gateway: pilihGateway(),
  sekarang: () => new Date(),
};
