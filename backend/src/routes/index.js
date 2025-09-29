import { Router } from 'express';
import authRouter from './auth.js';
import profileRouter from './profile.js';
import shopRouter from './shop.js';
import inventoryRouter from './inventory.js';
import gardenRouter from './garden.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use('/auth', authRouter);
router.get('/health', (_req, res) => {
  res.json({ ok: true });
});
router.use(authenticate);
router.use('/profile', profileRouter);
router.use('/shop', shopRouter);
router.use('/inventory', inventoryRouter);
router.use('/garden', gardenRouter);

export default router;