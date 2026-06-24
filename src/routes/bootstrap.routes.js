import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { listHabits } from '../services/habits.service.js';
import { getAppState, getProfile } from '../services/profile.service.js';

const router = Router();

router.use(optionalAuth);

router.get('/', asyncHandler(async (req, res) => {
  const [profile, habits, appState] = await Promise.all([
    getProfile(req.user.id),
    listHabits(req.user.id),
    getAppState(req.user.id),
  ]);

  res.json({
    data: {
      profile,
      today: null,
      streak: null,
      habits,
      today_completions: [],
      today_video: null,
      active_focus_session: null,
      reminders: [],
      level: null,
      app_state: appState,
      server_time: new Date().toISOString(),
    },
    error: null,
  });
}));

export default router;
