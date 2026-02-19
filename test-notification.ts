
import { PrismaClient } from '@prisma/client';
import { NotificationService } from './lib/notification-service';
import { ContentCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function testNotification() {
    console.log('--- Starting Notification Logic Test ---');

    // 1. Check if we have users
    const userCount = await prisma.user.count();
    console.log(`Total Users in DB: ${userCount}`);

    if (userCount === 0) {
        console.error('No users found! Cannot test notifications.');
        return;
    }

    // 2. Create a dummy notification for 'adult' category
    const testCategory = 'adult' as ContentCategory;
    console.log(`\nSimulating Blog Post creation for category: ${testCategory}`);

    // Manually run the query identifying users
    const matchingUsers = await prisma.user.findMany({
        where: {
            isActive: true,
            OR: [
                { role: 'admin' },
                { role: 'professional' },
                { role: 'adult' },
            ]
        },
        select: { id: true, role: true, username: true }
    });

    console.log(`Expected recipients (${matchingUsers.length}):`);
    matchingUsers.forEach(u => console.log(` - [${u.id}] ${u.username} (${u.role})`));

    // 3. Call the service
    console.log('\nCalling NotificationService.createNotification...');
    const result = await NotificationService.createNotification({
        title: 'TEST NOTIFICATION',
        message: 'This is a test message from the debug script.',
        type: 'blog',
        category: testCategory,
        resourceId: 99999 // Dummy ID
    });

    if (result.success) {
        console.log(`\nSuccess! Created ${result.notifications?.length} notifications.`);
        // Verify one
        if (result.notifications && result.notifications.length > 0) {
            console.log('Sample notification:', result.notifications[0]);
        }
    } else {
        console.error('\nFailed:', result.error);
    }

    console.log('--- Test Complete ---');
}

testNotification()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
