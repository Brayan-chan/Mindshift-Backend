import { Router } from 'express';
import { z } from 'zod';
import { createHabit, listHabits, setHabitCompletion, toggleHabit } from '../services/habits.service.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(optionalAuth);

const createHabitSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(120),
    type: z.enum(['good', 'bad']),
    category: z.enum(['physical', 'mental', 'productivity', 'social']),
    targetDays: z.number().int().min(1).max(7).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const setCompletionSchema = z.object({
  body: z.object({
    completed: z.boolean(),
    clientMutationId: z.string().optional(),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    timezone: z.string().min(1).max(80).optional(),
  }),
  params: z.object({
    habitId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const habits = await listHabits(req.user.id);
    res.json({ data: habits, error: null });
  }),
);

router.post(
  '/',
  validate(createHabitSchema),
  asyncHandler(async (req, res) => {
    const habit = await createHabit(req.user.id, req.validated.body);
    res.status(201).json({ data: habit, error: null });
  }),
);

router.post(
  '/:habitId/toggle',
  asyncHandler(async (req, res) => {
    const habit = await toggleHabit(req.user.id, req.params.habitId);
    res.json({ data: habit, error: null });
  }),
);

router.patch(
  '/:habitId/completion',
  validate(setCompletionSchema),
  asyncHandler(async (req, res) => {
    const habit = await setHabitCompletion(
      req.user.id,
      req.validated.params.habitId,
      req.validated.body.completed,
      {
        localDate: req.validated.body.localDate,
        timezone: req.validated.body.timezone,
      },
    );
    res.json({
      data: {
        ...habit,
        clientMutationId: req.validated.body.clientMutationId,
      },
      error: null,
    });
  }),
);

export default router;
