import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin, supabaseAuth } from '../config/supabase.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ensureProfile, findProfileByUsername, mapProfile } from '../services/profile.service.js';

const router = Router();

const usernameSchema = z.string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only include letters, numbers, underscores and hyphens')
  .transform((value) => value.toLowerCase());

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    username: usernameSchema,
    password: z.string().min(8),
    displayName: z.string().trim().min(1).max(80).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8),
  }).refine((value) => value.identifier || value.email, {
    message: 'identifier or email is required',
    path: ['identifier'],
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(10),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    if (!supabaseAdmin) {
      throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase admin client is not configured');
    }

    const { email, username, password, displayName } = req.validated.body;
    const existingUsername = await findProfileByUsername(username);

    if (existingUsername) {
      throw new ApiError(409, 'USERNAME_TAKEN', 'Username is already taken');
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: displayName ?? username,
      },
    });

    if (error) {
      throw new ApiError(400, 'AUTH_REGISTER_FAILED', error.message);
    }

    const profile = await ensureProfile({
      id: data.user.id,
      email,
      username,
      displayName: displayName ?? username,
    });

    res.status(201).json({
      data: {
        user: data.user,
        profile: mapProfile(profile),
      },
      error: null,
    });
  }),
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    if (!supabaseAuth) {
      throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase auth client is not configured');
    }

    const { identifier, email, password } = req.validated.body;
    let loginEmail = email;

    if (!loginEmail && identifier) {
      if (identifier.includes('@')) {
        loginEmail = identifier;
      } else {
        const profile = await findProfileByUsername(identifier.toLowerCase());
        loginEmail = profile?.email;
      }
    }

    if (!loginEmail) {
      throw new ApiError(401, 'AUTH_LOGIN_FAILED', 'Invalid credentials');
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      throw new ApiError(401, 'AUTH_LOGIN_FAILED', error.message);
    }

    const profile = await ensureProfile({
      id: data.user.id,
      email: data.user.email,
      username: data.user.user_metadata?.username,
      displayName: data.user.user_metadata?.display_name,
    });

    res.json({
      data: {
        ...data,
        profile: mapProfile(profile),
      },
      error: null,
    });
  }),
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    if (!supabaseAuth) {
      throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase auth client is not configured');
    }

    const { refreshToken } = req.validated.body;
    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw new ApiError(401, 'AUTH_REFRESH_FAILED', error?.message ?? 'Could not refresh session');
    }

    const profile = await ensureProfile({
      id: data.user?.id,
      email: data.user?.email,
      username: data.user?.user_metadata?.username,
      displayName: data.user?.user_metadata?.display_name,
    });

    res.json({
      data: {
        ...data,
        profile: mapProfile(profile),
      },
      error: null,
    });
  }),
);

export default router;
