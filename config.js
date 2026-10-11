/* ==========================================================================
   KONFIGURASI PENGIRIMAN ALTIERA
   Isi nilai di bawah dengan data ASLI sebelum dipakai untuk transaksi nyata.
   Nilai null = cek ongkir otomatis akan menolak permintaan (tidak ada tebakan).
   ========================================================================== */
module.exports = {
  // Nama produk (harus sama id-nya dengan PRODUCTS di index.html)
  PRODUCT_NAME: {
    prestige: 'ALTIERA PRESTIGE',
    allure: 'ALTIERA ALLURE',
    keangkuhan: 'ALTIERA KEANGKUHAN'
  },

  // Berat AKTUAL 1 botol 30 ml SUDAH TERMASUK kemasan, dalam GRAM.
  // Ketiga produk sama beratnya (sudah ditimbang dalam keadaan terpacking).
  PRODUCT_WEIGHT_GRAM: {
    prestige: 300,
    allure: 300,
    keangkuhan: 300
  },

  // Berat kemasan TAMBAHAN per pesanan, dalam GRAM.
  // 0 = kemasan sudah dihitung di PRODUCT_WEIGHT_GRAM.
  PACKAGING_WEIGHT_GRAM: 0
};
