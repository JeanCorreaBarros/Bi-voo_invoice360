import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {

  /* =========================
     PERMISOS BASE
  ========================= */

  const permissionsList = [
    'user.create',
    'user.read',
    'user.update',
    'user.toggle',
    'user.change_password',

    'role.create',
    'role.read',
    'role.update',
    'role.delete',

    'product.create',
    'product.read',
    'product.update',
    'product.delete',

    // Gestión de empresas (tenants) — solo SUPER_ADMIN
    'company.manage'
  ]

  for (const code of permissionsList) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code }
    })
  }

  console.log('Permisos creados o verificados')

  /* =========================
     CREAR ROL SUPER ADMIN
  ========================= */

  const role = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Acceso total al sistema'
    }
  })

  /* =========================
     ASIGNAR TODOS LOS PERMISOS AL ROL
  ========================= */

  const allPermissions = await prisma.permission.findMany()

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id
      }
    })
  }

  console.log('Permisos asignados al SUPER_ADMIN')

  /* =========================
     ROL ADMIN (por empresa)
     Se asigna al primer usuario de cada empresa nueva.
     Tiene todos los permisos de negocio, pero NO company.manage
     (esa gestión de tenants queda exclusiva de SUPER_ADMIN).
  ========================= */

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador de la empresa'
    }
  })

  const businessPermissions = allPermissions.filter(
    p => p.code !== 'company.manage'
  )

  for (const permission of businessPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id
      }
    })
  }

  console.log('Rol ADMIN listo para nuevas empresas')

  /* =========================
     CREAR USUARIO ADMIN
  ========================= */

  const hashedPassword = await bcrypt.hash('Admin123*', 10)

  const user = await prisma.user.upsert({
    where: { email: 'admin@plasticoslc.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@plasticoslc.com',
      password: hashedPassword,
      active: true
    }
  })

  /* =========================
     ASIGNAR ROL AL USUARIO
  ========================= */

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id
    }
  })

  console.log('SUPER ADMIN listo con todos los permisos 🚀')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
