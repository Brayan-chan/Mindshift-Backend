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

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function toDateOnly(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function getDateOnlyKey(value) {
  return value.toISOString().slice(0, 10);
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

export async function ensureDevUserHabits() {
  if (devHabitsSeeded) {
    return;
  }

  const profile = await prisma.profile.upsert({
    where: { id: env.DEV_USER_ID },
    create: {
      id: env.DEV_USER_ID,
      displayName: 'MindShift Dev',
      locale: 'es',
      timezone: 'America/Merida',
    },
    update: {},
  });

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
    devHabitsSeeded = true;
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

  devHabitsSeeded = true;
}

export async function listHabits() {
  await ensureDevUserHabits();

  const habits = await prisma.userHabit.findMany({
    where: {
      userId: env.DEV_USER_ID,
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

export async function createHabit(input) {
  await ensureDevUserHabits();

  const maxPosition = await prisma.userHabit.aggregate({
    where: { userId: env.DEV_USER_ID },
    _max: { position: true },
  });

  const habit = await prisma.userHabit.create({
    data: {
      userId: env.DEV_USER_ID,
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

export async function setHabitCompletion(habitId, completed) {
  const habit = await prisma.userHabit.findFirst({
    where: {
      id: habitId,
      userId: env.DEV_USER_ID,
      archivedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!habit) {
    throw new ApiError(404, 'HABIT_NOT_FOUND', 'Habit not found');
  }

  const today = toDateOnly(getLocalDateKey());
  const existingCompletion = await prisma.habitCompletion.findUnique({
    where: {
      userId_userHabitId_localDate: {
        userId: env.DEV_USER_ID,
        userHabitId: habitId,
        localDate: today,
      },
    },
  });

  if (completed && !existingCompletion) {
    await prisma.habitCompletion.create({
      data: {
        userId: env.DEV_USER_ID,
        userHabitId: habitId,
        localDate: today,
        timezone: 'America/Merida',
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
      [getLocalDateKey()]: completed,
    },
  };
}

export async function toggleHabit(habitId) {
  const today = toDateOnly(getLocalDateKey());
  const existingCompletion = await prisma.habitCompletion.findUnique({
    where: {
      userId_userHabitId_localDate: {
        userId: env.DEV_USER_ID,
        userHabitId: habitId,
        localDate: today,
      },
    },
  });

  return setHabitCompletion(habitId, !existingCompletion);
}
