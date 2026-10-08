import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';

const {MONGODB_URI, JWT_SECRET, CORS_ORIGIN = 'https://csv-doctor-ihm2.onrender.com', PORT = 3000, BREVO_API_KEY, MAIL_FROM, MAIL_FROM_NAME = 'CSV Doctor', APP_URL = 'https://csv-doctor-ihm2.onrender.com'} = process.env;
if (!MONGODB_URI || !JWT_SECRET || JWT_SECRET.length < 32) { console.error('MONGODB_URI and a 32+ char JWT_SECRET are required'); process.exit(1); }
const MAX_CSV = 2 * 1024 * 1024;
const User = mongoose.model('User', new mongoose.Schema({email: {type: String, unique: true, required: true}, passwordHash: {type: String, required: true}, resetHash: String, resetExp: Date}, {timestamps: true}));
const Run = mongoose.model('Run', new mongoose.Schema({
  userId: {type: mongoose.Schema.Types.ObjectId, index: true, required: true},
  name: {type: String, maxlength: 120, required: true}, delimiter: {type: String, enum: [',', ';', '\t', '|'], required: true},
  options: {type: mongoose.Schema.Types.Mixed, default: {}}, inputRows: Number, outputRows: Number, changeCount: Number,
  log: {type: [mongoose.Schema.Types.Mixed], default: []}, csv: {type: String, required: true}
}, {timestamps: true}));

const app = express();
app.set('trust proxy', 1);
app.use(cors({origin: CORS_ORIGIN}));
app.use(express.json({limit: '3mb'}));
const authLimiter = rateLimit({windowMs: 15 * 60000, limit: 30, standardHeaders: true, legacyHeaders: false, message: {error: 'Too many attempts. Try again later.'}});
const sign = u => jwt.sign({sub: String(u._id)}, JWT_SECRET, {expiresIn: '7d'});
const clean = e => typeof e === 'string' ? e.trim().toLowerCase() : '';
const auth = (req, res, next) => {
  const h = req.get('authorization') || '';
  try { req.uid = jwt.verify(h.replace(/^Bearer /, ''), JWT_SECRET).sub; next(); } catch { res.status(401).json({error: 'Please sign in'}); }
};
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e.name); res.status(500).json({error: 'Server error'}); });
const oid = id => mongoose.isValidObjectId(id);

