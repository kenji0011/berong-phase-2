/**
 * Hardcoded fallback questions for when the database is empty or not seeded.
 * These questions are used for both pre-test and post-test assessments.
 * They provide the same content as seed-assessment.ts but work independently of the DB.
 */

export interface FallbackQuestion {
    id: number
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
    category: string
    difficulty: string
    forRoles: string[]
}

export const FALLBACK_ASSESSMENT_QUESTIONS: FallbackQuestion[] = [
    // FIRE PREVENTION (3 questions)
    {
        id: -1,
        question: "What is the best way to prevent electrical fires at home?",
        options: [
            "Use multiple extension cords",
            "Overload electrical outlets",
            "Regularly check and replace damaged wires",
            "Leave appliances plugged in when not in use"
        ],
        correctAnswer: 2,
        explanation: "Regularly checking and replacing damaged wires prevents electrical fires. Damaged wires can cause short circuits and sparks.",
        category: "Fire Prevention",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },
    {
        id: -2,
        question: "How often should you clean your stove and cooking area to prevent kitchen fires?",
        options: [
            "Once a year",
            "Once a month",
            "After every cooking session",
            "Only when it looks very dirty"
        ],
        correctAnswer: 2,
        explanation: "Cleaning after every cooking session removes grease buildup, which is highly flammable and a common cause of kitchen fires.",
        category: "Kitchen Safety",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },
    {
        id: -3,
        question: "Which of these materials is MOST flammable and should be kept away from heat sources?",
        options: [
            "Metal pans",
            "Ceramic plates",
            "Cooking oil and gasoline",
            "Glass containers"
        ],
        correctAnswer: 2,
        explanation: "Cooking oil and gasoline are highly flammable liquids that can ignite quickly when exposed to heat or sparks.",
        category: "Fire Prevention",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },

    // EMERGENCY RESPONSE (3 questions)
    {
        id: -4,
        question: "What is the FIRST thing you should do if you discover a small fire?",
        options: [
            "Try to put it out yourself immediately",
            "Alert others and call for help (911 or BFP)",
            "Take a video of the fire",
            "Run away without telling anyone"
        ],
        correctAnswer: 1,
        explanation: "Safety first! Alert others and call emergency services immediately. Even small fires can grow quickly and become dangerous.",
        category: "Emergency Response",
        difficulty: "Medium",
        forRoles: ["kid", "adult", "professional"]
    },
    {
        id: -5,
        question: "If your clothes catch fire, what should you do?",
        options: [
            "Run to find water",
            "Stop, Drop, and Roll",
            "Take off your clothes quickly",
            "Wave your arms to put out the flames"
        ],
        correctAnswer: 1,
        explanation: "STOP, DROP, and ROLL immediately. Running makes the fire burn faster. Rolling on the ground smothers the flames.",
        category: "Emergency Response",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },
    {
        id: -6,
        question: "In case of fire, why should you crawl low under smoke?",
        options: [
            "It's faster to crawl than to walk",
            "Smoke and toxic gases rise, so cleaner air is near the floor",
            "To avoid being seen by the fire",
            "It's easier to find the door while crawling"
        ],
        correctAnswer: 1,
        explanation: "Hot smoke and toxic gases rise to the ceiling. Cleaner, cooler air stays near the floor, making it safer to breathe while escaping.",
        category: "Emergency Response",
        difficulty: "Medium",
        forRoles: ["kid", "adult", "professional"]
    },

    // ELECTRICAL SAFETY (2 questions)
    {
        id: -7,
        question: "What should you NEVER do with electrical appliances near water?",
        options: [
            "Unplug them when not in use",
            "Use them with wet hands or near sinks",
            "Keep them on a dry surface",
            "Read the instruction manual"
        ],
        correctAnswer: 1,
        explanation: "Never use electrical appliances with wet hands or near water. Water conducts electricity and can cause electric shock or fires.",
        category: "Electrical Safety",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },
    {
        id: -8,
        question: "What is 'octopus wiring' and why is it dangerous?",
        options: [
            "A type of cable used by electricians",
            "Connecting multiple extension cords to one outlet, causing overload",
            "A safety device that prevents electrical fires",
            "A special wiring system for large buildings"
        ],
        correctAnswer: 1,
        explanation: "'Octopus wiring' overloads outlets by connecting too many devices, causing overheating and potential electrical fires.",
        category: "Electrical Safety",
        difficulty: "Medium",
        forRoles: ["adult", "professional"]
    },

    // KITCHEN SAFETY (2 questions)
    {
        id: -9,
        question: "If a cooking oil fire starts in your pan, what should you do?",
        options: [
            "Pour water on the fire",
            "Cover the pan with a metal lid to smother the flames",
            "Move the pan to the sink",
            "Blow on the fire to put it out"
        ],
        correctAnswer: 1,
        explanation: "Never pour water on an oil fire! Cover the pan with a metal lid to cut off oxygen and smother the flames. Turn off the heat.",
        category: "Kitchen Safety",
        difficulty: "Medium",
        forRoles: ["adult", "professional"]
    },
    {
        id: -10,
        question: "Why should you never leave cooking unattended?",
        options: [
            "The food might get overcooked",
            "Someone might steal the food",
            "Unattended cooking is a leading cause of home fires",
            "It wastes electricity or gas"
        ],
        correctAnswer: 2,
        explanation: "Unattended cooking is the leading cause of home fires. Food can overheat, catch fire, or cause pots to boil over and ignite.",
        category: "Kitchen Safety",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },

    // EVACUATION PLANNING (2 questions)
    {
        id: -11,
        question: "Why is it important to have a family fire escape plan?",
        options: [
            "It's required by law",
            "To practice fire drills for fun",
            "So everyone knows how to exit safely and where to meet during a fire",
            "To impress your neighbors"
        ],
        correctAnswer: 2,
        explanation: "A fire escape plan ensures everyone knows the exits, escape routes, and a safe meeting spot outside, reducing panic during emergencies.",
        category: "Evacuation Planning",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },
    {
        id: -12,
        question: "When evacuating a burning building, what should you do with doors before opening them?",
        options: [
            "Kick them open immediately",
            "Touch the doorknob and door with the back of your hand to check for heat",
            "Open them wide for fresh air",
            "Look through the keyhole first"
        ],
        correctAnswer: 1,
        explanation: "Check if the door is hot before opening. A hot door means fire is on the other side. Use an alternate exit if the door is hot.",
        category: "Evacuation Planning",
        difficulty: "Medium",
        forRoles: ["adult", "professional"]
    },

    // FIRE EXTINGUISHER USE (2 questions)
    {
        id: -13,
        question: "What does the acronym 'PASS' stand for when using a fire extinguisher?",
        options: [
            "Point, Aim, Spray, Stop",
            "Pull, Aim, Squeeze, Sweep",
            "Push, Activate, Spray, Smother",
            "Prepare, Alert, Spray, Secure"
        ],
        correctAnswer: 1,
        explanation: "PASS stands for: Pull the pin, Aim at the base of the fire, Squeeze the handle, Sweep from side to side.",
        category: "Fire Extinguisher Use",
        difficulty: "Medium",
        forRoles: ["adult", "professional"]
    },
    {
        id: -14,
        question: "Where should you aim a fire extinguisher when fighting a fire?",
        options: [
            "At the flames",
            "At the smoke",
            "At the base of the fire",
            "At the ceiling"
        ],
        correctAnswer: 2,
        explanation: "Aim at the BASE of the fire, not the flames. This targets the fuel source and is more effective at extinguishing the fire.",
        category: "Fire Extinguisher Use",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },

    // SMOKE DETECTOR KNOWLEDGE (1 question)
    {
        id: -15,
        question: "How often should you test your smoke detectors?",
        options: [
            "Once a year",
            "Every 6 months",
            "Once a month",
            "Only when they beep"
        ],
        correctAnswer: 2,
        explanation: "Test smoke detectors monthly by pressing the test button. Replace batteries annually or when the low-battery alert sounds.",
        category: "Smoke Detector Knowledge",
        difficulty: "Easy",
        forRoles: ["adult", "professional"]
    },

    // GENERAL SAFETY AWARENESS (1 question)
    {
        id: -16,
        question: "What is the emergency hotline number for the Bureau of Fire Protection (BFP) in the Philippines?",
        options: [
            "117",
            "911",
            "143",
            "166"
        ],
        correctAnswer: 1,
        explanation: "911 is the national emergency hotline in the Philippines for all emergencies, including fires. BFP also has local hotlines like 426-0219.",
        category: "General Safety Awareness",
        difficulty: "Easy",
        forRoles: ["kid", "adult", "professional"]
    },
]

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

