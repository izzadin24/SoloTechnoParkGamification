// Mapping of innovation ideas to required checkpoint IDs
export const IDEA_CHECKPOINTS: Record<string, string[]> = {
  // Example mappings – adjust as needed based on design
  'ide-01': ['cp-1-01', 'cp-2-02', 'cp-3-03'], // Portable Health Device
  'ide-02': ['cp-1-02', 'cp-2-01', 'cp-3-04'], // Village Logistics App
  'ide-03': ['cp-1-03', 'cp-2-03', 'cp-3-01'], // Modern Fishing Boat
  'ide-04': ['cp-1-04', 'cp-2-04', 'cp-3-02']  // Upgraded SME Product
};

// Optional descriptions for ideas (can be extended later)
export const IDEA_DESCRIPTIONS: Record<string, {id: string; en: string}> = {
  'ide-01': {id: 'Alat Kesehatan Portabel membantu monitoring vital secara real-time.', en: 'Portable health device enables real-time vital monitoring.'},
  'ide-02': {id: 'Aplikasi logistik desa mempermudah distribusi barang antar desa.', en: 'Village logistics app streamlines inter‑village goods distribution.'},
  'ide-03': {id: 'Kapal nelayan modern dengan teknologi efisiensi bahan bakar.', en: 'Modern fishing boat with fuel‑efficiency technology.'},
  'ide-04': {id: 'Produk UMKM naik kelas dengan branding dan distribusi lebih luas.', en: 'SME product upgraded with branding and wider distribution.'}
};