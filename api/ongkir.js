/* ==========================================================================
   Serverless function: POST /api/ongkir
   Menghitung tarif kurir lewat Biteship Rates API (POST /v1/rates/couriers).
   API key hanya dibaca dari environment variable — tidak pernah dikirim ke browser.
   ========================================================================== */
const cfg = require('../config');

const MAX_QTY = 10;
const TIMEOUT_MS = 15000;
const BITESHIP_URL = 'https://api.biteship.com/v1/rates/couriers';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function setCors(res) {
  // Isi ALLOWED_ORIGIN dengan domain GitHub Pages Anda, mis. https://namaanda.github.io
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'null');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

function positiveNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}
function nonNegativeNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return send(res, 405, { message: 'Metode tidak diizinkan.' });

  // 1) Konfigurasi wajib
  const apiKey = process.env.BITESHIP_API_KEY;
  const originPostal = process.env.BITESHIP_ORIGIN_POSTAL_CODE;
  const couriers = process.env.BITESHIP_COURIERS;
  const packagingGram = nonNegativeNumber(cfg.PACKAGING_WEIGHT_GRAM);
  if (!apiKey || !/^\d{5}$/.test(originPostal || '') || !couriers || packagingGram === null) {
    console.error('ongkir: konfigurasi environment/config belum lengkap');
    return send(res, 503, { message: 'Cek ongkir belum siap digunakan.' });
  }

  // 2) Validasi input
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return send(res, 400, { message: 'Permintaan tidak valid.' });

  const { productId, qty, destinationPostalCode } = body;
  if (!Object.prototype.hasOwnProperty.call(cfg.PRODUCT_NAME, productId)) {
    return send(res, 400, { message: 'Produk tidak dikenali.' });
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    return send(res, 400, { message: `Jumlah botol harus antara 1 dan ${MAX_QTY}.` });
  }
  if (typeof destinationPostalCode !== 'string' || !/^\d{5}$/.test(destinationPostalCode)) {
    return send(res, 400, { message: 'Kode pos tujuan harus 5 digit angka.' });
  }

  // 3) Berat aktual dari config (bukan dari browser)
  const unitGram = positiveNumber(cfg.PRODUCT_WEIGHT_GRAM[productId]);
  if (!unitGram) {
    console.error(`ongkir: berat produk ${productId} belum diisi di config.js`);
    return send(res, 503, { message: 'Cek ongkir belum siap digunakan.' });
  }
  const items = [
    { name: cfg.PRODUCT_NAME[productId], description: 'Parfum 30 ml', quantity: qty, weight: unitGram }
  ];
  if (packagingGram > 0) {
    items.push({ name: 'Kemasan', description: 'Kemasan pengiriman', quantity: 1, weight: packagingGram });
  }
  const totalGram = unitGram * qty + packagingGram;

  // 4) Panggil Biteship dengan timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let data;
  try {
    const r = await fetch(BITESHIP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey },
      body: JSON.stringify({
        origin_postal_code: Number(originPostal),
        destination_postal_code: Number(destinationPostalCode),
        couriers,
        items
      }),
      signal: controller.signal
    });
    data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('ongkir: Biteship status', r.status, data && data.error);
      return send(res, 502, { message: 'Penyedia ongkir belum merespons dengan benar. Coba lagi nanti.' });
    }
  } catch (err) {
    if (err.name === 'AbortError') return send(res, 504, { message: 'Waktu permintaan habis. Coba lagi.' });
    console.error('ongkir: gagal menghubungi Biteship', err);
    return send(res, 502, { message: 'Tidak dapat menghubungi penyedia ongkir.' });
  } finally {
    clearTimeout(timer);
  }

  // 5) Hanya kembalikan tarif yang benar-benar ada di respons API
  const pricing = Array.isArray(data && data.pricing) ? data.pricing : [];
  const rates = pricing
    .filter(p => p && typeof p.price === 'number')
    .map(p => ({
      courier: p.courier_name || p.company || p.courier_code,
      code: p.courier_code || p.company,
      service: p.courier_service_name || p.service_name || p.courier_service_code,
      price: p.price,
      etd: typeof p.shipment_duration_range === 'string' ? p.shipment_duration_range
         : typeof p.duration === 'string' ? p.duration : null
    }))
    .filter(r => r.courier && r.service);

  return send(res, 200, { weightGram: totalGram, rates });
};
