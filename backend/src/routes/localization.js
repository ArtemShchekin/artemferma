import express from 'express';
const router = express.Router();

router.post('/1', (_req, res) => {
  res.status(400).json({
    error: 'Некорректные данные',
    message: 'Поля login и password обязательны для заполнения'
  });
});

router.post('/2', (_req, res) => {
  setTimeout(() => {
    res.status(504).json({
      error: 'Gateway Timeout',
      message: 'Сервер не успел обработать запрос за отведённое время'
    });
  }, 2500);
});

// сценарий 3 — таймаут 120 секунд
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

// сценарий 4 — возврат логина и пароля
router.post('/4', (req, res) => {
  res.json({
    login: req.body?.login ?? null,
    pass: req.body?.password ?? null
  });
});

router.post('/5', (_req, res) => {
  res.status(500).end();
});

router.post('/6', (_req, res) => {
  res.json({ success: true, tokens: { accessToken: 'demo-access', refreshToken: 'demo-refresh' } });
});

// сценарий 7 — успешный ответ
router.post('/7', (_req, res) => {
  res.json({ success: true, message: 'Корректная конечная точка /localization/7' });
});

export default router;
