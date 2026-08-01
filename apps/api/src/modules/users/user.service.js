// src/modules/users/user.service.js
import { prisma } from '../../lib/prisma.js'

import bcrypt from 'bcryptjs'

/* =========================
   CREATE USER
   (User no tiene scope automático porque los SUPER_ADMIN
   no pertenecen a ninguna empresa, así que companyId se
   estampa a mano aquí)
========================= */
export async function createUser(companyId, data) {
  const { name, email, password, roleIds = [] } = data

  const existing = await prisma.user.findUnique({
    where: { email }
  })

  if (existing) {
    throw new Error('Email already exists')
  }

  let finalRoleIds = roleIds
  if (finalRoleIds.length === 0) {
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } })
    if (adminRole) {
      finalRoleIds = [adminRole.id]
    }
  }

  const hashed = await bcrypt.hash(password, 10)

  return prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      active: true,
      companyId,
      roles: {
        create: finalRoleIds.map(roleId => ({
          role: { connect: { id: roleId } }
        }))
      }
    },
    include: {
      roles: {
        include: { role: true }
      }
    }
  })
}

async function assertSameCompany(companyId, id) {
  const user = await prisma.user.findUnique({ where: { id } })

  // Si companyId es null (SUPER_ADMIN), le permitimos acceso a cualquier usuario
  if (!user || (companyId !== null && user.companyId !== companyId)) {
    throw new Error('User not found')
  }

  return user
}

/* =========================
   UPDATE USER (NO PASSWORD)
========================= */
export async function updateUser(companyId, id, data) {
  await assertSameCompany(companyId, id)

  const { name, email, active, roleIds } = data

  return prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      active,
      roles: roleIds
        ? {
            deleteMany: {},
            create: roleIds.map(roleId => ({
              role: { connect: { id: roleId } }
            }))
          }
        : undefined
    },
    include: {
      roles: {
        include: { role: true }
      }
    }
  })
}

/* =========================
   CHANGE PASSWORD (ADMIN)
========================= */
export async function changePassword(companyId, userId, newPassword) {
  await assertSameCompany(companyId, userId)

  const hashed = await bcrypt.hash(newPassword, 10)

  return prisma.user.update({
    where: { id: userId },
    data: { password: hashed }
  })
}

/* =========================
   TOGGLE ACTIVE
========================= */
export async function toggleUser(companyId, id) {
  const user = await assertSameCompany(companyId, id)

  return prisma.user.update({
    where: { id },
    data: { active: !user.active }
  })
}

/* =========================
   LIST USERS (PAGINATED)
========================= */
export async function listUsers(companyId, page = 1, limit = 10) {
  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      skip,
      take: limit,
      include: {
        roles: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where: { companyId } })
  ])

  return {
    data: users,
    meta: {
      total,
      page,
      lastPage: Math.ceil(total / limit)
    }
  }
}