app.get('/api/health', (_q, res) => res.json({ok: true, db: mongoose.connection.readyState === 1}));
app.post('/api/auth/signup', authLimiter, wrap(async (req, res) => {
  const email = clean(req.body.email), pw = req.body.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({error: 'Enter a valid email'});
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 72) return res.status(400).json({error: 'Password must be 8-72 characters'});
  if (await User.exists({email})) return res.status(409).json({error: 'Email already registered'});
  const u = await User.create({email, passwordHash: await bcrypt.hash(pw, 12)});
  res.status(201).json({token: sign(u), email});
}));
app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
  const email = clean(req.body.email), u = await User.findOne({email});
  const ok = u && typeof req.body.password === 'string' && await bcrypt.compare(req.body.password, u.passwordHash);
  if (!ok) return res.status(401).json({error: 'Wrong email or password'});
  res.json({token: sign(u), email});
}));
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
async function sendMail(to, subject, html) {
  if (!BREVO_API_KEY || !MAIL_FROM) throw new Error('mail not configured');
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {method: 'POST', headers: {'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json'}, body: JSON.stringify({sender: {name: MAIL_FROM_NAME, email: MAIL_FROM}, to: [{email: to}], subject, htmlContent: html})});
  if (!r.ok) throw new Error(`mail failed ${r.status}`);
}
app.post('/api/auth/forgot', authLimiter, wrap(async (req, res) => {
  const email = clean(req.body.email), u = email && await User.findOne({email});
  if (u) {
    const t = crypto.randomBytes(32).toString('hex');
    u.resetHash = sha(t); u.resetExp = new Date(Date.now() + 30 * 60000); await u.save();
    const link = `${APP_URL}/#/reset/${t}`;
    try { await sendMail(email, 'Reset your CSV Doctor password', `<p>Someone asked to reset the password for your CSV Doctor account.</p><p><a href="${link}">Choose a new password</a></p><p>This link works for 30 minutes. If it was not you, ignore this email.</p>`); } catch (e) { console.error('reset mail', e.message); }
  }
  res.json({ok: true});
}));
app.post('/api/auth/reset', authLimiter, wrap(async (req, res) => {
  const t = req.body.token, pw = req.body.password;
  if (typeof t !== 'string' || !/^[a-f0-9]{64}$/.test(t)) return res.status(400).json({error: 'Reset link is invalid or expired'});
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 72) return res.status(400).json({error: 'Password must be 8-72 characters'});
  const u = await User.findOne({resetHash: sha(t), resetExp: {$gt: new Date()}});
  if (!u) return res.status(400).json({error: 'Reset link is invalid or expired'});
  u.passwordHash = await bcrypt.hash(pw, 12); u.resetHash = undefined; u.resetExp = undefined; await u.save();
  res.json({token: sign(u), email: u.email});
}));
app.get('/api/auth/me', auth, wrap(async (req, res) => {
  const u = await User.findById(req.uid); if (!u) return res.status(401).json({error: 'Please sign in'});
  res.json({email: u.email});
}));
app.post('/api/runs', auth, wrap(async (req, res) => {
  const b = req.body, n = v => Number.isInteger(v) && v >= 0 && v <= 1e6;
  if (typeof b.csv !== 'string' || !b.csv || Buffer.byteLength(b.csv) > MAX_CSV) return res.status(400).json({error: 'CSV missing or over 2 MB'});
  if (typeof b.name !== 'string' || !b.name.trim() || ![',', ';', '\t', '|'].includes(b.delimiter) || !n(b.inputRows) || !n(b.outputRows) || !n(b.changeCount)) return res.status(400).json({error: 'Invalid run data'});
  if (await Run.countDocuments({userId: req.uid}) >= 50) return res.status(409).json({error: 'History is full (50 runs). Delete one first.'});
  const o = b.options && typeof b.options === 'object' ? {trimHeaders: !!b.options.trimHeaders, removeBlank: !!b.options.removeBlank, removeDuplicates: !!b.options.removeDuplicates, formulaSafe: !!b.options.formulaSafe, columns: typeof b.options.columns === 'object' ? b.options.columns : {}} : {};
  const log = Array.isArray(b.log) ? b.log.slice(0, 500).map(l => ({action: String(l.action).slice(0, 60), row: Number(l.row) || 0, column: l.column == null ? null : String(l.column).slice(0, 80), before: l.before == null ? null : String(l.before).slice(0, 200), after: l.after == null ? null : String(l.after).slice(0, 200)})) : [];
  const r = await Run.create({userId: req.uid, name: b.name.trim().slice(0, 120), delimiter: b.delimiter, options: o, inputRows: b.inputRows, outputRows: b.outputRows, changeCount: b.changeCount, log, csv: b.csv});
  res.status(201).json({id: r._id, createdAt: r.createdAt});
}));
app.get('/api/runs', auth, wrap(async (req, res) => {
  const runs = await Run.find({userId: req.uid}).select('-csv -log').sort({createdAt: -1}).limit(50).lean();
  res.json({runs});
}));
app.get('/api/runs/:id', auth, wrap(async (req, res) => {
  const r = oid(req.params.id) && await Run.findOne({_id: req.params.id, userId: req.uid}).lean();
  if (!r) return res.status(404).json({error: 'Not found'});
  res.json({run: r});
}));
app.delete('/api/runs/:id', auth, wrap(async (req, res) => {
  const r = oid(req.params.id) && await Run.deleteOne({_id: req.params.id, userId: req.uid});
  if (!r || !r.deletedCount) return res.status(404).json({error: 'Not found'});
  res.json({ok: true});
}));
app.delete('/api/account', auth, wrap(async (req, res) => {
  await Run.deleteMany({userId: req.uid}); await User.deleteOne({_id: req.uid}); res.json({ok: true});
}));
app.use((_q, res) => res.status(404).json({error: 'Not found'}));
mongoose.connect(MONGODB_URI, {dbName: 'csvdoctor'}).then(async () => {
  await Promise.all([User.init(), Run.init()]);
  app.listen(PORT, () => console.log('CSV Doctor API listening'));
}).catch(e => { console.error('DB connection failed:', e.name); process.exit(1); });
