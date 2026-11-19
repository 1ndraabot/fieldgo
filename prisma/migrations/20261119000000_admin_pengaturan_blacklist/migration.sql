-- Sprint 3: pengaturan gateway, blacklist jadwal, dan pengguna.
-- DB fieldgo hanya mengizinkan tiga kunci pengaturan; dua kunci baru butuh perluasan CHECK.

ALTER TABLE pengaturan DROP CONSTRAINT pengaturan_kunci_dikenal;
ALTER TABLE pengaturan ADD CONSTRAINT pengaturan_kunci_dikenal CHECK (
  kunci = ANY (ARRAY['rekening_tujuan', 'batas_bayar_jam', 'batas_pembatalan_hari', 'gateway_aktif', 'metode_aktif'])
);

-- Nilai awal agar admin melihat keadaan sebenarnya, bukan hanya default aplikasi.
INSERT INTO pengaturan (kunci, nilai) VALUES ('gateway_aktif', 'true'::jsonb) ON CONFLICT (kunci) DO NOTHING;
INSERT INTO pengaturan (kunci, nilai) VALUES ('metode_aktif', '[]'::jsonb) ON CONFLICT (kunci) DO NOTHING;

-- Siapa admin yang membuat blokir (FR-ADM-05). Nullable agar baris lama tetap sah.
ALTER TABLE blokir_jadwal ADD COLUMN dibuat_oleh bigint REFERENCES pengguna(id) ON DELETE SET NULL;
