import { Router } from 'express';
import authRoutes from './auth.routes.js';
import bootstrapRoutes from './bootstrap.routes.js';
import habitsRoutes from './habits.routes.js';
import meRoutes from './me.routes.js';

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/me', meRoutes);
router.use('/v1/bootstrap', bootstrapRoutes);
router.use('/v1/habits', habitsRoutes);

export default router;
