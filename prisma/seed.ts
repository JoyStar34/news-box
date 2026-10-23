import { PrismaClient } from "@prisma/client";
import { RSS_SOURCES, sourceSeedForPrisma } from "@/server/rss/sources";

const prisma = new PrismaClient();

async function main() {
  for (const source of RSS_SOURCES) {
    const row = sourceSeedForPrisma(source);
    await prisma.source.upsert({
      where: { url: source.url },
      // Preserve an administrator's existing isActive choice.
      update: row,
      create: row,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async () => {
    console.error("Source seeding failed. Check the database configuration and schema.");
    await prisma.$disconnect();
    process.exit(1);
  });
