
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { getPool } from './db.js';
import { SEED_TYPES, BASE_TYPES, ADV_TYPES, isAdv } from './utils.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const PURCHASE_BASE_PRICE = parseInt(process.env.PURCHASE_BASE_PRICE || '2',10);
const PURCHASE_ADV_PRICE  = parseInt(process.env.PURCHASE_ADV_PRICE  || '5',10);
const SALE_BASE_PRICE     = parseInt(process.env.SALE_BASE_PRICE     || '4',10);
const SALE_ADV_PRICE      = parseInt(process.env.SALE_ADV_PRICE      || '10',10);
const GARDEN_SLOTS        = parseInt(process.env.GARDEN_SLOTS || '6',10);
const GROWTH_MINUTES      = parseInt(process.env.GROWTH_MINUTES || '10',10);

// Swagger
let openapi;
try {
  const openapiFileUrl = new URL('../openapi.yaml', import.meta.url);
  const openapiPath = fileURLToPath(openapiFileUrl);
  const openapiRaw = fs.readFileSync(openapiPath, 'utf-8');
  openapi = YAML.parse(openapiRaw);
} catch (error) {
  console.error('Failed to load OpenAPI specification:', error);
}
if (openapi) {
  app.get('/api/docs/openapi.json', (_req, res) => {
    res.json(openapi);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(null, {
      swaggerOptions: {
        url: '/api/docs/openapi.json'
      }
    })
  );
}

app.use(helmet());

// Helpers
function signToken(user){
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req,res,next){
  const auth = req.headers.authorization || '';
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch(e){
    return res.status(401).json({ error: 'unauthorized' });
  }
}

// Validators
const emailValidator = body('email').isEmail().withMessage('Ошибка валидации');
const passwordValidator = body('password')
  .isLength({ min:6, max:20 }).withMessage('Ошибка валидации')
  .matches(/^(?=.*\d)[A-Za-z\d]{6,20}$/).withMessage('Ошибка валидации');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Поддержка текста из задачи: либо пусто, либо «Ошибка валидации»
    return res.status(400).json({ error: 'Ошибка валидации' });
  }
}

// Auth
app.post('/api/auth/register',[
  emailValidator,
  passwordValidator
], async (req,res)=>{
if (req.body.email === '' || req.body.password === '') {
  return res.status(400).json({ error: 'Не заполнено поле' });
}
  const err = handleValidation(req,res); if (err) return;
  const { email, password } = req.body;
  const pool = await getPool();
  const [exists] = await pool.query('SELECT id FROM users WHERE email=?',[email]);
  if (exists.length) return res.status(400).json({ error: 'Ошибка валидации' });
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query('INSERT INTO users (email, password_hash) VALUES (?,?)',[email, hash]);
  const userId = result.insertId;
  await pool.query('INSERT INTO profiles (user_id) VALUES (?)',[userId]);
  for (let i=1;i<=GARDEN_SLOTS;i++){
    await pool.query('INSERT INTO plots (user_id, slot) VALUES (?,?)',[userId, i]);
  }
  const token = signToken({ id: userId, email });
  // Возвращаем токен, но фронт сам решит логиниться или нет
  res.json({ token, message: 'Регистрация произошла успешно' });
});

app.post('/api/auth/login',[
  emailValidator,
  body('password').isString().withMessage('Ошибка валидации')
], async (req,res)=>{
  if (req.body.email==='' || req.body.password==='')
    return res.status(400).json({ error: 'Не заполнено поле' });
  const err = handleValidation(req,res); if (err) return;
  const { email, password } = req.body;
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE email=?',[email]);
  if (!rows.length) return res.status(400).json({ error: 'Ошибка валидации' });
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'Ошибка валидации' });
  const token = signToken(user);
  res.json({ token });
});

// Profile
app.get('/api/profile', auth, async (req,res)=>{
  const pool = await getPool();
  const [[p]] = await pool.query('SELECT * FROM profiles WHERE user_id=?',[req.user.id]);
  let level = (p.sold_count>=50)?2:1;
  res.json({
    isCoolFarmer: !!p.is_cool,
    firstName: p.first_name,
    lastName: p.last_name,
    middleName: p.middle_name,
    nickname: p.nickname,
    passport: p.passport,
    level,
    soldCount: p.sold_count,
    balance: p.balance
  });
});

