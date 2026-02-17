
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- UserProgress Table ---')
    const userProgress = await prisma.userProgress.findMany()
    console.log(JSON.stringify(userProgress, null, 2))

    console.log('\n--- SafeScapeProgress Table ---')
    const safeScapeProgress = await prisma.safeScapeProgress.findMany()
    console.log(JSON.stringify(safeScapeProgress, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
