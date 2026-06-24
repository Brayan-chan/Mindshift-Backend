import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    data: {
      profile: null,
      today: null,
      streak: null,
      habits: [],
      today_completions: [],
      today_video: null,
      active_focus_session: null,
      reminders: [],
      level: null,
      server_time: new Date().toISOString(),
    },
    error: null,
  });
});

export default router;
