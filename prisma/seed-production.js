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

  // Seed assessment questions if not exist (based on seed-assessment.ts)
  const existingAssessment = await prisma.assessmentQuestion.count();
  if (existingAssessment === 0) {
    const assessmentQuestions = [
      // FIRE PREVENTION (3 questions)
      {
        question: "What is the best way to prevent electrical fires at home?",
        options: ["Use multiple extension cords", "Overload electrical outlets", "Regularly check and replace damaged wires", "Leave appliances plugged in when not in use"],
        correctAnswer: 2,
        explanation: "Regularly checking and replacing damaged wires prevents electrical fires. Damaged wires can cause short circuits and sparks.",
        category: "Fire Prevention",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
      {
        question: "How often should you clean your stove and cooking area to prevent kitchen fires?",
        options: ["Once a year", "Once a month", "After every cooking session", "Only when it looks very dirty"],
        correctAnswer: 2,
        explanation: "Cleaning after every cooking session removes grease buildup, which is highly flammable and a common cause of kitchen fires.",
        category: "Kitchen Safety",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
      {
        question: "Which of these materials is MOST flammable and should be kept away from heat sources?",
        options: ["Metal pans", "Ceramic plates", "Cooking oil and gasoline", "Glass containers"],
        correctAnswer: 2,
        explanation: "Cooking oil and gasoline are highly flammable liquids that can ignite quickly when exposed to heat or sparks.",
        category: "Fire Prevention",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
      // EMERGENCY RESPONSE (3 questions)
      {
        question: "What is the FIRST thing you should do if you discover a small fire?",
        options: ["Try to put it out yourself immediately", "Alert others and call for help (911 or BFP)", "Take a video of the fire", "Run away without telling anyone"],
        correctAnswer: 1,
        explanation: "Safety first! Alert others and call emergency services immediately. Even small fires can grow quickly and become dangerous.",
        category: "Emergency Response",
        difficulty: "Medium",
        forRoles: ["kid", "adult", "professional"],
      },
      {
        question: "If your clothes catch fire, what should you do?",
        options: ["Run to find water", "Stop, Drop, and Roll", "Take off your clothes quickly", "Wave your arms to put out the flames"],
        correctAnswer: 1,
        explanation: "STOP, DROP, and ROLL immediately. Running makes the fire burn faster. Rolling on the ground smothers the flames.",
        category: "Emergency Response",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
      {
        question: "In case of fire, why should you crawl low under smoke?",
        options: ["It's faster to crawl than to walk", "Smoke and toxic gases rise, so cleaner air is near the floor", "To avoid being seen by the fire", "It's easier to find the door while crawling"],
        correctAnswer: 1,
        explanation: "Hot smoke and toxic gases rise to the ceiling. Cleaner, cooler air stays near the floor, making it safer to breathe while escaping.",
        category: "Emergency Response",
        difficulty: "Medium",
        forRoles: ["kid", "adult", "professional"],
      },
      // ELECTRICAL SAFETY (2 questions)
      {
        question: "What should you NEVER do with electrical appliances near water?",
        options: ["Unplug them when not in use", "Use them with wet hands or near sinks", "Keep them on a dry surface", "Read the instruction manual"],
        correctAnswer: 1,
        explanation: "Never use electrical appliances with wet hands or near water. Water conducts electricity and can cause electric shock or fires.",
        category: "Electrical Safety",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
      {
        question: "What is 'octopus wiring' and why is it dangerous?",
        options: ["A type of cable used by electricians", "Connecting multiple extension cords to one outlet, causing overload", "A safety device that prevents electrical fires", "A special wiring system for large buildings"],
        correctAnswer: 1,
        explanation: "'Octopus wiring' overloads outlets by connecting too many devices, causing overheating and potential electrical fires.",
        category: "Electrical Safety",
        difficulty: "Medium",
        forRoles: ["adult", "professional"],
      },
      // KITCHEN SAFETY (2 questions)
      {
        question: "If a cooking oil fire starts in your pan, what should you do?",
        options: ["Pour water on the fire", "Cover the pan with a metal lid to smother the flames", "Move the pan to the sink", "Blow on the fire to put it out"],
        correctAnswer: 1,
        explanation: "Never pour water on an oil fire! Cover the pan with a metal lid to cut off oxygen and smother the flames. Turn off the heat.",
        category: "Kitchen Safety",
        difficulty: "Medium",
        forRoles: ["adult", "professional"],
      },
      {
        question: "Why should you never leave cooking unattended?",
        options: ["The food might get overcooked", "Someone might steal the food", "Unattended cooking is a leading cause of home fires", "It wastes electricity or gas"],
        correctAnswer: 2,
        explanation: "Unattended cooking is the leading cause of home fires. Food can overheat, catch fire, or cause pots to boil over and ignite.",
        category: "Kitchen Safety",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
      // EVACUATION PLANNING (2 questions)
      {
        question: "Why is it important to have a family fire escape plan?",
        options: ["It's required by law", "To practice fire drills for fun", "So everyone knows how to exit safely and where to meet during a fire", "To impress your neighbors"],
        correctAnswer: 2,
        explanation: "A fire escape plan ensures everyone knows the exits, escape routes, and a safe meeting spot outside, reducing panic during emergencies.",
        category: "Evacuation Planning",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
      {
        question: "When evacuating a burning building, what should you do with doors before opening them?",
        options: ["Kick them open immediately", "Touch the doorknob and door with the back of your hand to check for heat", "Open them wide for fresh air", "Look through the keyhole first"],
        correctAnswer: 1,
        explanation: "Check if the door is hot before opening. A hot door means fire is on the other side. Use an alternate exit if the door is hot.",
        category: "Evacuation Planning",
        difficulty: "Medium",
        forRoles: ["adult", "professional"],
      },
      // FIRE EXTINGUISHER USE (2 questions)
      {
        question: "What does the acronym 'PASS' stand for when using a fire extinguisher?",
        options: ["Point, Aim, Spray, Stop", "Pull, Aim, Squeeze, Sweep", "Push, Activate, Spray, Smother", "Prepare, Alert, Spray, Secure"],
        correctAnswer: 1,
        explanation: "PASS stands for: Pull the pin, Aim at the base of the fire, Squeeze the handle, Sweep from side to side.",
        category: "Fire Extinguisher Use",
        difficulty: "Medium",
        forRoles: ["adult", "professional"],
      },
      {
        question: "Where should you aim a fire extinguisher when fighting a fire?",
        options: ["At the flames", "At the smoke", "At the base of the fire", "At the ceiling"],
        correctAnswer: 2,
        explanation: "Aim at the BASE of the fire, not the flames. This targets the fuel source and is more effective at extinguishing the fire.",
        category: "Fire Extinguisher Use",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
      // SMOKE DETECTOR KNOWLEDGE (1 question)
      {
        question: "How often should you test your smoke detectors?",
        options: ["Once a year", "Every 6 months", "Once a month", "Only when they beep"],
        correctAnswer: 2,
        explanation: "Test smoke detectors monthly by pressing the test button. Replace batteries annually or when the low-battery alert sounds.",
        category: "Smoke Detector Knowledge",
        difficulty: "Easy",
        forRoles: ["adult", "professional"],
      },
      // GENERAL SAFETY AWARENESS (1 question)
      {
        question: "What is the emergency hotline number for the Bureau of Fire Protection (BFP) in the Philippines?",
        options: ["117", "911", "143", "166"],
        correctAnswer: 1,
        explanation: "911 is the national emergency hotline in the Philippines for all emergencies, including fires. BFP also has local hotlines like 426-0219.",
        category: "General Safety Awareness",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"],
      },
    ];

    for (const q of assessmentQuestions) {
      await prisma.assessmentQuestion.create({
        data: {
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          category: q.category,
          difficulty: q.difficulty,
          forRoles: q.forRoles,
          isActive: true,
        },
      });
    }
    console.log('✅ Assessment questions seeded (' + assessmentQuestions.length + ' questions)');
  } else {
    console.log('ℹ️  Assessment questions already exist (' + existingAssessment + '), skipping');
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
