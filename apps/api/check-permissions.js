// check-permissions.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Check which role the current admin user has and its permissions
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } }
            }
          }
        }
      }
    }
  });

  console.log("\n=== USERS & PERMISSIONS ===");
  for (const u of users) {
    const perms = u.roles.flatMap(r => r.role.permissions.map(p => p.permission.code));
    console.log(`\n👤 ${u.name} (${u.email})`);
    console.log(`   Roles: ${u.roles.map(r => r.role.name).join(", ") || "NONE"}`);
    console.log(`   Perms: ${perms.join(", ") || "NONE"}`);
    console.log(`   Has user.read: ${perms.includes("user.read")}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
