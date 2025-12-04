import { Router } from 'express';
import authRouter from './auth.js';
import profileRouter from './profile.js';
import shopRouter from './shop.js';
import inventoryRouter from './inventory.js';
import gardenRouter from './garden.js';
import kitchenRouter from './kitchen.js';
import localizationRouter from './localization.js';
import emailRouter from './email.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use('/auth', authRouter);
router.get('/health', (_req, res) => {
  res.json({ ok: true });
});
router.use('/localization', localizationRouter);
router.use(emailRouter);
router.use(authenticate);
router.use('/profile', profileRouter);
router.use('/shop', shopRouter);
router.use('/inventory', inventoryRouter);
router.use('/garden', gardenRouter);
router.use('/kitchen', kitchenRouter);

export default router;
