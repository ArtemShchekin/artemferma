import express from 'express';
const router = express.Router();

router.post('/1', (_req, res) => {
  res.status(400).json({
    error: 'Некорректные данные'
  });
});

router.post('/2', (req, res) => {
  const { login, password, pass } = req.body ?? {};

  if (typeof login === 'string' && typeof password === 'string') {
    return res.json({ success: true });
  }

  if (typeof login === 'string' && typeof pass === 'string' && typeof password === 'undefined') {
    return res.status(400).json({
      error: 'Некорректное тело запроса'
    });
  }

  return res.status(400).json({
    error: 'Некорректные данные'
  });
});

// сценарий 3 — сервер возвращает 504 после ожидания
router.post('/3', (_req, res) => {
  setTimeout(() => {
    res.status(504).json({
      error: 'Gateway Timeout'
    });
  }, 8000);
});

// сценарий 4 — успешный ответ без ожидаемых полей
router.post('/4', (req, res) => {
  res.json({ success: true });
});

router.post('/5', (_req, res) => {
  res.status(500).end();
});

router.post('/6', (_req, res) => {
  res.json({ success: true, tokens: { accessToken: 'demo-access', refreshToken: 'demo-refresh' } });
});

export default router;
