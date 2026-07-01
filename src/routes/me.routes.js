import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  getAppState,
  getProfile,
  saveAppState,
  updateIdentity,
  updateProfile,
  updateSettings,
} from '../services/profile.service.js';

const router = Router();

router.use(requireAuth);

const identitySchema = z.object({
  body: z.object({
    currentIdentity: z.string().trim().max(2000).optional().default(''),
    targetIdentity: z.string().trim().max(2000).optional().default(''),
    whyTransform: z.string().trim().max(4000).optional().default(''),
    coreValues: z.array(z.string().trim().max(80)).optional().default([]),
    setupComplete: z.boolean().optional().default(true),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const settingsSchema = z.object({
  body: z.object({
    appSettings: z.object({}).passthrough(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const profileSchema = z.object({
  body: z.object({
    displayName: z.string().trim().min(1).max(80),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const appStateSchema = z.object({
  body: z.object({
    data: z.object({}).passthrough(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.user.id);
    res.json({ data: profile, error: null });
  }),
);

router.patch(
  '/profile',
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const profile = await updateProfile(req.user.id, req.validated.body);
    res.json({ data: profile, error: null });
  }),
);

router.patch(
  '/identity',
  validate(identitySchema),
  asyncHandler(async (req, res) => {
    const profile = await updateIdentity(req.user.id, req.validated.body);
    res.json({ data: profile, error: null });
  }),
);

router.patch(
  '/settings',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const profile = await updateSettings(req.user.id, req.validated.body);
    res.json({ data: profile, error: null });
  }),
);

router.get(
  '/app-state',
  asyncHandler(async (req, res) => {
    const data = await getAppState(req.user.id);
    res.json({ data, error: null });
  }),
);

router.put(
  '/app-state',
  validate(appStateSchema),
  asyncHandler(async (req, res) => {
    const data = await saveAppState(req.user.id, req.validated.body.data);
    res.json({ data, error: null });
  }),
);

export default router;
