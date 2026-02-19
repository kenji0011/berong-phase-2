import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
// Commenting out NotificationService as it's causing import issues in ts-node
// import { NotificationService } from '../lib/notification-service'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@bfp.gov.ph',
      password: adminPassword,
      name: 'BFP Administrator',
      firstName: 'BFP',
      lastName: 'Administrator',
      age: 30,
      role: 'admin',
      isActive: true,
    },
  })
  console.log('✅ Created admin user:', adminUser.username, '/', adminUser.email)

  // Create sample users for testing
  const kidPassword = await bcrypt.hash('kid123', 10)
  const adultPassword = await bcrypt.hash('adult123', 10)
  const professionalPassword = await bcrypt.hash('pro123', 10)

  const kidUser = await prisma.user.upsert({
    where: { username: 'testkid' },
    update: {},
    create: {
      username: 'testkid',
      email: 'kid@bfp.gov.ph',
      password: kidPassword,
      name: 'Young Firefighter',
      firstName: 'Young',
      lastName: 'Firefighter',
      age: 12,
      role: 'kid',
      isActive: true,
    },
  })

  const adultUser = await prisma.user.upsert({
    where: { username: 'testadult' },
    update: {},
    create: {
      username: 'testadult',
      email: 'adult@bfp.gov.ph',
      password: adultPassword,
      name: 'John Smith',
      firstName: 'John',
      lastName: 'Smith',
      age: 25,
      role: 'adult',
      isActive: true,
    },
  })

  const professionalUser = await prisma.user.upsert({
    where: { username: 'testpro' },
    update: {},
    create: {
      username: 'testpro',
      email: 'pro@bfp.gov.ph',
      password: professionalPassword,
      name: 'Firefighter Cruz',
      firstName: 'Firefighter',
      lastName: 'Cruz',
      age: 28,
      role: 'professional',
      isActive: true,
    },
  })

  console.log('✅ Created sample users')
  console.log('   - Kid:', kidUser.username, '/', kidUser.email)
  console.log('   - Adult:', adultUser.username, '/', adultUser.email)
  console.log('   - Professional:', professionalUser.username, '/', professionalUser.email)

  // Seed carousel images
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
  ]

  for (const image of carouselImages) {
    await prisma.carouselImage.create({
      data: image,
    })
  }
  console.log('✅ Seeded carousel images')

  // Seed videos
  const videos = [
    {
      title: 'Advanced Firefighting Techniques',
      description: 'Professional firefighting methods and strategies',
      youtubeId: 'W25rzeEO740',
      category: 'professional' as const,
      duration: '15:30',
      isActive: true,
    },
    {
      title: 'Fire Code Compliance',
      description: 'Understanding fire safety regulations',
      youtubeId: 'ldPH_D60jpo',
      category: 'professional' as const,
      duration: '12:45',
      isActive: true,
    },
    {
      title: 'Emergency Response Protocols',
      description: 'Standard operating procedures for emergencies',
      youtubeId: '9XpJZv_YsGM',
      category: 'professional' as const,
      duration: '18:20',
      isActive: true,
    },
    {
      title: 'Fire Investigation Basics',
      description: 'Introduction to fire investigation techniques',
      youtubeId: '5_YeQpOXnP8',
      category: 'professional' as const,
      duration: '20:15',
      isActive: true,
    },
    {
      title: 'Hazardous Materials Handling',
      description: 'Safe handling of hazardous materials in fire scenarios',
      youtubeId: 'q_oBg1U2x9Q',
      category: 'professional' as const,
      duration: '16:40',
      isActive: true,
    },
    {
      title: 'Rescue Operations',
      description: 'Advanced rescue techniques and equipment',
      youtubeId: 'x1oo76Y_87A',
      category: 'professional' as const,
      duration: '14:25',
      isActive: true,
    },
    {
      title: 'Fire Prevention Strategies',
      description: 'Proactive fire prevention in communities',
      youtubeId: 'sCmPKeTILq4',
      category: 'professional' as const,
      duration: '11:30',
      isActive: true,
    },
  ]

  for (const video of videos) {
    await prisma.video.create({
      data: video,
    })
  }
  console.log('✅ Seeded professional videos')

  // Seed blog posts
  const blogPosts = [
    {
      title: 'Home Fire Safety Essentials',
      excerpt: 'Learn the basic fire safety measures every home should have',
      content: 'Fire safety at home is crucial for protecting your family and property. Install smoke detectors on every level of your home, especially near bedrooms. Test them monthly and replace batteries annually. Keep fire extinguishers in key locations like the kitchen and garage. Create and practice a fire escape plan with your family. Ensure everyone knows two ways out of every room and establish a meeting point outside.',
      imageUrl: '/home-fire-safety-equipment.jpg',
      category: 'adult' as const,
      authorId: adultUser.id,
      isPublished: true,
    },
    {
      title: 'Kitchen Fire Prevention',
      excerpt: 'Prevent the most common cause of home fires',
      content: 'Kitchen fires are the leading cause of home fires. Never leave cooking unattended, especially when frying, grilling, or broiling. Keep flammable items away from the stove. Clean cooking surfaces regularly to prevent grease buildup. Keep a lid nearby to smother small pan fires. Never use water on grease fires. Install a fire extinguisher in your kitchen and learn how to use it properly.',
      imageUrl: '/kitchen-fire-safety-cooking.jpg',
      category: 'adult' as const,
      authorId: adultUser.id,
      isPublished: true,
    },
    {
      title: 'Electrical Fire Safety',
      excerpt: 'Protect your home from electrical hazards',
      content: 'Electrical fires can be prevented with proper awareness. Avoid overloading outlets and power strips. Replace damaged or frayed electrical cords immediately. Use the correct wattage for light fixtures. Have a qualified electrician inspect your home regularly. Never run cords under rugs or furniture. Unplug appliances when not in use, especially heat-producing devices.',
      imageUrl: '/electrical-safety-outlets-wiring.jpg',
      category: 'adult' as const,
      authorId: adultUser.id,
      isPublished: true,
    },
    {
      title: 'Fire Escape Planning',
      excerpt: 'Create an effective evacuation plan for your family',
      content: 'A well-practiced fire escape plan can save lives. Draw a floor plan of your home showing all doors and windows. Mark two escape routes from each room. Choose an outside meeting point a safe distance from your home. Practice your escape plan at least twice a year. Make sure everyone knows how to call emergency services. Consider special needs of children, elderly, or disabled family members.',
      imageUrl: '/family-fire-escape-plan.jpg',
      category: 'adult' as const,
      authorId: adultUser.id,
      isPublished: true,
    },
    {
      title: 'Smoke Detector Maintenance',
      excerpt: 'Keep your first line of defense working properly',
      content: 'Smoke detectors are your first warning of fire. Install them on every level of your home and in every bedroom. Test detectors monthly by pressing the test button. Replace batteries at least once a year. Replace the entire unit every 10 years. Clean detectors regularly to remove dust. Consider interconnected detectors so when one sounds, they all sound.',
      imageUrl: '/smoke-detector-alarm-maintenance.jpg',
      category: 'adult' as const,
      authorId: adultUser.id,
      isPublished: true,
    },
    {
      title: 'Fire Extinguisher Guide',
      excerpt: 'Know how to use a fire extinguisher effectively',
      content: 'Remember PASS: Pull the pin, Aim at the base of the fire, Squeeze the handle, and Sweep from side to side. Keep extinguishers in accessible locations. Check pressure gauges monthly. Know the different types: Class A for ordinary combustibles, Class B for flammable liquids, Class C for electrical fires. Most home extinguishers are ABC rated for all three. Only fight small fires - if in doubt, evacuate and call 911.',
      imageUrl: '/fire-extinguisher-usage-demonstration.jpg',
      category: 'adult' as const,
      authorId: adultUser.id,
      isPublished: true,
    },
  ]

  for (const post of blogPosts) {
    const blog = await prisma.blogPost.create({
      data: post,
    })

    // Skip notification creation for seeding as it requires a user
    // Notifications will be created by the application when users interact
  }
  console.log('✅ Seeded blog posts')

  // Seed kids modules (sample 5 modules for demo)
  const kidsModules = [
    {
      title: 'Fire Safety Basics',
      description: 'Introduction to fire safety for kids',
      dayNumber: 1,
      content: 'Fire is hot and can be dangerous. We need to learn how to stay safe around fire. Today we will learn about what fire needs to burn and why we should never play with matches or lighters.',
      isActive: true,
    },
    {
      title: 'Stop, Drop, and Roll',
      description: 'What to do if your clothes catch fire',
      dayNumber: 2,
      content: 'If your clothes ever catch on fire, remember: Stop, Drop, and Roll! Stop where you are, drop to the ground, and roll over and over to put out the flames. Practice this with your family.',
      isActive: true,
    },
    {
      title: 'Smoke Detectors',
      description: 'Why smoke detectors are important',
      dayNumber: 3,
      content: 'Smoke detectors are like watchdogs that warn us when there is smoke or fire. They make a loud noise to wake us up if there is danger. We need smoke detectors in every bedroom and on every floor.',
      isActive: true,
    },
    {
      title: 'Fire Escape Plan',
      description: 'Planning how to get out of the house safely',
      dayNumber: 4,
      content: 'Every family needs a fire escape plan. Draw a map of your home and mark two ways out of every room. Choose a safe meeting place outside. Practice your escape plan with your family.',
      isActive: true,
    },
    {
      title: 'Firefighter Heroes',
      description: 'Learning about firefighters and their equipment',
      dayNumber: 5,
      content: 'Firefighters are brave heroes who help us when there are fires. They wear special suits, helmets, and use big trucks with ladders. They help people and put out fires to keep us safe.',
      isActive: true,
    },
  ]

  for (const module of kidsModules) {
    await prisma.kidsModule.upsert({
      where: { dayNumber: module.dayNumber },
      update: {},
      create: module,
    })
  }
  console.log('✅ Seeded kids modules')

  // Seed quick questions for chatbot
  const quickQuestions = [
    // Emergency Procedures
    {
      category: 'emergency' as const,
      questionText: 'What should I do if I see a fire?',
      responseText: 'If you see a fire, immediately evacuate the area and call emergency services (911 or your local emergency number). Never try to retrieve personal belongings. Once you are safe, alert others and stay at a safe distance until help arrives.',
      order: 1,
      isActive: true,
    },
    {
      category: 'emergency' as const,
      questionText: 'How do I report a fire emergency?',
      responseText: 'Call 911 (or your local emergency number) immediately. Provide your exact location, the nature of the emergency, and any relevant details about the fire. Do not hang up until the operator tells you to do so.',
      order: 2,
      isActive: true,
    },
    {
      category: 'emergency' as const,
      questionText: 'What is the emergency number?',
      responseText: 'In case of fire emergency, dial 911 (or your local emergency number). For non-emergency inquiries, you can visit your nearest BFP station or call their office during business hours.',
      order: 3,
      isActive: true,
    },

    // Fire Prevention
    {
      category: 'prevention' as const,
      questionText: 'How can I prevent home fires?',
      responseText: 'To prevent home fires: Never leave cooking unattended, keep flammable items away from heat sources, have electrical wiring checked regularly, properly store flammable liquids, and install and maintain smoke alarms.',
      order: 1,
      isActive: true,
    },
    {
      category: 'prevention' as const,
      questionText: 'What are common fire hazards?',
      responseText: 'Common fire hazards include: unattended candles, overloaded electrical outlets, faulty wiring, uncleaned dryer vents, improperly stored flammable materials, and children playing with matches or lighters.',
      order: 2,
      isActive: true,
    },
    {
      category: 'prevention' as const,
      questionText: 'How often should I inspect my home?',
      responseText: 'Conduct a home fire safety inspection monthly. Check smoke alarms, test fire extinguishers, inspect electrical cords, and ensure heating equipment is clean and properly ventilated.',
      order: 3,
      isActive: true,
    },

    // Safety Equipment
    {
      category: 'equipment' as const,
      questionText: 'How do I use a fire extinguisher?',
      responseText: 'To use a fire extinguisher, remember the acronym PASS: Pull the pin, Aim at the base of the fire, Squeeze the handle, and Sweep from side to side. Only attempt to use an extinguisher on small fires and always have an escape route.',
      order: 1,
      isActive: true,
    },
    {
      category: 'equipment' as const,
      questionText: 'How do I test my smoke alarm?',
      responseText: 'Press and hold the test button on your smoke alarm until it sounds. If it doesn\'t sound, replace the batteries immediately. Test your smoke alarms monthly and replace batteries annually.',
      order: 2,
      isActive: true,
    },
    {
      category: 'equipment' as const,
      questionText: 'What types of fire extinguishers are there?',
      responseText: 'Common fire extinguisher types: Class A (ordinary combustibles like wood/paper), Class B (flammable liquids like gasoline), Class C (electrical fires), Class D (combustible metals), and Class K (cooking oils/greases).',
      order: 3,
      isActive: true,
    },

    // General Information
    {
      category: 'general' as const,
      questionText: 'What are fire safety inspections?',
      responseText: 'Fire safety inspections ensure buildings comply with fire codes. Businesses and multi-family dwellings are required to have regular inspections. Contact your local BFP station to schedule an inspection.',
      order: 1,
      isActive: true,
    },
    {
      category: 'general' as const,
      questionText: 'How do I create a fire escape plan?',
      responseText: 'Create a home fire escape plan: Draw a map of your home, mark two ways out of each room, establish a meeting place outside, practice the drill twice a year, and ensure everyone knows how to call emergency services.',
      order: 2,
      isActive: true,
    },
  ];

  for (const question of quickQuestions) {
    await prisma.quickQuestion.create({
      data: question,
    });
  }
  console.log('✅ Seeded quick questions for chatbot');

  // Seed Assessment Questions
  const assessmentQuestions = [
    // KID - Pre-Test
    {
      question: "What is the emergency number to call in case of fire?",
      options: ["911", "123", "456", "000"],
      correctAnswer: 0,
      type: "preTest",
      forRoles: ["kid"],
      order: 1,
      explanation: "911 is the universal emergency number to call for help.",
      category: "Emergency Response",
    },
    {
      question: "What should you do if your clothes catch fire?",
      options: ["Run fast", "Stop, Drop, and Roll", "Jump up and down", "Hide under the bed"],
      correctAnswer: 1,
      type: "preTest",
      forRoles: ["kid"],
      order: 2,
      explanation: "Running makes the fire burn faster. Stop, Drop, and Roll puts the fire out.",
      category: "Emergency Response",
    },
    {
      question: "Where should you go when there is a fire?",
      options: ["Under the bed", "In the closet", "Outside to a safe meeting place", "In the bathroom"],
      correctAnswer: 2,
      type: "preTest",
      forRoles: ["kid"],
      order: 3,
      explanation: "Always go outside to your agreed meeting place so your family knows you are safe.",
      category: "Evacuation Planning",
    },
    {
      question: "Which of these is safe to play with?",
      options: ["Matches", "Lighter", "Toys", "Candles"],
      correctAnswer: 2,
      type: "preTest",
      forRoles: ["kid"],
      order: 4,
      explanation: "Matches, lighters, and candles are tools for adults, not toys. Toys are safe to play with.",
      category: "Fire Prevention",
    },
    {
      question: "Who can help us put out fires?",
      options: ["Police Officer", "Firefighter", "Doctor", "Teacher"],
      correctAnswer: 1,
      type: "preTest",
      forRoles: ["kid"],
      order: 5,
      explanation: "Firefighters are trained to put out fires and rescue people.",
      category: "General Safety Awareness",
    },

    // KID - Post-Test
    {
      question: "What does a smoke alarm do?",
      options: ["Makes music", "Beeps loudly when there is smoke", "Cooks food", "Cleans the air"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["kid"],
      order: 1,
      explanation: "Smoke alarms beep loudly to warn us if there is smoke or fire, so we can escape.",
      category: "Smoke Detector Knowledge",
    },
    {
      question: "Why should we stay low (crawl) in a fire?",
      options: ["To play a game", "Because the air is cleaner down low", "To find lost toys", "To sleep"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["kid"],
      order: 2,
      explanation: "Smoke rises up. The air is cleaner near the floor, so crawling helps you breathe.",
      category: "Evacuation Planning",
    },
    {
      question: "If a door handle is hot, should you open it?",
      options: ["Yes", "No", "Maybe", "Only if you are fast"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["kid"],
      order: 3,
      explanation: "A hot door handle means there is fire on the other side. Do not open it! Find another way out.",
      category: "Evacuation Planning",
    },
    {
      question: "What should you stick to during a fire?",
      options: ["The TV", "Your toys", "The Fire Escape Plan", "The fridge"],
      correctAnswer: 2,
      type: "postTest",
      forRoles: ["kid"],
      order: 4,
      explanation: "Follow your family's Fire Escape Plan to get out safely and quickly.",
      category: "Evacuation Planning",
    },
    {
      question: "Is fire a toy?",
      options: ["Yes", "No", "Sometimes", "Only on birthdays"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["kid"],
      order: 5,
      explanation: "Fire is dangerous and can hurt you. It is never a toy.",
      category: "Fire Prevention",
    },

    // ADULT/PROFESSIONAL - Pre-Test
    {
      question: "What is the most common cause of house fires?",
      options: ["Cooking", "Heating", "Electrical", "Smoking"],
      correctAnswer: 0,
      type: "preTest",
      forRoles: ["adult", "professional"],
      order: 1,
      explanation: "Unattended cooking is the leading cause of home fires and home fire injuries.",
      category: "Kitchen Safety",
    },
    {
      question: "How often should you test your smoke alarms?",
      options: ["Once a year", "Every month", "Every 6 months", "Never"],
      correctAnswer: 1,
      type: "preTest",
      forRoles: ["adult", "professional"],
      order: 2,
      explanation: "Test smoke alarms at least once a month using the test button.",
      category: "Smoke Detector Knowledge",
    },
    {
      question: "What does the PASS acronym stand for when using a fire extinguisher?",
      options: [
        "Pull, Aim, Squeeze, Sweep",
        "Push, Aim, Squeeze, Sweep",
        "Pull, Arm, Shoot, Sweep",
        "Point, Aim, Shoot, Spray"
      ],
      correctAnswer: 0,
      type: "preTest",
      forRoles: ["adult", "professional"],
      order: 3,
      explanation: "PASS: Pull the pin, Aim at the base of the fire, Squeeze the lever, Sweep from side to side.",
      category: "Fire Extinguisher Use",
    },
    {
      question: "Where is the best place to install a smoke alarm?",
      options: ["Kitchen", "Garage", "Ceiling or high on a wall", "Near a window"],
      correctAnswer: 2,
      type: "preTest",
      forRoles: ["adult", "professional"],
      order: 4,
      explanation: "Smoke rises, so mount alarms high on walls or on ceilings. Avoid kitchens/garages to reduce false alarms.",
      category: "Smoke Detector Knowledge",
    },
    {
      question: "What should you have in your home to help escape a fire?",
      options: ["A rope", "A ladder", "A fire escape plan", "A flashlight"],
      correctAnswer: 2,
      type: "preTest",
      forRoles: ["adult", "professional"],
      order: 5,
      explanation: "A practised fire escape plan ensures everyone knows how to exit quickly safely.",
      category: "Evacuation Planning",
    },

    // ADULT/PROFESSIONAL - Post-Test (General)
    {
      question: "Which type of fire extinguisher is best for kitchen grease fires?",
      options: ["Class A", "Class B", "Class K", "Water"],
      correctAnswer: 2,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 1,
      explanation: "Class K extinguishers are designed for cooking oils and greases (Kitchen fires).",
      category: "Fire Extinguisher Use",
    },
    {
      question: "If a fire starts in a pan while cooking, what should you do?",
      options: ["Throw water on it", "Slide a lid over it", "Carry it outside", "Fan the flames"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 2,
      explanation: "Slide a lid over the pan to smother the flames and turn off the heat. Never use water on grease fires.",
      category: "Kitchen Safety",
    },
    {
      question: "How often should you replace smoke alarm batteries?",
      options: ["Every month", "Every 6 months", "At least once a year", "Every 5 years"],
      correctAnswer: 2,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 3,
      explanation: "Replace batteries at least once a year, or when the low-battery chirp sounds.",
      category: "Smoke Detector Knowledge",
    },
    {
      question: "At what height does smoke usually gather first?",
      options: ["Floor level", "Waist level", "Eye level", "Ceiling level"],
      correctAnswer: 3,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 4,
      explanation: "Smoke is warmer than air and rises, filling the room from the ceiling down.",
      category: "General Safety Awareness",
    },
    {
      question: "What is the second most common cause of home fires?",
      options: ["Cooking", "Heating", "Electrical malfunction", "Candles"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 5,
      explanation: "Heating equipment is the second leading cause of U.S. home fires.",
      category: "Fire Prevention",
    },

    // KID - Post-Test (Additional 5 to reach 10)
    {
      question: "How many ways out of your house should you know?",
      options: ["None", "One", "At least two", "Only windows"],
      correctAnswer: 2,
      type: "postTest",
      forRoles: ["kid"],
      order: 6,
      explanation: "You should always know at least two ways out of every room in case one exit is blocked by fire.",
      category: "Evacuation Planning",
    },
    {
      question: "What should you do after escaping a fire?",
      options: ["Go back inside for your pet", "Go to the meeting place and call for help", "Watch the fire", "Try to put it out"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["kid"],
      order: 7,
      explanation: "Once you are out, stay out! Go to your family meeting place and call 911. Never go back inside a burning building.",
      category: "Emergency Response",
    },
    {
      question: "What should you do if there is a lot of smoke?",
      options: ["Stand up tall to see better", "Cover your nose and crawl low", "Open a window", "Yell loudly"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["kid"],
      order: 8,
      explanation: "Cover your nose and mouth with a cloth and crawl low where the air is cleaner.",
      category: "Emergency Response",
    },
    {
      question: "Can you hide under the bed during a fire?",
      options: ["Yes, it is safe", "No, firefighters cannot find you", "Only if you are scared", "Yes, fire cannot reach there"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["kid"],
      order: 9,
      explanation: "Never hide during a fire! Firefighters need to find you. Get out of the building as quickly as possible.",
      category: "General Safety Awareness",
    },
    {
      question: "What is a fire drill?",
      options: ["A game with fire", "Practice escaping from a fire safely", "A tool firefighters use", "A type of alarm"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["kid"],
      order: 10,
      explanation: "A fire drill is when you practice your fire escape plan so everyone knows what to do in a real emergency.",
      category: "Evacuation Planning",
    },

    // ADULT/PROFESSIONAL - Post-Test (Additional 5 to reach 10)
    {
      question: "What is the recommended distance to maintain from a fire when using an extinguisher?",
      options: ["1 foot", "3 to 6 feet", "10 to 15 feet", "20 feet or more"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 6,
      explanation: "Stand about 3-6 feet away from the fire when using an extinguisher for effective coverage while maintaining safety.",
      category: "Fire Extinguisher Use",
    },
    {
      question: "What should you do if you cannot extinguish a fire within 30 seconds?",
      options: ["Keep trying", "Call a neighbor", "Evacuate immediately and call 911", "Open windows for ventilation"],
      correctAnswer: 2,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 7,
      explanation: "If a fire cannot be controlled quickly, evacuate immediately and call emergency services. Your safety is more important.",
      category: "Emergency Response",
    },
    {
      question: "How should flammable liquids like gasoline be stored at home?",
      options: ["In any container in the kitchen", "In approved containers away from heat sources", "Near the water heater", "In the garage near electrical outlets"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 8,
      explanation: "Store flammable liquids in approved, sealed containers in well-ventilated areas away from heat, sparks, and ignition sources.",
      category: "Fire Prevention",
    },
    {
      question: "What is 'octopus wiring' and why is it dangerous?",
      options: ["A type of outdoor wiring", "Connecting too many plugs to one outlet causing overload", "Underwater electrical systems", "A brand of extension cords"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 9,
      explanation: "Octopus wiring overloads outlets by connecting too many devices, causing overheating that can start electrical fires.",
      category: "Electrical Safety",
    },
    {
      question: "What should every floor of your home have for fire safety?",
      options: ["A fire extinguisher only", "A working smoke alarm", "A fire escape ladder", "A bucket of water"],
      correctAnswer: 1,
      type: "postTest",
      forRoles: ["adult", "professional"],
      order: 10,
      explanation: "Every floor should have at least one working smoke alarm. Smoke alarms provide critical early warning to escape.",
      category: "Smoke Detector Knowledge",
    },
  ]

  for (const q of assessmentQuestions) {
    // @ts-ignore - Ignoring type error if client is outdated
    await prisma.assessmentQuestion.create({
      data: {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        type: q.type as any,
        forRoles: q.forRoles as any, // Expecting Json
        order: q.order,
        explanation: q.explanation,
        category: q.category,
        isActive: true,
      }
    })
  }
  console.log('✅ Seeded assessment questions')

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📋 Test Accounts Created:')
  console.log('Admin: admin@bfp.gov.ph / admin123')
  console.log('Kid: kid@bfp.gov.ph / kid123')
  console.log('Adult: adult@bfp.gov.ph / adult123')
  console.log('Professional: pro@bfp.gov.ph / pro123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
