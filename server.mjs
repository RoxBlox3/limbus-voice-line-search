import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'Audio', 'Story');
const DIST_DIR = path.join(__dirname, 'frontend', 'dist');
const PORT = 4173;

const index = JSON.parse(fs.readFileSync(path.join(__dirname, 'index.json'), 'utf8'));

// User-added tags, keyed by character `model` id, layered on top of the
// tags.mjs seed + build-time Arc tags already baked into index.json. Lets
// tags be added live from the browser without a rebuild/restart, and
// persists them to disk so `node build-index.mjs` picks them up too.
const OVERLAY_TAGS_FILE = path.join(__dirname, 'character-tags.json');

function loadOverlayTags() {
  try {
    return JSON.parse(fs.readFileSync(OVERLAY_TAGS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

const overlayTags = loadOverlayTags();
for (const entry of index) {
  if (!entry.model) continue;
  for (const tag of overlayTags[entry.model] || []) {
    if (!entry.tags.includes(tag)) entry.tags.push(tag);
  }
}

function addOverlayTag(model, tag) {
  if (!overlayTags[model]) overlayTags[model] = [];
  if (!overlayTags[model].includes(tag)) {
    overlayTags[model].push(tag);
    fs.writeFileSync(OVERLAY_TAGS_FILE, JSON.stringify(overlayTags, null, 2) + '\n');
  }
  for (const entry of index) {
    if (entry.model === model && !entry.tags.includes(tag)) entry.tags.push(tag);
  }
}

function readJsonBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const AUDIO_MIME = { '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };

const STATIC_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function serveDistFile(res, relPath) {
  const safeRel = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(DIST_DIR, safeRel);
  if (!filePath.startsWith(path.normalize(DIST_DIR) + path.sep) && filePath !== path.normalize(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const contentType = STATIC_MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  serveStatic(res, filePath, contentType);
}

function serveAudio(req, res, relPath, download) {
  const safeRel = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(AUDIO_DIR, safeRel);
  if (!filePath.startsWith(path.normalize(AUDIO_DIR) + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const contentType = AUDIO_MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType, 'Accept-Ranges': 'bytes' };
    if (download) {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
    }

    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      headers['Content-Length'] = end - start + 1;
      res.writeHead(206, headers);
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      headers['Content-Length'] = stat.size;
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
    serveDistFile(res, 'index.html');
    return;
  }

  if (parsed.pathname === '/api/sinners') {
    const counts = new Map();
    for (const entry of index) {
      if (entry.sinner) counts.set(entry.sinner, (counts.get(entry.sinner) || 0) + 1);
    }
    sendJson(
      res,
      200,
      [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    );
    return;
  }

  if (parsed.pathname === '/api/tags' && req.method === 'POST') {
    readJsonBody(req)
      .then((body) => {
        const model = (body.model || '').toString().trim();
        const tag = (body.tag || '').toString().trim();
        if (!model || !tag.includes(': ')) {
          sendJson(res, 400, { error: 'Expected { model, tag: "Category: Value" }' });
          return;
        }
        addOverlayTag(model, tag);
        sendJson(res, 200, { model, tag });
      })
      .catch(() => {
        sendJson(res, 400, { error: 'Invalid request body' });
      });
    return;
  }

  if (parsed.pathname === '/api/tags') {
    const counts = new Map(); // category -> Map(value -> count)
    for (const entry of index) {
      for (const tag of entry.tags) {
        const sep = tag.indexOf(': ');
        if (sep === -1) continue;
        const category = tag.slice(0, sep);
        const value = tag.slice(sep + 2);
        if (!counts.has(category)) counts.set(category, new Map());
        const values = counts.get(category);
        values.set(value, (values.get(value) || 0) + 1);
      }
    }
    const grouped = {};
    for (const [category, values] of counts) {
      grouped[category] = [...values.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
    }
    sendJson(res, 200, grouped);
    return;
  }

  if (parsed.pathname === '/api/search') {
    const q = (parsed.query.q || '').toString().trim().toLowerCase();
    const sinners = (parsed.query.sinner || '')
      .toString()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const tags = (parsed.query.tags || '')
      .toString()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!q && sinners.length === 0 && tags.length === 0) {
      sendJson(res, 200, []);
      return;
    }

    // Group selected tags by category so matching is OR within a category
    // (any selected Canto/Arc matches) and AND across categories (must also
    // match the selected Role, etc).
    const tagsByCategory = new Map();
    for (const tag of tags) {
      const sep = tag.indexOf(': ');
      if (sep === -1) continue;
      const category = tag.slice(0, sep);
      if (!tagsByCategory.has(category)) tagsByCategory.set(category, []);
      tagsByCategory.get(category).push(tag);
    }

    const results = [];
    for (const entry of index) {
      if (q && !entry.content.toLowerCase().includes(q) && !(entry.teller || '').toLowerCase().includes(q)) continue;
      if (sinners.length > 0 && !sinners.includes(entry.sinner)) continue;
      let tagsMatch = true;
      for (const values of tagsByCategory.values()) {
        if (!values.some((v) => entry.tags.includes(v))) {
          tagsMatch = false;
          break;
        }
      }
      if (!tagsMatch) continue;
      results.push(entry);
      if (results.length >= 200) break;
    }
    sendJson(res, 200, results);
    return;
  }

  if (parsed.pathname === '/audio') {
    serveAudio(req, res, (parsed.query.path || '').toString(), parsed.query.download === '1');
    return;
  }

  if (!parsed.pathname.startsWith('/api/')) {
    serveDistFile(res, parsed.pathname);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Voiceline search running at http://localhost:${PORT}`);
});
