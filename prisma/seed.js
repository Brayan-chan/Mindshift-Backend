import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
  for (const habit of DEFAULT_HABITS) {
    await prisma.habitTemplate.upsert({
      where: { slug: `default-${habit.legacyId}` },
      create: {
        slug: `default-${habit.legacyId}`,
        titleI18n: {
          en: habit.title,
          es: habit.title,
        },
        descriptionI18n: {
          en: '',
          es: '',
        },
        category: habit.category,
        habitType: habit.habitType,
        routinePeriod: 'anytime',
        defaultXp: 10,
        sortOrder: habit.position,
      },
      update: {
        titleI18n: {
          en: habit.title,
          es: habit.title,
        },
        category: habit.category,
        habitType: habit.habitType,
        routinePeriod: 'anytime',
        defaultXp: 10,
        sortOrder: habit.position,
        active: true,
      },
    });
  }

  console.log(`Seeded ${DEFAULT_HABITS.length} habit templates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
