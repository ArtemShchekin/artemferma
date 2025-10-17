import { Router } from 'express';

const router = Router();

const REQUIRED_FIELDS = ['login', 'password'];

router.post('/2', (req, res) => {
  const missing = REQUIRED_FIELDS.filter((field) => typeof req.body?.[field] !== 'string');
  if (missing.length > 0) {
    res.status(400).json({
      error: 'Некорректное тело запроса',
      details: `Отсутствуют поля: ${missing.join(', ')}`
    });
    return;
  }

  res.status(200).json({ message: 'Тело запроса корректно' });
});

router.post('/3', (req, res) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Таймаут обработки запроса' });
    }
  }, 120000);

  req.on('close', () => {
    clearTimeout(timer);
  });
});

router.post('/4', (_req, res) => {
  res.json({ status: 'ok', payload: { userId: null, permissions: [] } });
});

router.post('/5', (_req, res) => {
  res.status(500).end();
});

router.post('/6', (_req, res) => {
  res.json({ success: true, tokens: { accessToken: 'demo-access', refreshToken: 'demo-refresh' } });
});

export default router;
