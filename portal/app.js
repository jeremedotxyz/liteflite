import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { basename, extname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readFile, rename, unlink } from 'node:fs/promises';
import { openDatabase, hashPassword, verifyPassword, identifier, digest } from './db.js';

const extensions = new Set(['.glb', '.obj', '.ply', '.stl']);
const publicUser = user => ({ id: user.id, email: user.email, name: user.name, role: user.role });
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const text = (value, max = 160) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const cookieName = 'lf_session';
const lifetime = 12 * 60 * 60 * 1000;

export function createApp({ directory, origin = 'http://127.0.0.1:8787', publicDirectory = resolve('outputs') } = {}) {
  const { db, dir } = openDatabase(directory);
  const app = express();
  app.locals.origin = origin;
  app.locals.db = db;
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: {
    'default-src': ["'self'"], 'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'blob:', 'data:'],
    'connect-src': ["'self'", 'blob:', 'data:'], 'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"], 'frame-ancestors': ["'none'"], 'upgrade-insecure-requests': null
  } } }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('sec-fetch-site') === 'cross-site' || (req.get('origin') && req.get('origin') !== app.locals.origin)) {
        return res.status(403).json({ error: 'This request is not allowed.' });
      }
    }
    next();
  });
  app.use(express.json({ limit: '20kb' }));
  const cookieOptions = () => ({ httpOnly: true, sameSite: 'strict', secure: app.locals.origin.startsWith('https://'), path: '/', maxAge: lifetime });
  const sessionToken = req => {
    const value = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    return value && /^[a-f0-9]{64}$/.test(value) ? value : '';
  };
  const getUser = req => {
    const token = sessionToken(req);
    return token ? db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?').get(digest(token), Date.now()) : null;
  };
  const requireUser = (req, res, next) => {
    req.user = getUser(req);
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    next();
  };
  const requireAdmin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Administrator access required.' });
  const getProject = (id, user) => db.prepare("SELECT p.*, u.name AS client_name FROM projects p JOIN users u ON u.id=p.owner_id WHERE p.id=? AND (?='admin' OR p.owner_id=?)").get(id, user.role, user.id);
  const attempts = new Map();
  const dummyHash = hashPassword(randomBytes(24).toString('hex'));

  app.post('/api/login', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (!validEmail(email) || typeof password !== 'string' || password.length > 256) return res.status(400).json({ error: 'Enter a valid email and password.' });
    const key = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    for (const [k, a] of attempts) if (a.until < now) attempts.delete(k);
    const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    if (attempt.count >= 10) return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
    attempt.count++; attempts.set(key, attempt);
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    const matches = await verifyPassword(password, user?.password_hash || await dummyHash);
    if (!user || !matches) return res.status(401).json({ error: 'The email or password is incorrect.' });
    attempts.delete(key);
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
    const previous = sessionToken(req);
    if (previous) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(previous));
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), user.id, now + lifetime);
    res.cookie(cookieName, token, cookieOptions()).json({ user: publicUser(user) });
  });
  app.get('/api/session', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));
  app.post('/api/logout', requireUser, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(sessionToken(req)));
    res.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined }).json({ ok: true });
  });
  app.post('/api/password', requireUser, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || currentPassword.length > 256 || typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 256) {
      return res.status(400).json({ error: 'Use a new password between 12 and 256 characters.' });
    }
    if (!await verifyPassword(currentPassword, req.user.password_hash)) return res.status(400).json({ error: 'Your current password is incorrect.' });
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(await hashPassword(newPassword), req.user.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.user.id);
    res.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined }).json({ ok: true });
  });
  app.get('/api/clients', requireUser, requireAdmin, (req, res) => {
    res.json({ clients: db.prepare('SELECT id,name,email,role FROM users ORDER BY name').all() });
  });
  app.post('/api/clients', requireUser, requireAdmin, async (req, res) => {
    const { name, email } = req.body || {};
    if (!text(name) || !validEmail(email)) return res.status(400).json({ error: 'Enter a name and valid email address.' });
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email.trim())) return res.status(409).json({ error: 'An account already exists for that email.' });
    const password = randomBytes(15).toString('base64url');
    const id = identifier();
    db.prepare('INSERT INTO users (id,email,name,role,password_hash) VALUES (?,?,?,?,?)').run(id, email.trim().toLowerCase(), name.trim(), 'client', await hashPassword(password));
    res.status(201).json({ user: { id, name: name.trim(), email: email.trim().toLowerCase(), role: 'client' }, temporaryPassword: password });
  });
  app.get('/api/projects', requireUser, (req, res) => {
    const projects = db.prepare("SELECT p.*,u.name AS client_name,(SELECT COUNT(*) FROM files f WHERE f.project_id=p.id) AS file_count FROM projects p JOIN users u ON u.id=p.owner_id WHERE ?='admin' OR p.owner_id=? ORDER BY p.created DESC,p.name").all(req.user.role, req.user.id);
    res.json({ projects });
  });
  app.post('/api/projects', requireUser, requireAdmin, (req, res) => {
    const { name, description = '', ownerId } = req.body || {};
    if (!text(name) || typeof description !== 'string' || description.length > 1000 || !db.prepare('SELECT id FROM users WHERE id=?').get(String(ownerId))) return res.status(400).json({ error: 'Provide a project name and a client.' });
    const id = identifier();
    db.prepare('INSERT INTO projects (id,owner_id,name,description) VALUES (?,?,?,?)').run(id, ownerId, name.trim(), description.trim());
    res.status(201).json({ project: getProject(id, req.user) });
  });
  app.get('/api/projects/:id', requireUser, (req, res) => {
    const project = getProject(req.params.id, req.user);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const files = db.prepare('SELECT id,name,size,units,created FROM files WHERE project_id=? ORDER BY created DESC,name').all(project.id);
    res.json({ project, files });
  });
  const upload = multer({ dest: join(dir, 'incoming'), limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 2 }, fileFilter: (req, file, callback) => {
    callback(extensions.has(extname(file.originalname).toLowerCase()) ? null : new Error('Use GLB, OBJ, PLY, or STL files.'), extensions.has(extname(file.originalname).toLowerCase()));
  } });
  app.post('/api/projects/:id/files', requireUser, requireAdmin, (req, res, next) => {
    req.project = getProject(req.params.id, req.user);
    if (!req.project) return res.status(404).json({ error: 'Project not found.' });
    next();
  }, upload.single('model'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose a model to upload.' });
    const name = basename(req.file.originalname.replaceAll('\\', '/'));
    const units = req.body.units || 'units';
    if (name.length > 180 || !['units', 'm', 'ft'].includes(units) || req.file.size === 0) {
      await unlink(req.file.path); return res.status(400).json({ error: 'Invalid file name, units, or empty file.' });
    }
    if (extname(name).toLowerCase() === '.glb') {
      const bytes = await readFile(req.file.path);
      if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
        await unlink(req.file.path); return res.status(400).json({ error: 'This file is not a valid GLB 2.0 model.' });
      }
    }
    const id = identifier();
    const storageKey = id + extname(name).toLowerCase();
    await rename(req.file.path, join(dir, 'models', storageKey));
    try {
      db.prepare('INSERT INTO files (id,project_id,name,storage_key,size,units) VALUES (?,?,?,?,?,?)').run(id, req.project.id, name, storageKey, req.file.size, units);
    } catch (error) { await unlink(join(dir, 'models', storageKey)); throw error; }
    res.status(201).json({ file: { id, name, size: req.file.size, units } });
  });
  app.get('/api/files/:id/content', requireUser, (req, res) => {
    const file = db.prepare("SELECT f.* FROM files f JOIN projects p ON p.id=f.project_id WHERE f.id=? AND (?='admin' OR p.owner_id=?)").get(req.params.id, req.user.role, req.user.id);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    res.set('Content-Type', 'application/octet-stream');
    if (req.query.download) res.attachment(file.name);
    res.sendFile(join(dir, 'models', file.storage_key), { cacheControl: false });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.get(['/portal', '/portal/', '/portal/index.html'], (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!getUser(req)) return res.redirect('/portal/login.html');
    res.sendFile(join(publicDirectory, 'portal/index.html'));
  });
  app.use('/portal', express.static(join(publicDirectory, 'portal'), { index: false }));
  app.get('/', (req, res) => res.sendFile(join(publicDirectory, 'index.html')));
  const publicFiles = new Set(['index.html','lite-flite-working.html','about.html','services.html','lite-flite-logo.png','disaster.mp4','disaster-poster.jpg']);
  app.use((req, res) => {
    const name = req.path.slice(1);
    if (publicFiles.has(name)) return res.sendFile(join(publicDirectory, name));
    res.status(404).type('text').send('Not found');
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Models must be under 100 MB.' : 'Choose one model file.' });
    if (error.message === 'Use GLB, OBJ, PLY, or STL files.') return res.status(400).json({ error: error.message });
    if (error.type === 'entity.too.large' || error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
    console.error('Portal request failed:', error.message);
    res.status(500).json({ error: 'The request could not be completed. Please try again.' });
  });
  return app;
}
