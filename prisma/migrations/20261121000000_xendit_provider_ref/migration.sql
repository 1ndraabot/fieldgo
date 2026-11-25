-- Migrasi provider pembayaran Midtrans -> Xendit.
-- `provider_ref` menyimpan invoice id Xendit; dipakai untuk sinkron status dan refund.
-- Nullable + indeks biasa (bukan unik) agar transaksi lama/provider lain tetap aman.

ALTER TABLE pembayaran_gateway ADD COLUMN provider_ref text;
CREATE INDEX pembayaran_gateway_provider_ref_idx ON pembayaran_gateway (provider_ref);

ALTER TABLE pembayaran_gateway ALTER COLUMN provider SET DEFAULT 'xendit';
ALTER TABLE gateway_event ALTER COLUMN provider SET DEFAULT 'xendit';
