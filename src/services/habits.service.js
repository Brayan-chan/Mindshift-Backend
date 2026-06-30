import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../middlewares/error.middleware.js';

const DEFAULT_HABITS = [
  ['1', 'Morning workout', 'good', 'physical'],
  ['2', 'Deep work session', 'good', 'productivity'],
  ['3', 'Scroll social media', 'bad', 'productivity'],
  ['4', 'Wake up early', 'good', 'physical'],
  ['5', 'Drink water after waking up', 'good', 'physical'],
  ['6', 'Brush teeth after waking up', 'good', 'physical'],
  ['7', 'Meditate for 10 minutes without devices nearby', 'good', 'mental'],
  ['8', 'Learn something new', 'good', 'mental'],
  ['9', 'Drink water in the afternoon', 'good', 'physical'],
  ['10', 'Put devices away before 10 PM', 'good', 'mental'],
  ['11', 'Brush teeth before bed', 'good', 'physical'],
  ['12', 'Go to sleep early', 'good', 'physical'],
].map(([legacyId, title, habitType, category], index) => ({
  legacyId,
  title,
  habitType,
  category,
  position: index,
}));

let devHabitsSeeded = false;
const seededUsers = new Set();

function getLocalDateKey(date = new Date(), timezone = 'America/Merida') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function toDateOnly(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function normalizeDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey ?? '') ? dateKey : getLocalDateKey();
}

function getDateOnlyKey(value) {
  return value.toISOString().slice(0, 10);
}

async function normalizeHabitCompletionDates(userId) {
  const completions = await prisma.habitCompletion.findMany({
    where: { userId },
    orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
  });
  const seen = new Set();

  for (const completion of completions) {
    const timezone = completion.timezone || 'America/Merida';
    const desiredLocalDateKey = getLocalDateKey(completion.completedAt, timezone);
    const desiredLocalDate = toDateOnly(desiredLocalDateKey);
    const key = `${completion.userId}:${completion.userHabitId}:${desiredLocalDateKey}`;

    if (seen.has(key)) {
      await prisma.habitCompletion.delete({
        where: { id: completion.id },
      });
      continue;
    }

    seen.add(key);

    if (getDateOnlyKey(completion.localDate) === desiredLocalDateKey) {
      continue;
    }

    const existing = await prisma.habitCompletion.findUnique({
      where: {
        userId_userHabitId_localDate: {
          userId: completion.userId,
          userHabitId: completion.userHabitId,
          localDate: desiredLocalDate,
        },
      },
    });

    if (existing && existing.id !== completion.id) {
      await prisma.habitCompletion.delete({
        where: { id: completion.id },
      });
      continue;
    }

    await prisma.habitCompletion.update({
      where: { id: completion.id },
      data: {
        localDate: desiredLocalDate,
        timezone,
      },
    });
  }
}