/**
 * Shuffle the options of a question while keeping track of the correct answer.
 * Returns a new question object with shuffled options and updated correctAnswer index.
 */
export function shuffleQuestionOptions<T extends { options: string[], correctAnswer: number }>(
    question: T
): T {
    const correctOptionText = question.options[question.correctAnswer]
    const shuffledOptions = shuffleArray(question.options)
    const newCorrectIndex = shuffledOptions.indexOf(correctOptionText)

    return {
        ...question,
        options: shuffledOptions,
        correctAnswer: newCorrectIndex,
    }
}

/**
 * Get fallback questions filtered by role, with shuffled question order.
 * Options are NOT shuffled to keep correctAnswer index aligned for grading.
 * Used when the database has no seeded questions.
 */
export function getFallbackQuestions(role: string, limit: number): {
    questions: { id: number; question: string; options: string[]; category: string; difficulty: string }[]
    usingFallback: boolean
} {
    // Filter by role
    const filtered = FALLBACK_ASSESSMENT_QUESTIONS.filter(q =>
        q.forRoles.includes(role)
    )

    // Shuffle question order
    const shuffled = shuffleArray(filtered)

    // Take up to limit
    const selected = shuffled.slice(0, limit)

    // Map to frontend shape — don't send correctAnswer to frontend
    const questions = selected.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        category: q.category,
        difficulty: q.difficulty,
    }))

    return { questions, usingFallback: true }
}

