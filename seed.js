import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
    // Pulizia per evitare duplicati
    await prisma.rack.deleteMany();
    await prisma.aisle.deleteMany();

    const aisle = await prisma.aisle.create({
        data: {
            name: "Corsia A",
            posX: 0,
            posZ: 0,
            racks: {
                create: [
                    { posX: -1.5, posZ: 0, width: 1, height: 2.5, depth: 0.8 },
                    { posX: 0, posZ: 0, width: 1, height: 2.5, depth: 0.8 },
                    { posX: 1.5, posZ: 0, width: 1, height: 2.5, depth: 0.8 },
                ]
            }
        }
    });
    console.log("✅ Magazzino di prova creato!");
}

main().catch(console.error).finally(() => prisma.$disconnect());