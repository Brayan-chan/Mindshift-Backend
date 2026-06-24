import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin, supabaseAuth } from '../config/supabase.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

const credentialsSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

router.post(
  '/register',
  validate(credentialsSchema),
  asyncHandler(async (req, res) => {
    if (!supabaseAdmin) {
      throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase admin client is not configured');
    }

    const { email, password } = req.validated.body;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (error) {
      throw new ApiError(400, 'AUTH_REGISTER_FAILED', error.message);
    }

    res.status(201).json({ data: { user: data.user }, error: null });
  }),
);

router.post(
  '/login',
  validate(credentialsSchema),
  asyncHandler(async (req, res) => {
    if (!supabaseAuth) {
      throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase auth client is not configured');
    }

    const { email, password } = req.validated.body;
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error) {
      throw new ApiError(401, 'AUTH_LOGIN_FAILED', error.message);
    }

    res.json({ data, error: null });
  }),
);

export default router;
