const express = require('express');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let zxingInstancePromise = null;
const getZXing = async () => {
  if (!zxingInstancePromise) {
    zxingInstancePromise = (async () => {
      const { createZXing } = await import('@sec-ant/zxing-wasm');
      return createZXing();
    })();
  }
  return zxingInstancePromise;
};

app.post('/decode', async (req, res) => {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const buffer = Buffer.from(imageBase64, 'base64');
    const image = sharp(buffer);
    const { width, height } = await image.metadata();
    if (!width || !height) return res.status(400).json({ error: 'invalid image' });

    // Get raw RGBA pixels
    const raw = await image.ensureAlpha().raw().toBuffer();

    const z = await getZXing();
    const results = await z.readBarcodesFromImageBuffer(raw, width, height, {
      // RGBA order
      bytesPerPixel: 4,
      tryHarder: true,
    });

    const barcodes = (results || []).map(r => ({
      type: r.format || 'UNKNOWN',
      data: r.text || ''
    }));
    return res.json({ barcodes });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/save-json', async (req, res) => {
  try {
    let container;
    if (Array.isArray(req.body)) {
      container = { flightTicketScan: req.body };
    } else if (req.body && Array.isArray(req.body.flightTicketScan)) {
      container = { flightTicketScan: req.body.flightTicketScan };
    } else {
      return res.status(400).json({ error: 'Body must be an array or { flightTicketScan: [...] }' });
    }

    const outDir = path.resolve(__dirname, '..', 'scanresults');
    await fs.promises.mkdir(outDir, { recursive: true });

    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fname = `flugtickets-${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}-${pad(ts.getSeconds())}.json`;
    const outPath = path.join(outDir, fname);

    await fs.promises.writeFile(outPath, JSON.stringify(container, null, 2), 'utf8');

    return res.json({ ok: true, path: outPath });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log('Decoder listening on :' + PORT));