function calculateHabitStreak(history) {
  let streak = 0;
  const checkDate = new Date();

  if (!history[getLocalDateKey(checkDate)]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (history[getLocalDateKey(checkDate)]) {
    streak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

function mapHabit(habit, completions) {
  const legacyId = habit.template?.slug?.startsWith('default-')
    ? habit.template.slug.replace('default-', '')
    : undefined;
  const history = completions.reduce((acc, completion) => {
    acc[getDateOnlyKey(completion.localDate)] = true;
    return acc;
  }, {});

  return {
    id: habit.id,
    legacyId,
    title: habit.customTitle ?? habit.template?.titleI18n?.en ?? habit.template?.titleI18n?.es ?? '',
    type: habit.habitType,
    category: habit.category,
    streak: habit.habitType === 'good' ? calculateHabitStreak(history) : 0,
    completedToday: Boolean(history[getLocalDateKey()]),
    history,
    createdAt: habit.createdAt.getTime(),
    targetDays: habit.targetPerWeek,
  };
}

async function dedupeDefaultHabits(userId) {
  const defaultSlugs = DEFAULT_HABITS.map((habit) => `default-${habit.legacyId}`);
  const defaultHabits = await prisma.userHabit.findMany({
    where: {
      userId,
      archivedAt: null,
      templateId: { not: null },
      template: {
        slug: { in: defaultSlugs },
      },
    },
    include: {
      template: true,
      completions: true,
    },
  });

  const groups = defaultHabits.reduce((acc, habit) => {
    if (!habit.templateId) return acc;

    acc[habit.templateId] = acc[habit.templateId] ?? [];
    acc[habit.templateId].push(habit);
    return acc;
  }, {});

  for (const habits of Object.values(groups)) {
    if (habits.length <= 1) continue;

    const [keeper, ...duplicates] = habits.sort((a, b) => {
      const completionDelta = b.completions.length - a.completions.length;
      if (completionDelta !== 0) return completionDelta;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    for (const duplicate of duplicates) {
      for (const completion of duplicate.completions) {
        const existing = await prisma.habitCompletion.findUnique({
          where: {
            userId_userHabitId_localDate: {
              userId,
              userHabitId: keeper.id,
              localDate: completion.localDate,
            },
          },
        });

        if (existing) {
          await prisma.habitCompletion.delete({
            where: { id: completion.id },
          });
        } else {
          await prisma.habitCompletion.update({
            where: { id: completion.id },
            data: { userHabitId: keeper.id },
          });
        }
      }

      await prisma.userHabit.update({
        where: { id: duplicate.id },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
      });
    }
  }
}

export async function ensureUserHabits(userId = env.DEV_USER_ID) {
  if (seededUsers.has(userId) || (userId === env.DEV_USER_ID && devHabitsSeeded)) {
    return;
  }

  const profile = await prisma.profile.upsert({
    where: { id: userId },
    create: {
      id: userId,
      displayName: userId === env.DEV_USER_ID ? 'MindShift Dev' : 'MindShift User',
      locale: 'es',
      timezone: 'America/Merida',
    },
    update: {},
  });

  await dedupeDefaultHabits(profile.id);

  const existingDefaultHabitCount = await prisma.userHabit.count({
    where: {
      userId: profile.id,
      archivedAt: null,
      template: {
        slug: {
          in: DEFAULT_HABITS.map((habit) => `default-${habit.legacyId}`),
        },
      },
    },
  });

  if (existingDefaultHabitCount >= DEFAULT_HABITS.length) {
    seededUsers.add(userId);
    if (userId === env.DEV_USER_ID) devHabitsSeeded = true;
    return;
  }

  for (const defaultHabit of DEFAULT_HABITS) {
    const slug = `default-${defaultHabit.legacyId}`;
    const template = await prisma.habitTemplate.upsert({
      where: { slug },
      create: {
        slug,
        titleI18n: {
          en: defaultHabit.title,
          es: defaultHabit.title,
        },
        descriptionI18n: {
          en: '',
          es: '',
        },
        category: defaultHabit.category,
        habitType: defaultHabit.habitType,
        routinePeriod: 'anytime',
        defaultXp: 10,
        sortOrder: defaultHabit.position,
      },
      update: {},
    });

    const existingHabit = await prisma.userHabit.findFirst({
      where: {
        userId: profile.id,
        templateId: template.id,
        archivedAt: null,
      },
    });

    if (!existingHabit) {
      await prisma.userHabit.create({
        data: {
          userId: profile.id,
          templateId: template.id,
          customTitle: defaultHabit.title,
          category: defaultHabit.category,
          habitType: defaultHabit.habitType,
          routinePeriod: 'anytime',
          targetPerWeek: 7,
          xpReward: 10,
          position: defaultHabit.position,
        },
      });
    }
  }

  seededUsers.add(userId);
  if (userId === env.DEV_USER_ID) devHabitsSeeded = true;
}

export async function listHabits(userId = env.DEV_USER_ID) {
  await ensureUserHabits(userId);
  await dedupeDefaultHabits(userId);
  await normalizeHabitCompletionDates(userId);

  const habits = await prisma.userHabit.findMany({
    where: {
      userId,
      archivedAt: null,
      isActive: true,
    },
    include: {
      template: true,
      completions: {
        orderBy: { localDate: 'asc' },
      },
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  return habits.map((habit) => mapHabit(habit, habit.completions));
}

export async function createHabit(userId = env.DEV_USER_ID, input) {
  await ensureUserHabits(userId);

  const maxPosition = await prisma.userHabit.aggregate({
    where: { userId },
    _max: { position: true },
  });

  const habit = await prisma.userHabit.create({
    data: {
      userId,
      customTitle: input.title,
      category: input.category,
      habitType: input.type,
      routinePeriod: 'anytime',
      targetPerWeek: input.targetDays ?? 7,
      xpReward: 10,
      position: (maxPosition._max.position ?? 0) + 1,
    },
    include: {
      template: true,
      completions: true,
    },
  });

  return mapHabit(habit, habit.completions);
}

export async function setHabitCompletion(userId = env.DEV_USER_ID, habitId, completed, options = {}) {
  const habit = await prisma.userHabit.findFirst({
    where: {
      id: habitId,
      userId,
      archivedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!habit) {
    throw new ApiError(404, 'HABIT_NOT_FOUND', 'Habit not found');
  }

  const localDateKey = normalizeDateKey(options.localDate);
  const timezone = options.timezone || 'America/Merida';
  const today = toDateOnly(localDateKey);
  const existingCompletion = await prisma.habitCompletion.findUnique({
    where: {
        userId_userHabitId_localDate: {
        userId,
        userHabitId: habitId,
        localDate: today,
      },
    },
  });

  if (completed && !existingCompletion) {
    await prisma.habitCompletion.create({
      data: {
        userId,
        userHabitId: habitId,
        localDate: today,
        timezone,
      },
    });
  }

  if (!completed && existingCompletion) {
    await prisma.habitCompletion.delete({
      where: { id: existingCompletion.id },
    });
  }

  return {
    id: habitId,
    completedToday: completed,
    history: {
      [localDateKey]: completed,
    },
  };
}

export async function toggleHabit(userId = env.DEV_USER_ID, habitId) {
  const today = toDateOnly(getLocalDateKey());
  const existingCompletion = await prisma.habitCompletion.findUnique({
    where: {
      userId_userHabitId_localDate: {
        userId,
        userHabitId: habitId,
        localDate: today,
      },
    },
  });

  return setHabitCompletion(userId, habitId, !existingCompletion);
}
