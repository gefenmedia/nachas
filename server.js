// Nachas beta — tiny zero-dependency server
// Serves the static app (dist/) and collects activity events in real time:
//   POST /api/track   — append event(s) { event | events[] } (deduped by id)
//   GET  /api/events  — full event log as JSON
const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const PORT = process.env.PORT || 3000
const DIST = path.join(__dirname, 'dist')
const DATA_DIR = path.join(__dirname, 'data')
const EVENTS_FILE = path.join(DATA_DIR, 'events.json')
const MAX_EVENTS = 50000

// --- App data collections (id-keyed JSON stores) ---
const COLLECTIONS = ['users', 'charities', 'challenges', 'checkins', 'donations', 'comments', 'follows']
const MAX_PER_COLLECTION = 20000
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json')

function collectionFile(name) {
  return path.join(DATA_DIR, `${name}.json`)
}

function readCollection(name) {
  try {
    return JSON.parse(fs.readFileSync(collectionFile(name), 'utf8'))
  } catch {
    return {}
  }
}

function writeCollection(name, obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = collectionFile(name) + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(obj))
  fs.renameSync(tmp, collectionFile(name))
}

function upsertRecord(name, record) {
  if (!record || !record.id) return false
  const all = readCollection(name)
  // never store plaintext passwords — hash on ingest
  if (name === 'users') {
    if (record.password) {
      const salt = crypto.randomBytes(16).toString('hex')
      record.passHash = hashPassword(record.password, salt)
      record.salt = salt
      delete record.password
    }
    const existing = all[record.id]
    if (existing) {
      // don't let a sanitized client copy wipe server-side credentials
      if (!record.passHash && existing.passHash) { record.passHash = existing.passHash; record.salt = existing.salt }
    }
  }
  all[record.id] = { ...record, serverUpdatedAt: new Date().toISOString() }
  const keys = Object.keys(all)
  if (keys.length > MAX_PER_COLLECTION) {
    keys
      .sort((a, b) => String(all[a].serverUpdatedAt).localeCompare(String(all[b].serverUpdatedAt)))
      .slice(0, keys.length - MAX_PER_COLLECTION)
      .forEach(k => delete all[k])
  }
  writeCollection(name, all)
  return true
}

function sanitizeUser(u) {
  if (!u) return u
  const { password, passHash, salt, serverUpdatedAt, ...rest } = u
  return rest
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 32).toString('hex')
}

function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function issueToken(userId) {
  const tokens = readTokens()
  const token = crypto.randomBytes(24).toString('hex')
  tokens[token] = { userId, createdAt: new Date().toISOString() }
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = TOKENS_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(tokens))
  fs.renameSync(tmp, TOKENS_FILE)
  return token
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
}

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'))
  } catch {
    return []
  }
}

function writeEvents(events) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = EVENTS_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(events))
  fs.renameSync(tmp, EVENTS_FILE)
}

function addEvents(incoming) {
  const list = Array.isArray(incoming) ? incoming : [incoming]
  const events = readEvents()
  const seen = new Set(events.map(e => e.id))
  let added = 0
  for (const e of list) {
    if (!e || !e.id || !e.type || !e.ts || seen.has(e.id)) continue
    seen.add(e.id)
    events.push(e)
    added++
  }
  if (added > 0) {
    events.sort((a, b) => String(a.ts).localeCompare(String(b.ts)))
    writeEvents(events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events)
  }
  return added
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 5_000_000) req.destroy() // 5MB guard
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function sendJson(res, status, obj) {
  const payload = JSON.stringify(obj)
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(payload)
}