// Profile validation (русские буквы для ФИО, англ. для никнейма, паспорт ровно 6 цифр)
app.put('/api/profile', auth, async (req,res)=>{
  const { isCoolFarmer, firstName, lastName, middleName, nickname, passport } = req.body || {};

  const isEmpty = (v)=> v===undefined || v===null || v==='';
  if (isCoolFarmer===undefined) return res.status(400).json({ error:'Не заполнено поле' });

  if (isCoolFarmer){
    if (isEmpty(nickname) || isEmpty(passport))
      return res.status(400).json({ error:'Не заполнено поле' });
    if (!/^[A-Za-z]{2,15}$/.test(nickname)) return res.status(400).json({ error:'Ошибка валидации' });
    if (!/^\d{6}$/.test(passport)) return res.status(400).json({ error:'Ошибка валидации' });
  } else {
    if (isEmpty(firstName) || isEmpty(lastName) || isEmpty(middleName))
      return res.status(400).json({ error:'Не заполнено поле' });
    const ru = /^[А-ЯЁа-яё\-\s]{2,40}$/;
    if (!ru.test(firstName) || !ru.test(lastName) || !ru.test(middleName))
      return res.status(400).json({ error:'Ошибка валидации' });
  }

  const pool = await getPool();
  await pool.query(`UPDATE profiles SET
    is_cool=?,
    first_name=?,
    last_name=?,
    middle_name=?,
    nickname=?,
    passport=?
    WHERE user_id=?`, [
      isCoolFarmer?1:0,
      isCoolFarmer?null:firstName || null,
      isCoolFarmer?null:lastName || null,
      isCoolFarmer?null:middleName || null,
      isCoolFarmer?nickname || null:null,
      isCoolFarmer?passport || null:null,
      req.user.id
    ]);
  res.json({ ok:true, message:'Данные сохранены' });
});

// Shop
app.get('/api/shop/prices', auth, async (req,res)=>{
  res.json({
    purchase: { basePrice: PURCHASE_BASE_PRICE, advPrice: PURCHASE_ADV_PRICE },
    sale: { basePrice: SALE_BASE_PRICE, advPrice: SALE_ADV_PRICE }
  });
});

app.post('/api/shop/buy', auth, async (req,res)=>{
  const { type } = req.body || {};
  if (!type) return res.status(400).json({ error:'Не заполнено поле' });
  if (!SEED_TYPES.includes(type)) return res.status(400).json({ error:'Ошибка валидации' });

  const pool = await getPool();
  const [[p]] = await pool.query('SELECT balance, sold_count FROM profiles WHERE user_id=?',[req.user.id]);
  const level = (p.sold_count>=50)?2:1;
  if (isAdv(type) && level<2) return res.status(400).json({ error:'Ошибка валидации' });

  const price = isAdv(type)?PURCHASE_ADV_PRICE:PURCHASE_BASE_PRICE;
  if (p.balance < price) return res.status(400).json({ error:'Ошибка валидации' });

  await pool.query('UPDATE profiles SET balance=balance-? WHERE user_id=?',[price, req.user.id]);
  await pool.query('INSERT INTO inventory (user_id, kind, type, status) VALUES (?,?,?,?)',[req.user.id,'seed',type,'new']);
  res.json({ ok:true });
});

app.get('/api/inventory', auth, async (req,res)=>{
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM inventory WHERE user_id=? ORDER BY id DESC',[req.user.id]);
  const seeds = rows.filter(r=>r.kind==='seed');
  const vegRaw = rows.filter(r=>r.kind==='veg_raw');
  const vegWashed = rows.filter(r=>r.kind==='veg_washed');
  res.json({ seeds, vegRaw, vegWashed });
});

app.get('/api/inventory/vegetables/:inventoryId', auth, async (req,res)=>{
  const { inventoryId: inventoryIdParam } = req.params || {};
  const inventoryId = Number.parseInt(inventoryIdParam, 10);
  if (!Number.isInteger(inventoryId)) return res.status(400).json({ error:'Не заполнено поле' });

  const pool = await getPool();
  const [[item]] = await pool.query('SELECT * FROM inventory WHERE id=? AND user_id=?',[inventoryId, req.user.id]);
  if (!item || (item.kind!=='veg_raw' && item.kind!=='veg_washed')) {
    return res.status(400).json({ error:'Ошибка валидации' });
  }

  res.json({
    id: item.id,
    userId: item.user_id,
    washed: item.kind === 'veg_washed',
    type: item.type,
    status: item.status,
    createdAt: item.created_at
  });
});

