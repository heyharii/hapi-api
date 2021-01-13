import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const testUser = await prisma.user.create({
    data: {
      email: "hari@happy5.co",
      firstName: "Hari",
      lastName: "Hari",
    },
  });
  const testAdmin = await prisma.user.create({
    data: {
      email: "administrator@happy5.co",
      firstName: "Admin",
      lastName: "Admin",
      isAdmin: true,
    },
  });

  console.log(
    `Created test user\tid: ${testUser.id} | email: ${testUser.email} `
  );
  console.log(
    `Created test admin\tid: ${testAdmin.id} | email: ${testAdmin.email} `
  );
}

main()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