function serveStatic(req, res, urlPath) {
  let filePath = path.normalize(path.join(DIST, decodeURIComponent(urlPath)))
  if (!filePath.startsWith(DIST)) { res.writeHead(403); res.end(); return }

  // directory (or extension-less page) -> index.html inside it
  if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html')
  else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html')

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end('<h1 style="font-family:sans-serif;text-align:center;margin-top:4rem">Not found</h1>')
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' }
    if (urlPath.startsWith('/_next/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    res.writeHead(200, headers)
    res.end(content)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const p = url.pathname

  if (p === '/api/events' && req.method === 'GET') {
    sendJson(res, 200, { events: readEvents() })
    return
  }

  if (p === '/api/track' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const parsed = JSON.parse(body || '{}')
      const incoming = parsed.events || parsed.event || (parsed.id ? parsed : null)
      if (!incoming) { sendJson(res, 400, { error: 'no events' }); return }
      const added = addEvents(incoming)
      sendJson(res, 200, { ok: true, added })
    } catch {
      sendJson(res, 400, { error: 'bad json' })
    }
    return
  }

  // --- Auth ---
  if (p === '/api/auth/signup' && req.method === 'POST') {
    try {
      const { name, email, password } = JSON.parse((await readBody(req)) || '{}')
      if (!name || !email || !password) { sendJson(res, 400, { error: 'name, email and password required' }); return }
      const users = readCollection('users')
      if (Object.values(users).find(u => u.email === email)) { sendJson(res, 409, { error: 'Email already registered' }); return }
      const user = {
        id: crypto.randomBytes(8).toString('hex'),
        name, email,
        notificationTime: '20:00', timezone: 'America/New_York',
        createdAt: new Date().toISOString(),
      }
      const salt = crypto.randomBytes(16).toString('hex')
      user.salt = salt
      user.passHash = hashPassword(password, salt)
      upsertRecord('users', user)
      sendJson(res, 200, { user: sanitizeUser(user), token: issueToken(user.id) })
    } catch {
      sendJson(res, 400, { error: 'bad json' })
    }
    return
  }

  if (p === '/api/auth/login' && req.method === 'POST') {
    try {
      const { email, password } = JSON.parse((await readBody(req)) || '{}')
      const users = readCollection('users')
      const user = Object.values(users).find(u => u.email === email)
      if (!user || !user.passHash || hashPassword(password || '', user.salt) !== user.passHash) {
        sendJson(res, 401, { error: 'Invalid email or password' })
        return
      }
      sendJson(res, 200, { user: sanitizeUser(user), token: issueToken(user.id) })
    } catch {
      sendJson(res, 400, { error: 'bad json' })
    }
    return
  }

  // --- App data: full state + granular mutations ---
  if (p === '/api/state' && req.method === 'GET') {
    const state = {}
    for (const name of COLLECTIONS) {
      let records = Object.values(readCollection(name))
      if (name === 'users') records = records.map(sanitizeUser)
      state[name] = records
    }
    sendJson(res, 200, state)
    return
  }

  if (p === '/api/state' && req.method === 'POST') {
    // bulk merge (used once per client to publish its local/seed data to an empty server)
    try {
      const { collections } = JSON.parse((await readBody(req)) || '{}')
      if (!collections || typeof collections !== 'object') { sendJson(res, 400, { error: 'collections required' }); return }
      let added = 0
      for (const name of COLLECTIONS) {
        const records = Array.isArray(collections[name]) ? collections[name] : []
        for (const record of records) if (upsertRecord(name, record)) added++
      }
      sendJson(res, 200, { ok: true, added })
    } catch {
      sendJson(res, 400, { error: 'bad json' })
    }
    return
  }

  if (p === '/api/mutate' && req.method === 'POST') {
    try {
      const { collection, record } = JSON.parse((await readBody(req)) || '{}')
      if (!COLLECTIONS.includes(collection) || !record || !record.id) { sendJson(res, 400, { error: 'bad mutation' }); return }
      upsertRecord(collection, record)
      sendJson(res, 200, { ok: true })
    } catch {
      sendJson(res, 400, { error: 'bad json' })
    }
    return
  }

  if (p.startsWith('/api/') && req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    res.end()
    return
  }

  if (p.startsWith('/api/')) { sendJson(res, 404, { error: 'unknown endpoint' }); return }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, p === '/' ? '/index.html' : p)
    return
  }

  res.writeHead(405); res.end()
})

server.listen(PORT, () => console.log(`nachas listening on :${PORT}`))
