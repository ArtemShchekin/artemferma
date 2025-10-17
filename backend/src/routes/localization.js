import express from 'express';
const router = express.Router();

router.post('/1', (_req, res) => {
  res.status(400).json({
    error: 'Некорректные данные',
    message: 'Поля login и password обязательны для заполнения'
  });
});

router.post('/2', (req, res) => {
  const { login, password, pass } = req.body ?? {};

  if (typeof login === 'string' && typeof password === 'string') {
    return res.json({ success: true });
  }

  if (typeof login === 'string' && typeof pass === 'string' && typeof password === 'undefined') {
    return res.status(400).json({
      error: 'Некорректное тело запроса',
      message: 'Ожидалось поле password, но получено pass.'
    });
  }

  return res.status(400).json({
    error: 'Некорректные данные',
    message: 'Поля login и password обязательны для заполнения'
  });
});

// сценарий 3 — сервер возвращает 504 после ожидания
router.post('/3', (_req, res) => {
  setTimeout(() => {
    res.status(504).json({
      error: 'Gateway Timeout',
      message: 'Сервер не успел обработать запрос и вернул 504 ошибку'
    });
  }, 8000);
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

export default router;
