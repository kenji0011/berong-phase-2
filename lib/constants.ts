/**
 * BFP Berong E-Learning Platform
 * Constants for Enhanced Analytics & Assessment Module
 * Location: Santa Cruz, Laguna, Philippines
 */

// ============================================
// BARANGAYS OF SANTA CRUZ, LAGUNA
// ============================================
export const BARANGAYS_SANTA_CRUZ = [
  // Poblacion (5 barangays)
  "Barangay I (Poblacion)",
  "Barangay II (Poblacion)",
  "Barangay III (Poblacion)",
  "Barangay IV (Poblacion)",
  "Barangay V (Poblacion)",

  // Other Barangays (21) - Alphabetical
  "Alipit",
  "Bagumbayan",
  "Bubukal",
  "Calios",
  "Duhat",
  "Gatid",
  "Jasaan",
  "Labuin",
  "Malinao",
  "Oogong",
  "Pagsawitan",
  "Palasan",
  "Patimbao",
  "San Jose",
  "San Juan",
  "San Pablo Norte",
  "San Pablo Sur",
  "Santisima Cruz",
  "Santo Angel Central",
  "Santo Angel Norte",
  "Santo Angel Sur",
] as const;

// ============================================
// SCHOOLS IN SANTA CRUZ, LAGUNA
// ============================================

// Higher Education (Colleges & Universities)
export const COLLEGES = [
  "Laguna State Polytechnic University (LSPU) - Main Campus",
  "Laguna University (LU)",
  "Union College of Laguna (UCL)",
  "STI College - Santa Cruz",
  "ACTS Computer College",
  "AMA Computer Learning Center (ACLC)",
  "Laguna Santiago Educational Foundation (LSEF)",
] as const;

// Public High Schools
export const PUBLIC_HIGH_SCHOOLS = [
  "Pedro Guevara Memorial National High School (PGMNHS)",
  "Santa Cruz Integrated National High School",
  "Laguna Science Integrated High School",
] as const;

// Private High Schools
export const PRIVATE_HIGH_SCHOOLS = [
  "Santa Cruz Institute (SCI)",
  "Immaculate Conception Catholic School (ICCS)",
  "Basic Christian International School (BCIS)",
  "Saint Therese School",
  "Laguna Sino-Filipino Educational Foundation",
  "Southport International School",
] as const;

// Public Elementary Schools
export const PUBLIC_ELEMENTARY_SCHOOLS = [
  "Santa Cruz Central Elementary School (Escolapia)",
  "Bagumbayan Elementary School",
  "Bubukal Elementary School",
  "Duhat Elementary School",
  "Gatid Elementary School",
  "Labuin Elementary School",
  "Oogong Elementary School",
  "Pagsawitan Elementary School",
  "Patimbao Elementary School",
  "San Jose Elementary School",
  "Santissima Cruz Elementary School",
] as const;

// Combined schools list for dropdowns
export const ALL_SCHOOLS = [
  ...COLLEGES,
  ...PUBLIC_HIGH_SCHOOLS,
  ...PRIVATE_HIGH_SCHOOLS,
  ...PUBLIC_ELEMENTARY_SCHOOLS,
  "Other (Please specify)",
] as const;

// Categorized schools for advanced filtering
export const SCHOOLS_BY_CATEGORY = {
  "College/University": COLLEGES,
  "Public High School": PUBLIC_HIGH_SCHOOLS,
  "Private High School": PRIVATE_HIGH_SCHOOLS,
  "Elementary School": PUBLIC_ELEMENTARY_SCHOOLS,
} as const;

// ============================================
// OCCUPATION CATEGORIES
// ============================================
export const OCCUPATION_CATEGORIES = [
  "Student",
  "Employed (Government)",
  "Employed (Private Sector)",
  "Self-Employed/Business Owner",
  "Unemployed",
  "Retired",
  "Homemaker",
  "Other (Please specify)",
] as const;

// ============================================
// GENDER OPTIONS
// ============================================
export const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Prefer not to say",
] as const;

// ============================================
// GRADE LEVELS (For Kids/Students)
// ============================================
export const GRADE_LEVELS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

// ============================================
// ASSESSMENT CATEGORIES
// ============================================
export const ASSESSMENT_CATEGORIES = [
  "Fire Prevention",
  "Emergency Response",
  "Electrical Safety",
  "Kitchen Safety",
  "Evacuation Planning",
  "Fire Extinguisher Use",
  "Smoke Detector Knowledge",
  "General Safety Awareness",
] as const;

// ============================================
// POST-TEST UNLOCK CONDITIONS
// ============================================
export const POST_TEST_UNLOCK_THRESHOLDS = {
  // Minimum modules completed (out of 5 SafeScape modules)
  MIN_MODULES_COMPLETED: 3,

  // Minimum time spent on platform (in minutes)
  MIN_TIME_SPENT_MINUTES: 30,

  // Minimum engagement points (quizzes, games, videos watched)
  MIN_ENGAGEMENT_POINTS: 50,

  // Minimum quizzes passed (disabled - modules are sufficient)
  MIN_QUIZZES_PASSED: 0,

  // Days since registration (to prevent rushing)
  MIN_DAYS_SINCE_REGISTRATION: 1,
} as const;

