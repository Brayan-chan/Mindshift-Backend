import prisma from '../config/prisma.js';
import { env } from '../config/env.js';

const DEFAULT_APP_SETTINGS = {
  language: 'es',
  darkMode: true,
  gamification: {
    goalMode: 'auto',
    manualDailyXpGoal: 50,
    sanctionsEnabled: true,
    badHabitPenalty: 10,
    missedGoalPenalty: 10,
  },
  notifications: {
    habits: true,
    reflections: true,
    focusSessions: true,
    motivational: true,
  },
  focusMode: {
    defaultDuration: 25,
    breakDuration: 5,
    longBreakAfter: 4,
  },
};

export function mapProfile(profile) {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    displayName: profile.displayName,
    locale: profile.locale,
    timezone: profile.timezone,
    currentIdentity: profile.currentIdentity,
    targetIdentity: profile.targetIdentity,
    whyTransform: profile.whyTransform,
    coreValues: profile.coreValues,
    setupComplete: profile.onboardingCompleted,
    dailyXpGoal: profile.dailyXpGoal,
    appSettings: profile.appSettings ?? DEFAULT_APP_SETTINGS,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function ensureProfile(input) {
  const id = input.id ?? env.DEV_USER_ID;

  return prisma.profile.upsert({
    where: { id },
    create: {
      id,
      email: input.email ?? null,
      username: input.username ?? null,
      displayName: input.displayName ?? input.username ?? input.email ?? 'MindShift User',
      locale: input.locale ?? 'es',
      timezone: input.timezone ?? 'America/Merida',
      appSettings: input.appSettings ?? DEFAULT_APP_SETTINGS,
    },
    update: {
      email: input.email ?? undefined,
      username: input.username ?? undefined,
      displayName: input.displayName ?? undefined,
    },
  });
}

export async function getProfile(userId) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
  });

  return profile ? mapProfile(profile) : null;
}

export async function findProfileByUsername(username) {
  return prisma.profile.findUnique({
    where: { username },
  });
}

export async function updateIdentity(userId, input) {
  const profile = await prisma.profile.update({
    where: { id: userId },
    data: {
      currentIdentity: input.currentIdentity,
      targetIdentity: input.targetIdentity,
      whyTransform: input.whyTransform,
      coreValues: input.coreValues,
      onboardingCompleted: input.setupComplete,
    },
  });

  return mapProfile(profile);
}

export async function updateSettings(userId, input) {
  const profile = await prisma.profile.update({
    where: { id: userId },
    data: {
      appSettings: input.appSettings,
      locale: input.appSettings?.language,
      dailyXpGoal: input.appSettings?.gamification?.manualDailyXpGoal,
    },
  });

  return mapProfile(profile);
}

export async function getAppState(userId) {
  const state = await prisma.userAppState.findUnique({
    where: { userId },
  });

  return state?.data ?? {};
}

export async function saveAppState(userId, data) {
  const current = await getAppState(userId);
  const nextData = {
    ...(current && typeof current === 'object' && !Array.isArray(current) ? current : {}),
    ...data,
  };

  const state = await prisma.userAppState.upsert({
    where: { userId },
    create: {
      userId,
      data: nextData,
    },
    update: {
      data: nextData,
    },
  });

  return state.data;
}
