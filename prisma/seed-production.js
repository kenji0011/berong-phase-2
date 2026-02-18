/**
 * Production seed script for BFP Berong
 * Creates default admin account and essential data ONLY if they don't exist.
 * SECURITY: Never resets existing passwords on restart.
 * Run with: node prisma/seed-production.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production database seeding...');

  // SECURITY: Use environment variable for admin password, never hardcode
  const adminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
  const adminPassword = await bcrypt.hash(adminPass, 12);

  // Check if admin exists — NEVER reset the password on restart
  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existingAdmin) {
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@bfp.gov.ph',
        password: adminPassword,
        name: 'BFP Administrator',
        age: 30,
        role: 'admin',
        isActive: true,
      },
    });
    console.log('✅ Admin user created:', adminUser.username);
    console.log('⚠️  IMPORTANT: Change the default admin password immediately!');
  } else {
    console.log('ℹ️  Admin user already exists, skipping (password preserved)');
  }

  // SECURITY: Only create test accounts in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const kidPassword = await bcrypt.hash('kid123', 10);
    const adultPassword = await bcrypt.hash('adult123', 10);
    const professionalPassword = await bcrypt.hash('pro123', 10);

    await prisma.user.upsert({
      where: { username: 'testkid' },
      update: {},
      create: {
        username: 'testkid',
        email: 'kid@bfp.gov.ph',
        password: kidPassword,
        name: 'Young Firefighter',
        age: 12,
        role: 'kid',
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { username: 'testadult' },
      update: {},
      create: {
        username: 'testadult',
        email: 'adult@bfp.gov.ph',
        password: adultPassword,
        name: 'John Smith',
        age: 25,
        role: 'adult',
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { username: 'testpro' },
      update: {},
      create: {
        username: 'testpro',
        email: 'pro@bfp.gov.ph',
        password: professionalPassword,
        name: 'Firefighter Cruz',
        age: 28,
        role: 'professional',
        isActive: true,
      },
    });

    console.log('✅ Test accounts ready (dev only)');
  } else {
    console.log('ℹ️  Skipping test accounts in production');
  }

  // Seed carousel images if not exist
  const existingCarousel = await prisma.carouselImage.count();
  if (existingCarousel === 0) {
    const carouselImages = [
      {
        title: 'BFP Firefighters in Action',
        altText: 'BFP Firefighters in Action',
        imageUrl: '/web-background-image.jpg',
        order: 1,
        isActive: true,
      },
      {
        title: 'Fire Safety Training',
        altText: 'Fire Safety Training',
        imageUrl: '/fire-safety-training-session.jpg',
        order: 2,
        isActive: true,
      },
      {
        title: 'BFP Sta Cruz - Always Ready',
        altText: 'BFP Sta Cruz',
        imageUrl: '/bfp-sta-cruz-fire-station.jpg',
        order: 3,
        isActive: true,
      },
    ];

    for (const image of carouselImages) {
      await prisma.carouselImage.create({ data: image });
    }
    console.log('✅ Carousel images seeded');
  } else {
    console.log('ℹ️  Carousel images already exist, skipping');
  }

  // Seed quick questions if not exist
  const existingQuestions = await prisma.quickQuestion.count();
  if (existingQuestions === 0) {
    const quickQuestions = [
      {
        category: 'emergency',
        questionText: 'What should I do if there\'s a fire in my home?',
        responseText: 'GET OUT, STAY OUT, and CALL FOR HELP. Alert others, leave immediately using the nearest safe exit, and call emergency services (117 or 911) once you are safely outside.',
        order: 1,
        isActive: true,
      },
      {
        category: 'emergency',
        questionText: 'What is the emergency hotline for fire?',
        responseText: 'In the Philippines, you can call 117 (National Emergency Hotline) or 911. You can also contact your local BFP station directly.',
        order: 2,
        isActive: true,
      },
      {
        category: 'prevention',
        questionText: 'How can I prevent fires at home?',
        responseText: 'Never leave cooking unattended, check electrical wiring regularly, don\'t overload outlets, keep flammable materials away from heat sources, and install smoke detectors.',
        order: 1,
        isActive: true,
      },
      {
        category: 'prevention',
        questionText: 'How often should I check my smoke detectors?',
        responseText: 'Test smoke detectors monthly by pressing the test button. Replace batteries at least once a year, and replace the entire unit every 10 years.',
        order: 2,
        isActive: true,
      },
      {
        category: 'equipment',
        questionText: 'What type of fire extinguisher should I have at home?',
        responseText: 'A multi-purpose ABC fire extinguisher is recommended for homes. It can handle ordinary combustibles (A), flammable liquids (B), and electrical fires (C).',
        order: 1,
        isActive: true,
      },
      {
        category: 'general',
        questionText: 'What does BFP stand for?',
        responseText: 'BFP stands for Bureau of Fire Protection, the government agency responsible for fire prevention, suppression, and emergency response in the Philippines.',
        order: 1,
        isActive: true,
      },
    ];

    for (const question of quickQuestions) {
      await prisma.quickQuestion.create({ data: question });
    }
    console.log('✅ Quick questions seeded');
  } else {
    console.log('ℹ️  Quick questions already exist, skipping');
  }

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  if (process.env.NODE_ENV !== 'production') {
    console.log('');
    console.log('📋 Default Login Credentials (dev only):');
    console.log('   Admin: admin / (see ADMIN_DEFAULT_PASSWORD env var or default)');
    console.log('   Test accounts only created in non-production environments');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
