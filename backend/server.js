const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DEEZER_API_URL = 'https://api.deezer.com';
const CACHE_TTL_MS = 60 * 1000;
const responseCache = new Map();
const cacheStats = { hits: 0, misses: 0 };

const cleanupExpiredCache = () => {
  const now = Date.now();
  for (const [key, cached] of responseCache) {
    if (cached.expiresAt <= now) responseCache.delete(key);
  }
};

const cacheCleanupTimer = setInterval(cleanupExpiredCache, CACHE_TTL_MS);
if (typeof cacheCleanupTimer.unref === 'function') cacheCleanupTimer.unref();

app.disable('x-powered-by');

app.get('/api/health', (_req, res) => {
  cleanupExpiredCache();
  res.json({
    status: 'ok',
    service: 'deezer-music-player',
    cacheSize: responseCache.size,
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses,
  });
});

app.use('/api/deezer', async (req, res) => {
  const endpoint = req.url.replace(/^\/+/, '').split('?')[0].replace(/\/$/, '');
  const first = endpoint.split('/')[0];
  const allowed =
    ['search', 'chart'].includes(first) ||
    ((first === 'album' || first === 'artist') && /^\/?\d+/.test(endpoint.slice(first.length)));

  if (!allowed || !/^[A-Za-z0-9\/_-]+$/.test(endpoint)) {
    return res.status(400).json({ error: 'Endpoint Deezer ไม่ได้รับอนุญาต', code: 'INVALID_ENDPOINT' });
  }

  const deezerUrl = new URL(endpoint || '', `${DEEZER_API_URL}/`);

  for (const [key, value] of Object.entries(req.query)) {
    if (!/^[A-Za-z0-9_-]+$/.test(key)) continue;
    deezerUrl.searchParams.set(key, Array.isArray(value) ? value[0] : String(value));
  }

  if (deezerUrl.searchParams.has('limit')) {
    const limit = Math.max(1, Math.min(100, Number(deezerUrl.searchParams.get('limit')) || 50));
    deezerUrl.searchParams.set('limit', String(limit));
  }
  if (deezerUrl.searchParams.has('index')) {
    const index = Math.max(0, Math.min(1000, Number(deezerUrl.searchParams.get('index')) || 0));
    deezerUrl.searchParams.set('index', String(index));
  }

  try {
    cleanupExpiredCache();
    const cacheKey = deezerUrl.toString();
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      cacheStats.hits += 1;
      res.set('X-Cache', 'HIT');
      return res.json(cached.body);
    }
    if (cached) responseCache.delete(cacheKey);

    const response = await fetch(deezerUrl.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Deezer API returned ${response.status}`);

    const data = await response.json();
    const normalized = Array.isArray(data.data)
      ? { data: data.data, total: data.total ?? data.data.length }
      : data;

    responseCache.set(cacheKey, { body: normalized, expiresAt: Date.now() + CACHE_TTL_MS });
    cacheStats.misses += 1;
    res.set('X-Cache', 'MISS');
    res.json(normalized);
  } catch (error) {
    console.error('Deezer proxy error:', error.message);
    res.status(502).json({
      error: 'ไม่สามารถเชื่อมต่อ Deezer API ได้',
      code: 'UPSTREAM_ERROR',
    });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'ไม่พบ API endpoint ที่ร้องขอ', code: 'API_NOT_FOUND' });
});

const distDirectory = path.join(__dirname, '..', 'frontend', 'dist');
const staticDirectory = fs.existsSync(distDirectory)
  ? distDirectory
  : path.join(__dirname);

app.use(express.static(staticDirectory, {
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

app.get('/', (_req, res) => {
  res.sendFile(path.join(staticDirectory, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Music player running at http://localhost:${PORT}`);
  });
}

module.exports = app;
