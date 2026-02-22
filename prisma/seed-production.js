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

  // Seed assessment questions if not exist (required for pre/post tests)
  const existingAssessment = await prisma.assessmentQuestion.count();
  if (existingAssessment === 0) {
    const assessmentQuestions = [
      // KID - Pre-Test
      { question: "What is the emergency number to call in case of fire?", options: ["911", "123", "456", "000"], correctAnswer: 0, type: "preTest", forRoles: ["kid"], order: 1, explanation: "911 is the universal emergency number to call for help.", category: "Emergency Response" },
      { question: "What should you do if your clothes catch fire?", options: ["Run fast", "Stop, Drop, and Roll", "Jump up and down", "Hide under the bed"], correctAnswer: 1, type: "preTest", forRoles: ["kid"], order: 2, explanation: "Running makes the fire burn faster. Stop, Drop, and Roll puts the fire out.", category: "Emergency Response" },
      { question: "Where should you go when there is a fire?", options: ["Under the bed", "In the closet", "Outside to a safe meeting place", "In the bathroom"], correctAnswer: 2, type: "preTest", forRoles: ["kid"], order: 3, explanation: "Always go outside to your agreed meeting place so your family knows you are safe.", category: "Evacuation Planning" },
      { question: "Which of these is safe to play with?", options: ["Matches", "Lighter", "Toys", "Candles"], correctAnswer: 2, type: "preTest", forRoles: ["kid"], order: 4, explanation: "Matches, lighters, and candles are tools for adults, not toys. Toys are safe to play with.", category: "Fire Prevention" },
      { question: "Who can help us put out fires?", options: ["Police Officer", "Firefighter", "Doctor", "Teacher"], correctAnswer: 1, type: "preTest", forRoles: ["kid"], order: 5, explanation: "Firefighters are trained to put out fires and rescue people.", category: "General Safety Awareness" },
      // KID - Post-Test
      { question: "What does a smoke alarm do?", options: ["Makes music", "Beeps loudly when there is smoke", "Cooks food", "Cleans the air"], correctAnswer: 1, type: "postTest", forRoles: ["kid"], order: 1, explanation: "Smoke alarms beep loudly to warn us if there is smoke or fire, so we can escape.", category: "Smoke Detector Knowledge" },
      { question: "Why should we stay low (crawl) in a fire?", options: ["To play a game", "Because the air is cleaner down low", "To find lost toys", "To sleep"], correctAnswer: 1, type: "postTest", forRoles: ["kid"], order: 2, explanation: "Smoke rises up. The air is cleaner near the floor, so crawling helps you breathe.", category: "Evacuation Planning" },
      { question: "If a door handle is hot, should you open it?", options: ["Yes", "No", "Maybe", "Only if you are fast"], correctAnswer: 1, type: "postTest", forRoles: ["kid"], order: 3, explanation: "A hot door handle means there is fire on the other side. Do not open it! Find another way out.", category: "Evacuation Planning" },
      { question: "What should you stick to during a fire?", options: ["The TV", "Your toys", "The Fire Escape Plan", "The fridge"], correctAnswer: 2, type: "postTest", forRoles: ["kid"], order: 4, explanation: "Follow your family's Fire Escape Plan to get out safely and quickly.", category: "Evacuation Planning" },
      { question: "Is fire a toy?", options: ["Yes", "No", "Sometimes", "Only on birthdays"], correctAnswer: 1, type: "postTest", forRoles: ["kid"], order: 5, explanation: "Fire is dangerous and can hurt you. It is never a toy.", category: "Fire Prevention" },
      { question: "How many ways out of your house should you know?", options: ["None", "One", "At least two", "Only windows"], correctAnswer: 2, type: "postTest", forRoles: ["kid"], order: 6, explanation: "You should always know at least two ways out of every room in case one exit is blocked by fire.", category: "Evacuation Planning" },
      { question: "What should you do after escaping a fire?", options: ["Go back inside for your pet", "Go to the meeting place and call for help", "Watch the fire", "Try to put it out"], correctAnswer: 1, type: "postTest", forRoles: ["kid"], order: 7, explanation: "Once you are out, stay out! Go to your family meeting place and call 911. Never go back inside a burning building.", category: "Emergency Response" },
      { question: "What should you do if there is a lot of smoke?", options: ["Stand up tall to see better", "Cover your nose and crawl low", "Open a window", "Yell loudly"], correctAnswer: 1, type: "postTest", forRoles: ["kid"], order: 8, explanation: "Cover your nose and mouth with a cloth and crawl low where the air is cleaner.", category: "Emergency Response" },
      { question: "Can you hide under the bed during a fire?", options: ["Yes, it is safe", "No, firefighters cannot find you", "Only if you are scared", "Yes, fire cannot reach there"], correctAnswer: 1, type: "postTest", forRoles: ["kid"], order: 9, explanation: "Never hide during a fire! Firefighters need to find you. Get out of the building as quickly as possible.", category: "General Safety Awareness" },
      { question: "What is a fire drill?", options: ["A game with fire", "Practice escaping from a fire safely", "A tool firefighters use", "A type of alarm"], correctAnswer: 1, type: "postTest", forRoles: ["kid"], order: 10, explanation: "A fire drill is when you practice your fire escape plan so everyone knows what to do in a real emergency.", category: "Evacuation Planning" },
      // ADULT/PROFESSIONAL - Pre-Test
      { question: "What is the most common cause of house fires?", options: ["Cooking", "Heating", "Electrical", "Smoking"], correctAnswer: 0, type: "preTest", forRoles: ["adult", "professional"], order: 1, explanation: "Unattended cooking is the leading cause of home fires and home fire injuries.", category: "Kitchen Safety" },
      { question: "How often should you test your smoke alarms?", options: ["Once a year", "Every month", "Every 6 months", "Never"], correctAnswer: 1, type: "preTest", forRoles: ["adult", "professional"], order: 2, explanation: "Test smoke alarms at least once a month using the test button.", category: "Smoke Detector Knowledge" },
      { question: "What does the PASS acronym stand for when using a fire extinguisher?", options: ["Pull, Aim, Squeeze, Sweep", "Push, Aim, Squeeze, Sweep", "Pull, Arm, Shoot, Sweep", "Point, Aim, Shoot, Spray"], correctAnswer: 0, type: "preTest", forRoles: ["adult", "professional"], order: 3, explanation: "PASS: Pull the pin, Aim at the base of the fire, Squeeze the lever, Sweep from side to side.", category: "Fire Extinguisher Use" },
      { question: "Where is the best place to install a smoke alarm?", options: ["Kitchen", "Garage", "Ceiling or high on a wall", "Near a window"], correctAnswer: 2, type: "preTest", forRoles: ["adult", "professional"], order: 4, explanation: "Smoke rises, so mount alarms high on walls or on ceilings. Avoid kitchens/garages to reduce false alarms.", category: "Smoke Detector Knowledge" },
      { question: "What should you have in your home to help escape a fire?", options: ["A rope", "A ladder", "A fire escape plan", "A flashlight"], correctAnswer: 2, type: "preTest", forRoles: ["adult", "professional"], order: 5, explanation: "A practised fire escape plan ensures everyone knows how to exit quickly safely.", category: "Evacuation Planning" },
      // ADULT/PROFESSIONAL - Post-Test
      { question: "Which type of fire extinguisher is best for kitchen grease fires?", options: ["Class A", "Class B", "Class K", "Water"], correctAnswer: 2, type: "postTest", forRoles: ["adult", "professional"], order: 1, explanation: "Class K extinguishers are designed for cooking oils and greases (Kitchen fires).", category: "Fire Extinguisher Use" },
      { question: "If a fire starts in a pan while cooking, what should you do?", options: ["Throw water on it", "Slide a lid over it", "Carry it outside", "Fan the flames"], correctAnswer: 1, type: "postTest", forRoles: ["adult", "professional"], order: 2, explanation: "Slide a lid over the pan to smother the flames and turn off the heat. Never use water on grease fires.", category: "Kitchen Safety" },
      { question: "How often should you replace smoke alarm batteries?", options: ["Every month", "Every 6 months", "At least once a year", "Every 5 years"], correctAnswer: 2, type: "postTest", forRoles: ["adult", "professional"], order: 3, explanation: "Replace batteries at least once a year, or when the low-battery chirp sounds.", category: "Smoke Detector Knowledge" },
      { question: "At what height does smoke usually gather first?", options: ["Floor level", "Waist level", "Eye level", "Ceiling level"], correctAnswer: 3, type: "postTest", forRoles: ["adult", "professional"], order: 4, explanation: "Smoke is warmer than air and rises, filling the room from the ceiling down.", category: "General Safety Awareness" },
      { question: "What is the second most common cause of home fires?", options: ["Cooking", "Heating", "Electrical malfunction", "Candles"], correctAnswer: 1, type: "postTest", forRoles: ["adult", "professional"], order: 5, explanation: "Heating equipment is the second leading cause of U.S. home fires.", category: "Fire Prevention" },
      { question: "What is the recommended distance to maintain from a fire when using an extinguisher?", options: ["1 foot", "3 to 6 feet", "10 to 15 feet", "20 feet or more"], correctAnswer: 1, type: "postTest", forRoles: ["adult", "professional"], order: 6, explanation: "Stand about 3-6 feet away from the fire when using an extinguisher for effective coverage while maintaining safety.", category: "Fire Extinguisher Use" },
      { question: "What should you do if you cannot extinguish a fire within 30 seconds?", options: ["Keep trying", "Call a neighbor", "Evacuate immediately and call 911", "Open windows for ventilation"], correctAnswer: 2, type: "postTest", forRoles: ["adult", "professional"], order: 7, explanation: "If a fire cannot be controlled quickly, evacuate immediately and call emergency services. Your safety is more important.", category: "Emergency Response" },
      { question: "How should flammable liquids like gasoline be stored at home?", options: ["In any container in the kitchen", "In approved containers away from heat sources", "Near the water heater", "In the garage near electrical outlets"], correctAnswer: 1, type: "postTest", forRoles: ["adult", "professional"], order: 8, explanation: "Store flammable liquids in approved, sealed containers in well-ventilated areas away from heat, sparks, and ignition sources.", category: "Fire Prevention" },
      { question: "What is 'octopus wiring' and why is it dangerous?", options: ["A type of outdoor wiring", "Connecting too many plugs to one outlet causing overload", "Underwater electrical systems", "A brand of extension cords"], correctAnswer: 1, type: "postTest", forRoles: ["adult", "professional"], order: 9, explanation: "Octopus wiring overloads outlets by connecting too many devices, causing overheating that can start electrical fires.", category: "Electrical Safety" },
      { question: "What should every floor of your home have for fire safety?", options: ["A fire extinguisher only", "A working smoke alarm", "A fire escape ladder", "A bucket of water"], correctAnswer: 1, type: "postTest", forRoles: ["adult", "professional"], order: 10, explanation: "Every floor should have at least one working smoke alarm. Smoke alarms provide critical early warning to escape.", category: "Smoke Detector Knowledge" },
    ];

    for (const q of assessmentQuestions) {
      await prisma.assessmentQuestion.create({
        data: {
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          type: q.type,
          forRoles: q.forRoles,
          order: q.order,
          explanation: q.explanation,
          category: q.category,
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
