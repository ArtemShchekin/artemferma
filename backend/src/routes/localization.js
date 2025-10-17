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

router.post('/3', (_req, res) => {
  setTimeout(() => {
    res.status(504).json({
      error: 'Gateway Timeout',
      message: 'Сервер не успел обработать запрос за отведённое время'
    });
  }, 2500);
});

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

router.post('/7', (_req, res) => {
  res.json({ success: true, message: 'Корректная конечная точка /localization/7' });
});

export default router;
