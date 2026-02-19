import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Ensure database connection is established
async function ensureConnection() {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw new Error('Database connection failed');
  }
}

export async function registerUser(
  username: string,
  password: string,
  firstName: string,
  lastName: string,
  age: number,
  enhancedFields?: {
    middleName?: string;
    email?: string;
    gender?: string;
    barangay?: string;
    school?: string;
    schoolOther?: string;
    occupation?: string;
    occupationOther?: string;
    gradeLevel?: string;
    dataPrivacyConsent?: boolean;
    profileCompleted?: boolean;
    preTestScore?: number | null;
    preTestCompletedAt?: Date | null;
    engagementPoints?: number;
  }
) {
  try {
    await ensureConnection();

    // Validate input
    if (!username || !password || !firstName || !lastName || !age) {
      throw new Error('All fields are required');
    }

    // Validate username (alphanumeric, 3-20 characters)
    if (username.length < 3 || username.length > 20) {
      throw new Error('Username must be between 3 and 20 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new Error('Username already taken. Please choose another one.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine role based on age
    const role = age < 18 ? UserRole.kid : UserRole.adult;

    // Combine name for backward compatibility
    const middleInitial = enhancedFields?.middleName ? ` ${enhancedFields.middleName.charAt(0)}.` : '';
    const fullName = `${firstName}${middleInitial} ${lastName}`;

    const user = await prisma.user.create({
      data: {
        username,
        email: enhancedFields?.email || null,
        password: hashedPassword,
        name: fullName,
        firstName,
        lastName,
        middleName: enhancedFields?.middleName,
        age,
        role,
        // Enhanced fields
        gender: enhancedFields?.gender,
        barangay: enhancedFields?.barangay,
        school: enhancedFields?.school,
        schoolOther: enhancedFields?.schoolOther,
        occupation: enhancedFields?.occupation,
        occupationOther: enhancedFields?.occupationOther,
        gradeLevel: enhancedFields?.gradeLevel,
        dataPrivacyConsent: enhancedFields?.dataPrivacyConsent ?? false,
        profileCompleted: enhancedFields?.profileCompleted ?? false,
        preTestScore: enhancedFields?.preTestScore,
        preTestCompletedAt: enhancedFields?.preTestCompletedAt,
        engagementPoints: enhancedFields?.engagementPoints ?? 0,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        age: true,
        isActive: true,
        createdAt: true,
        barangay: true,
        school: true,
        occupation: true,
        gender: true,
        gradeLevel: true,
        preTestScore: true,
        postTestScore: true,
        profileCompleted: true,
        engagementPoints: true,
      },
    });

    // Determine permissions based on role
    const permissions = determinePermissions(role);

    return {
      success: true,
      user: {
        ...user,
        permissions,
        createdAt: user.createdAt.toISOString(),
      }
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
}

export async function loginUser(identifier: string, password: string) {
  try {
    await ensureConnection();

    // Validate input
    if (!identifier || !password) {
      throw new Error('Username and password are required');
    }

    // Try to find user by username first, then by email
    let user = await prisma.user.findUnique({
      where: { username: identifier },
    });

    // If not found by username, try email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: identifier },
      });
    }

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid username/email or password');
    }

    // Determine permissions based on role
    const permissions = determinePermissions(user.role);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        age: user.age,
        permissions,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        // Enhanced profile fields
        profileCompleted: user.profileCompleted,
        barangay: user.barangay,
        school: user.school,
        occupation: user.occupation,
        gender: user.gender,
        preTestScore: user.preTestScore,
        postTestScore: user.postTestScore,
        engagementPoints: user.engagementPoints,
      },
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
}

// Determine permissions based on role
function determinePermissions(role: UserRole) {
  switch (role) {
    case UserRole.admin:
      return {
        accessKids: true,
        accessAdult: true,
        accessProfessional: true,
        isAdmin: true,
      };
    case UserRole.professional:
      return {
        accessKids: true,
        accessAdult: true,
        accessProfessional: true,
        isAdmin: false,
      };
    case UserRole.adult:
      return {
        accessKids: false,
        accessAdult: true,
        accessProfessional: false,
        isAdmin: false,
      };
    case UserRole.kid:
      return {
        accessKids: true,
        accessAdult: false,
        accessProfessional: false,
        isAdmin: false,
      };
    default:
      return {
        accessKids: false,
        accessAdult: false,
        accessProfessional: false,
        isAdmin: false,
      };
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