app.patch('/api/inventory/wash/:inventoryId', auth, async (req,res)=>{
  const { inventoryId: inventoryIdParam } = req.params || {};
  const inventoryId = Number.parseInt(inventoryIdParam, 10);
  if (!Number.isInteger(inventoryId)) return res.status(400).json({ error:'Не заполнено поле' });
  const pool = await getPool();
  const [[item]] = await pool.query('SELECT * FROM inventory WHERE id=? AND user_id=?',[inventoryId, req.user.id]);
  if (!item || item.kind!=='veg_raw') return res.status(400).json({ error:'Ошибка валидации' });
  await pool.query('UPDATE inventory SET kind="veg_washed", status="washed" WHERE id=?',[inventoryId]);
  res.json({ ok:true });
});

// Garden
function matured(planted_at){
  if (!planted_at) return false;
  const planted = new Date(planted_at);
  const now = new Date();
  const diffMin = (now - planted) / 60000;
  return diffMin >= GROWTH_MINUTES;
}

app.get('/api/garden/plots', auth, async (req,res)=>{
  const pool = await getPool();
  const [plots] = await pool.query('SELECT * FROM plots WHERE user_id=? ORDER BY slot ASC',[req.user.id]);
  const mapped = plots.map(p=>({
    slot: p.slot,
    type: p.harvested ? null : p.type,
    plantedAt: p.planted_at,
    matured: matured(p.planted_at) && !p.harvested,
    harvested: !!p.harvested
  }));
  res.json(mapped);
});

app.post('/api/garden/plant', auth, async (req,res)=>{
  const { slot, inventoryId } = req.body || {};
  if (slot===undefined || !inventoryId) return res.status(400).json({ error:'Не заполнено поле' });
  const pool = await getPool();
  const [[plot]] = await pool.query('SELECT * FROM plots WHERE user_id=? AND slot=?',[req.user.id, slot]);
  if (!plot || (plot.type && !plot.harvested)) return res.status(400).json({ error:'Ошибка валидации' });

  const [[seed]] = await pool.query('SELECT * FROM inventory WHERE id=? AND user_id=?',[inventoryId, req.user.id]);
  if (!seed || seed.kind!=='seed') return res.status(400).json({ error:'Ошибка валидации' });

  await pool.query('DELETE FROM inventory WHERE id=?',[inventoryId]);
  await pool.query('UPDATE plots SET type=?, planted_at=NOW(), harvested=0 WHERE user_id=? AND slot=?',[seed.type, req.user.id, slot]);
  res.json({ ok:true });
});

app.post('/api/garden/harvest', auth, async (req,res)=>{
  const { slot } = req.body || {};
  if (slot===undefined) return res.status(400).json({ error:'Не заполнено поле' });
  const pool = await getPool();
  const [[plot]] = await pool.query('SELECT * FROM plots WHERE user_id=? AND slot=?',[req.user.id, slot]);
  if (!plot || !plot.type || plot.harvested) return res.status(400).json({ error:'Ошибка валидации' });
  if (!matured(plot.planted_at)) return res.status(400).json({ error:'Ошибка валидации' });

  await pool.query('UPDATE plots SET harvested=1, type=NULL, planted_at=NULL WHERE user_id=? AND slot=?',[req.user.id, slot]);
  await pool.query('INSERT INTO inventory (user_id, kind, type, status) VALUES (?,?,?,?)',[req.user.id,'veg_raw',plot.type,'harvested']);
  res.json({ ok:true });
});

// Sell
app.post('/api/shop/sell', auth, async (req,res)=>{
  const { inventoryId } = req.body || {};
  if (!inventoryId) return res.status(400).json({ error:'Не заполнено поле' });
  const pool = await getPool();
  const [[item]] = await pool.query('SELECT * FROM inventory WHERE id=? AND user_id=?',[inventoryId, req.user.id]);
  if (!item || item.kind!=='veg_washed') return res.status(400).json({ error:'Ошибка валидации' });

  const price = ADV_TYPES.includes(item.type) ? SALE_ADV_PRICE : SALE_BASE_PRICE;

  await pool.query('DELETE FROM inventory WHERE id=?',[inventoryId]);
  await pool.query('UPDATE profiles SET balance=balance+?, sold_count=sold_count+1 WHERE user_id=?',[price, req.user.id]);
  res.json({ ok:true });
});

app.get('/api/health', (_req,res)=> res.json({ ok:true }));

app.listen(PORT, ()=>{
  console.log('Backend started on', PORT);
});
