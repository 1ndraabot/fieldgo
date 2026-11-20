// Impor ini HARUS paling atas di berkas tes yang menguji jalur service DEMO-gated:
// modul `lib/demo.ts` membaca DATABASE_URL saat modul dimuat, jadi env harus terisi dulu.
process.env.DATABASE_URL ??= 'postgresql://uji:uji@localhost:5432/uji';
