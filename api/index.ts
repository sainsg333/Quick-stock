import express, { type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { createHash, timingSafeEqual } from 'node:crypto';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });

let clientPromise: Promise<MongoClient> | undefined;
async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not configured');
  if (!clientPromise) {
    clientPromise = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 6000 }).connect().catch(err => { clientPromise = undefined; throw err; });
  }
  return (await clientPromise).db(process.env.MONGODB_DB || 'quickstocks');
}
const secret = () => {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return new TextEncoder().encode(process.env.SESSION_SECRET);
};
const cookieName = 'qs_session';
const secure = () => process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: secure(), path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
function getCookie(req: Request): string | undefined {
  return req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
}
async function isAuthenticated(req: Request): Promise<boolean> {
  try {
    const token = getCookie(req);
    if (!token) return false;
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return payload.sub === 'owner';
  } catch { return false; }
}
async function issueSession(res: Response) {
  const jwt = await new SignJWT({ role: 'owner' }).setProtectedHeader({ alg: 'HS256' }).setSubject('owner').setIssuedAt().setExpirationTime('7d').sign(secret());
  res.cookie(cookieName, jwt, cookieOptions);
}
const safe = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res, next)).catch(next); };
const owner = safe(async (req, res, next) => { if (!(await isAuthenticated(req))) { res.status(401).json({ error: 'Sign in to continue' }); return; } next(); });
const passwordSchema = z.object({ password: z.string().min(6).max(128) }).strict();
const setupSchema = z.object({ password: z.string().min(12).max(128), setupToken: z.string().min(24).max(256) }).strict();
class ClientError extends Error { constructor(message: string, readonly status: number = 422) { super(message); } }
function verifySetupToken(provided: string): boolean {
  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < 24) throw new ClientError('SETUP_TOKEN must be configured with at least 24 characters before initial setup.', 503);
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
const commonTags = z.array(z.string().trim().min(1).max(40)).max(20).default([]);
const str = (max = 500) => z.string().trim().max(max).default('');
const maybeNumber = z.number().finite().nullable().default(null);
const percentage = z.number().finite().min(0).max(100).nullable().default(null);
const nonnegative = z.number().finite().min(0).nullable().default(null);
const optionalDate = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default('');
const symbol = z.string().trim().toUpperCase().regex(/^[A-Z0-9&._-]{1,24}$/, 'Enter a valid ticker symbol');
const schemas = {
  stocks: z.object({
    symbol, name: z.string().trim().min(1).max(120), sector: str(80), industry: str(100),
    exchange: z.enum(['NSE','BSE','OTHER']).default('NSE'),
    cap: z.enum(['large','mid','small','micro','unknown']).default('unknown'),
    trend: z.enum(['bullish','bearish','sideways','unknown']).default('unknown'),
    status: z.enum(['watch','active','paused','archived']).default('watch'),
    lastPrice: nonnegative, changePct: maybeNumber, rvol: nonnegative, rsi: percentage, observedAt: optionalDate,
    notes: str(5000), tags: commonTags
  }).strict(),
  strategies: z.object({
    name: z.string().trim().min(2).max(120), style: z.enum(['intraday','swing','short-term','long-term']).default('swing'),
    direction: z.enum(['long','short','both']).default('long'),
    timeframe: str(60), regime: z.enum(['bullish','bearish','sideways','any']).default('any'),
    stockType: str(100), setup: str(2000), entryRules: str(5000), exitRules: str(5000),
    riskRules: str(3000), evidence: z.enum(['idea','backtest','paper','live']).default('idea'),
    sampleSize: z.number().int().min(0).max(10000000).default(0),
    outOfSample: z.boolean().default(false),
    status: z.enum(['active','testing','archived']).default('testing'),
    notes: str(5000), tags: commonTags
  }).strict(),
  matches: z.object({
    symbol, strategyId: z.string().trim().min(1).max(100),
    timeframe: str(60), regime: z.enum(['bullish','bearish','sideways','any']).default('any'),
    source: z.enum(['hypothesis','backtest','paper','live']).default('hypothesis'),
    sampleSize: z.number().int().min(0).max(10000000).default(0), outOfSample: z.boolean().default(false),
    winRate: percentage, avgReturnPct: maybeNumber, maxDrawdownPct: percentage,
    verdict: z.enum(['untested','working','mixed','failing']).default('untested'),
    notes: str(5000), tags: commonTags
  }).strict(),
  watchlists: z.object({
    name: z.string().trim().min(2).max(120), description: str(500),
    symbols: z.array(symbol).max(300).default([]),
    focus: z.enum(['momentum','breakout','relative-strength','volume','reversal','custom']).default('custom'),
    notes: str(3000), tags: commonTags
  }).strict(),
  trades: z.object({
    symbol, strategyId: z.string().trim().min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    direction: z.enum(['long','short']).default('long'),
    source: z.enum(['backtest','paper','live']).default('backtest'),
    regime: z.enum(['bullish','bearish','sideways','unknown']).default('unknown'),
    netReturnPct: z.number().finite().min(-100).max(100000),
    rMultiple: maybeNumber, notes: str(3000)
  }).strict(),
  journal: z.object({
    title: z.string().trim().min(2).max(180),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    symbol: str(24), strategyId: str(100),
    category: z.enum(['discovery','observation','review','failure','lesson']).default('observation'),
    regime: z.enum(['bullish','bearish','sideways','unknown']).default('unknown'),
    screenshotUrl: z.union([z.literal(''), z.string().url().max(1000).refine(url => /^https?:\/\//i.test(url), 'Use an http or https URL')]).default(''),
    notes: z.string().trim().min(1).max(10000), tags: commonTags
  }).strict()
} as const;
type CollectionName = keyof typeof schemas;
const names = Object.keys(schemas) as CollectionName[];
function collectionName(input: string): input is CollectionName { return names.includes(input as CollectionName); }
function parseBody(name: CollectionName, body: unknown) { return schemas[name].parse(body); }
function serialize(doc: Record<string, unknown>) { const { _id, ...rest } = doc; return { ...rest, id: String(_id) }; }
async function validateLinks(database: Db, name: CollectionName, input: Record<string, unknown>) {
  if (name === 'matches' || name === 'trades' || (name === 'journal' && input.strategyId)) {
    const id = String(input.strategyId || '');
    if (!ObjectId.isValid(id) || !(await database.collection('strategies').findOne({ _id: new ObjectId(id) }, { projection: { _id: 1 } }))) {
      throw new ClientError('Select an existing strategy before saving. The referenced strategy was not found.');
    }
  }
  if (name === 'matches' || name === 'trades') {
    const stock = await database.collection('stocks').findOne({ symbol: input.symbol }, { projection: { _id: 1 } });
    if (!stock) throw new ClientError('Add this ticker to Stock Universe before adding a strategy match or trade result.');
  }
}
async function protectStockIdentity(database: Db, current: Record<string, unknown>) {
  const ticker = current.symbol;
  for (const name of ['matches', 'trades', 'journal']) {
    if (await database.collection(name).findOne({ symbol: ticker }, { projection: { _id: 1 } }))
      throw new ClientError('This stock is referenced in ' + name + '. Update or remove those records first.', 409);
  }
  if (await database.collection('watchlists').findOne({ symbols: ticker }, { projection: { _id: 1 } }))
    throw new ClientError('This stock is in a watchlist. Remove its ticker from watchlists first.', 409);
}
async function guardWrite(database: Db, name: CollectionName, input: Record<string, unknown>, id?: ObjectId) {
  await validateLinks(database, name, input);
  if (name !== 'stocks') return;
  const duplicate = await database.collection('stocks').findOne({
    symbol: input.symbol, exchange: input.exchange, ...(id ? { _id: { $ne: id } } : {})
  }, { projection: { _id: 1 } });
  if (duplicate) throw new ClientError('A stock with this ticker and exchange already exists.', 409);
  if (id) {
    const previous = await database.collection('stocks').findOne({ _id: id });
    if (previous && previous.symbol !== input.symbol) await protectStockIdentity(database, previous);
  }
}

app.get('/api/health', (_req, res) => { res.json({ ok: true, service: 'QuickStocks API' }); });
app.get('/api/auth/status', safe(async (req, res) => {
  const database = await db();
  const configured = Boolean(await database.collection('users').findOne({ _id: 'owner' as never }, { projection: { _id: 1 } }));
  res.json({ configured, authenticated: configured && await isAuthenticated(req) });
}));
app.post('/api/auth/setup', safe(async (req, res) => {
  const { password, setupToken } = setupSchema.parse(req.body);
  secret();
  if (!verifySetupToken(setupToken)) { res.status(403).json({ error: 'Invalid setup token.' }); return; }
  const database = await db();
  const hash = await bcrypt.hash(password, 12);
  try { await database.collection('users').insertOne({ _id: 'owner' as never, passwordHash: hash, createdAt: new Date(), failedAttempts: 0 }); }
  catch (e) { if ((e as { code?: number }).code === 11000) { res.status(409).json({ error: 'Setup is already complete. Please sign in.' }); return; } throw e; }
  await issueSession(res);
  res.status(201).json({ ok: true });
}));
app.post('/api/auth/login', safe(async (req, res) => {
  const { password } = passwordSchema.parse(req.body);
  const database = await db();
  const user = await database.collection('users').findOne({ _id: 'owner' as never });
  if (!user) { res.status(404).json({ error: 'Please create your account first' }); return; }
  if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) { res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' }); return; }
  if (!(await bcrypt.compare(password, String(user.passwordHash)))) {
    const failed = Number(user.failedAttempts ?? 0) + 1;
    await database.collection('users').updateOne({ _id: 'owner' as never }, { $set: { failedAttempts: failed >= 6 ? 0 : failed, lockUntil: failed >= 6 ? new Date(Date.now() + 15 * 60_000) : null } });
    res.status(401).json({ error: 'Incorrect password' }); return;
  }
  await database.collection('users').updateOne({ _id: 'owner' as never }, { $set: { failedAttempts: 0, lockUntil: null } });
  await issueSession(res);
  res.json({ ok: true });
}));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie(cookieName, { path: '/', httpOnly: true, sameSite: 'strict', secure: secure() }); res.json({ ok: true }); });

app.use('/api/data', owner);
app.get('/api/data/:name', safe(async (req, res) => {
  if (!collectionName(req.params.name)) { res.status(404).json({ error: 'Unknown collection' }); return; }
  const database = await db();
  const parsedLimit = Number(req.query.limit);
  const parsedPage = Number(req.query.page);
  if ((req.query.limit !== undefined && (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1)) ||
      (req.query.page !== undefined && (!Number.isSafeInteger(parsedPage) || parsedPage < 1))) {
    throw new ClientError('Page and limit must be positive integers.', 400);
  }
  const limit = Math.min(req.query.limit === undefined ? 500 : parsedLimit, 1000);
  const page = req.query.page === undefined ? 1 : parsedPage;
  if ((page - 1) * limit > 1_000_000) throw new ClientError('Requested page is too deep.', 400);
  const coll = database.collection(req.params.name);
  const [docs, total] = await Promise.all([
    coll.find({}).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    coll.countDocuments()
  ]);
  res.json({ items: docs.map(d => serialize(d)), total, page, limit });
}));
app.get('/api/data/:name/:id', safe(async (req, res) => {
  if (!collectionName(req.params.name) || !ObjectId.isValid(req.params.id)) { res.status(404).json({ error: 'Not found' }); return; }
  const result = await (await db()).collection(req.params.name).findOne({ _id: new ObjectId(req.params.id) });
  if (!result) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(serialize(result));
}));
app.post('/api/data/:name', safe(async (req, res) => {
  if (!collectionName(req.params.name)) { res.status(404).json({ error: 'Unknown collection' }); return; }
  const body = parseBody(req.params.name, req.body);
  const database = await db();
  await guardWrite(database, req.params.name, body as Record<string, unknown>);
  const now = new Date();
  const result = await database.collection(req.params.name).insertOne({ ...body, createdAt: now, updatedAt: now });
  res.status(201).json({ ...body, id: String(result.insertedId), createdAt: now, updatedAt: now });
}));
app.put('/api/data/:name/:id', safe(async (req, res) => {
  if (!collectionName(req.params.name) || !ObjectId.isValid(req.params.id)) { res.status(404).json({ error: 'Not found' }); return; }
  const body = parseBody(req.params.name, req.body);
  const database = await db();
  const id = new ObjectId(req.params.id);
  await guardWrite(database, req.params.name, body as Record<string, unknown>, id);
  const result = await database.collection(req.params.name).updateOne({ _id: id }, { $set: { ...body, updatedAt: new Date() } });
  if (!result.matchedCount) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ok: true });
}));
app.delete('/api/data/:name/:id', safe(async (req, res) => {
  if (!collectionName(req.params.name) || !ObjectId.isValid(req.params.id)) { res.status(404).json({ error: 'Not found' }); return; }
  const database = await db();
  const id = new ObjectId(req.params.id);
  if (req.params.name === 'strategies') {
    for (const related of ['matches', 'trades', 'journal']) {
      if (await database.collection(related).findOne({ strategyId: req.params.id }, { projection: { _id: 1 } })) {
        throw new ClientError('This strategy is referenced by ' + related + '. Remove or reassign those records first.', 409);
      }
    }
  }
  if (req.params.name === 'stocks') {
    const existing = await database.collection('stocks').findOne({ _id: id });
    if (existing) await protectStockIdentity(database, existing);
  }
  const result = await database.collection(req.params.name).deleteOne({ _id: id });
  if (!result.deletedCount) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ok: true });
}));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ClientError) { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: err.issues.map(x => x.path.join('.') + ': ' + x.message).join('; ') }); return; }
  if ((err as { code?: number })?.code === 11000) { res.status(409).json({ error: 'This record already exists' }); return; }
  console.error('QuickStocks API request error', err instanceof Error ? err.message : err);
  res.status(500).json({ error: 'Request could not be completed. Check server configuration or try again.' });
});
export default app;