// ============================================
// SCORING THRESHOLDS
// ============================================
export const SCORE_RATINGS = {
  EXCELLENT: { min: 90, label: "Excellent", color: "#10b981" }, // green
  VERY_GOOD: { min: 80, label: "Very Good", color: "#3b82f6" }, // blue
  GOOD: { min: 70, label: "Good", color: "#f59e0b" }, // amber
  FAIR: { min: 60, label: "Fair", color: "#f97316" }, // orange
  POOR: { min: 0, label: "Needs Improvement", color: "#ef4444" }, // red
} as const;

// ============================================
// ENGAGEMENT POINTS SYSTEM
// ============================================
export const ENGAGEMENT_POINTS = {
  QUIZ_COMPLETED: 10,
  GAME_PLAYED: 5,
  VIDEO_WATCHED: 3,
  MODULE_COMPLETED: 15,
  SAFESCAPE_SECTION_COMPLETED: 5,
  DAILY_LOGIN: 2,
  PRE_TEST_COMPLETED: 20,
  POST_TEST_COMPLETED: 30,
} as const;

// ============================================
// ANALYTICS CACHE DURATION (Production)
// ============================================
export const ANALYTICS_CACHE_DURATION = {
  OVERVIEW_STATS: 3600, // 1 hour
  BARANGAY_SCORES: 3600, // 1 hour
  KNOWLEDGE_GAPS: 1800, // 30 minutes
  DEMOGRAPHICS: 7200, // 2 hours
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get score rating based on percentage
 */
export function getScoreRating(percentage: number) {
  if (percentage >= SCORE_RATINGS.EXCELLENT.min) return SCORE_RATINGS.EXCELLENT;
  if (percentage >= SCORE_RATINGS.VERY_GOOD.min) return SCORE_RATINGS.VERY_GOOD;
  if (percentage >= SCORE_RATINGS.GOOD.min) return SCORE_RATINGS.GOOD;
  if (percentage >= SCORE_RATINGS.FAIR.min) return SCORE_RATINGS.FAIR;
  return SCORE_RATINGS.POOR;
}

/**
 * Check if user meets post-test unlock requirements
 */
export function canUnlockPostTest(userStats: {
  modulesCompleted: number;
  timeSpentMinutes: number;
  engagementPoints: number;
  quizzesPassed: number;
  daysSinceRegistration: number;
}): { unlocked: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (userStats.modulesCompleted < POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED) {
    reasons.push(`Complete at least ${POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED} modules (${userStats.modulesCompleted}/${POST_TEST_UNLOCK_THRESHOLDS.MIN_MODULES_COMPLETED})`);
  }

  if (userStats.timeSpentMinutes < POST_TEST_UNLOCK_THRESHOLDS.MIN_TIME_SPENT_MINUTES) {
    reasons.push(`Spend at least ${POST_TEST_UNLOCK_THRESHOLDS.MIN_TIME_SPENT_MINUTES} minutes learning (${userStats.timeSpentMinutes}/${POST_TEST_UNLOCK_THRESHOLDS.MIN_TIME_SPENT_MINUTES})`);
  }

  if (userStats.engagementPoints < POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS) {
    reasons.push(`Earn ${POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS} engagement points (${userStats.engagementPoints}/${POST_TEST_UNLOCK_THRESHOLDS.MIN_ENGAGEMENT_POINTS})`);
  }

  if (userStats.quizzesPassed < POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED) {
    reasons.push(`Pass at least ${POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED} quizzes (${userStats.quizzesPassed}/${POST_TEST_UNLOCK_THRESHOLDS.MIN_QUIZZES_PASSED})`);
  }

  if (userStats.daysSinceRegistration < POST_TEST_UNLOCK_THRESHOLDS.MIN_DAYS_SINCE_REGISTRATION) {
    reasons.push(`Account must be at least ${POST_TEST_UNLOCK_THRESHOLDS.MIN_DAYS_SINCE_REGISTRATION} day(s) old`);
  }

  return {
    unlocked: reasons.length === 0,
    reasons,
  };
}

/**
 * Calculate percentage improvement between two scores
 */
export function calculateImprovement(preScore: number, postScore: number, maxScore: number = 100): {
  absolute: number;
  percentage: number;
  improved: boolean;
} {
  const absolute = postScore - preScore;
  const percentage = maxScore > 0 ? (absolute / maxScore) * 100 : 0;

  return {
    absolute,
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    improved: absolute > 0,
  };
}

/**
 * Export type for TypeScript usage
 */
export type Barangay = typeof BARANGAYS_SANTA_CRUZ[number];
export type School = typeof ALL_SCHOOLS[number];
export type Occupation = typeof OCCUPATION_CATEGORIES[number];
export type Gender = typeof GENDER_OPTIONS[number];
export type GradeLevel = typeof GRADE_LEVELS[number];
export type AssessmentCategory = typeof ASSESSMENT_CATEGORIES[number];
