const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const net = require('node:net');
const scrapr = require('@coflyn/scrapr');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '8kb' }));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi nanti.' }
}));

app.use(express.static(path.join(__dirname, 'public')));

const platforms = {
  tiktok: {
    hosts: ['tiktok.com'],
    methods: [['tiktok', 'snaptik'], ['tiktok', 'tiktokio'], ['tiktok', 'ssstik']]
  },
  instagram: {
    hosts: ['instagram.com'],
    methods: [['instagram', 'direct'], ['instagram', 'indown'], ['instagram', 'snapsave']]
  },
  youtube: {
    hosts: ['youtube.com', 'youtu.be'],
    methods: [['youtube', 'ytmp3'], ['youtube', 'ytmp3gg']]
  },
  twitter: {
    hosts: ['twitter.com', 'x.com'],
    methods: [['twitter', 'direct'], ['twitter', 'tweeload'], ['twitter', 'tvd']]
  },
  facebook: {
    hosts: ['facebook.com', 'fb.watch'],
    methods: [['facebook', 'snapsave'], ['facebook', 'fdown']]
  },
  terabox: {
    hosts: ['terabox.com', '1024tera.com', 'teraboxapp.com', '1024terabox.com'],
    methods: [['terabox', 'sechno']]
  },
  reddit: {
    hosts: ['reddit.com', 'redd.it'],
    methods: [['reddit', 'rapidsave']]
  },
  pinterest: {
    hosts: ['pinterest.com', 'pin.it'],
    methods: [['pinterest', 'direct'], ['pinterest', 'pindown']]
  },
  spotify: {
    hosts: ['spotify.com', 'open.spotify.com'],
    methods: [['spotify', 'spotisaver'], ['spotify', 'spotidown']]
  },
  soundcloud: {
    hosts: ['soundcloud.com'],
    methods: [['soundcloud', 'klickaud']]
  }
};

function detectPlatform(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  if (net.isIP(host)) throw new Error('Alamat IP tidak diizinkan.');

  for (const [name, config] of Object.entries(platforms)) {
    if (config.hosts.some(domain => host === domain || host.endsWith('.' + domain))) {
      return name;
    }
  }

  throw new Error('Platform belum didukung.');
}

function normalize(raw, platform) {
  if (!raw || raw.status === false) {
    throw new Error(raw?.message || 'Scrapr gagal memproses URL.');
  }

  const data = raw.result ?? raw.data ?? raw;
  const entries = Array.isArray(data.downloads)
    ? data.downloads
    : Array.isArray(data.items) ? data.items
    : data.url ? [data] : [];

  const downloads = entries.map((item, index) => ({
    url: item.url ?? item.downloadUrl ?? item.link,
    type: item.type ?? data.type ?? 'file',
    quality: item.quality ?? item.label ?? item.name ?? `Pilihan ${index + 1}`,
    size: item.size ?? null
  })).filter(item => {
    try {
      const u = new URL(item.url);
      return ['https:', 'http:'].includes(u.protocol) &&
        !u.username && !u.password &&
        !net.isIP(u.hostname);
    } catch {
      return false;
    }
  });

  if (!downloads.length) {
    throw new Error('Tidak ditemukan tautan download langsung.');
  }

  return {
    platform,
    title: data.title ?? data.name ?? 'Media tanpa judul',
    thumbnail: data.thumbnail ?? data.thumb ?? data.image ?? null,
    type: data.type ?? 'file',
    downloads
  };
}

let activeJobs = 0;
const MAX_JOBS = 2;

async function withTimeout(promise, ms) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Waktu ekstraksi habis.')), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

app.post('/api/extract', async (req, res) => {
  const input = req.body?.url;

  if (typeof input !== 'string' || input.length > 2048) {
    return res.status(400).json({ error: 'URL tidak valid.' });
  }

  let url;
  let platform;

  try {
    url = new URL(input.trim());

    if (!['http:', 'https:'].includes(url.protocol) ||
        url.username || url.password ||
        url.port && !['80', '443'].includes(url.port)) {
      throw new Error('Format URL tidak diizinkan.');
    }

    platform = detectPlatform(url);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (activeJobs >= MAX_JOBS) {
    return res.status(429).json({ error: 'Server sedang sibuk. Coba lagi.' });
  }

  activeJobs++;

  try {
    const config = platforms[platform];
    const errors = [];

    for (const [namespace, method] of config.methods) {
      const group = scrapr?.[namespace];
      const fn = group?.[method];

      if (typeof fn !== 'function') continue;

      try {
        const raw = await withTimeout(
          Promise.resolve().then(() => fn.call(group, url.href)),
          45000
        );

        const result = normalize(raw, platform);
        return res.json(result);
      } catch (err) {
        errors.push(`${method}: ${err.message}`);
      }
    }

    throw new Error(errors.join(' | ') || 'Metode Scrapr tidak tersedia.');
  } catch (err) {
    console.error('[EXTRACT ERROR]', platform, err.message);
    return res.status(422).json({ error: err.message });
  } finally {
    activeJobs--;
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeJobs, maxJobs: MAX_JOBS });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scrapr Web berjalan di http://127.0.0.1:${PORT}`);
});
