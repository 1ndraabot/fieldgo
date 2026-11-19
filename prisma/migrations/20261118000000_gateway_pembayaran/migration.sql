-- Sprint 1: fondasi payment gateway (Midtrans Snap).
-- Tabel bukti transfer manual (`pembayaran`) sengaja TIDAK diubah/dihapus: hanya diarsipkan.
-- ID mengikuti basis data fieldgo yang ada: bigserial + bigint.

CREATE TYPE status_pembayaran_gateway AS ENUM (
  'pending',
  'dibayar',
  'gagal',
  'kedaluwarsa',
  'refund',
  'sebagian_refund',
  'perlu_tinjau'
);

CREATE TYPE status_refund AS ENUM (
  'menunggu',
  'diproses',
  'berhasil',
  'gagal'
);

CREATE TABLE pembayaran_gateway (
  id                bigserial PRIMARY KEY,
  pesanan_id        bigint NOT NULL REFERENCES pesanan(id) ON DELETE RESTRICT,
  provider          text NOT NULL DEFAULT 'midtrans',
  order_id          text NOT NULL UNIQUE,
  metode            text,
  jumlah            integer NOT NULL CHECK (jumlah > 0),
  status            status_pembayaran_gateway NOT NULL DEFAULT 'pending',
  token             text,
  redirect_url      text,
  kedaluwarsa_pada  timestamptz(3),
  dibayar_pada      timestamptz(3),
  perlu_tinjau      boolean NOT NULL DEFAULT false,
  alasan_tinjau     text,
  dibuat_pada       timestamptz(3) NOT NULL DEFAULT now()
);

CREATE INDEX pembayaran_gateway_pesanan_id_idx ON pembayaran_gateway (pesanan_id);
CREATE INDEX pembayaran_gateway_status_idx ON pembayaran_gateway (status);

-- Catatan notifikasi mentah untuk idempotensi. event_key unik membuat notifikasi
-- yang sama tidak diproses dua kali.
CREATE TABLE gateway_event (
  id             bigserial PRIMARY KEY,
  provider       text NOT NULL DEFAULT 'midtrans',
  event_key      text NOT NULL UNIQUE,
  order_id       text NOT NULL,
  tipe           text NOT NULL,
  payload        jsonb NOT NULL,
  diterima_pada  timestamptz(3) NOT NULL DEFAULT now()
);

CREATE INDEX gateway_event_order_id_idx ON gateway_event (order_id);

CREATE TABLE refund (
  id                   bigserial PRIMARY KEY,
  pesanan_id           bigint NOT NULL REFERENCES pesanan(id) ON DELETE RESTRICT,
  pembayaran_gateway_id bigint REFERENCES pembayaran_gateway(id) ON DELETE SET NULL,
  nominal              integer NOT NULL CHECK (nominal > 0),
  alasan               text NOT NULL,
  cara                 text NOT NULL,
  status               status_refund NOT NULL DEFAULT 'menunggu',
  reference_gateway    text,
  catatan              text,
  diputuskan_oleh      bigint,
  diputuskan_pada      timestamptz(3),
  selesai_pada         timestamptz(3)
);

CREATE INDEX refund_pesanan_id_idx ON refund (pesanan_id);
CREATE INDEX refund_status_idx ON refund (status);
