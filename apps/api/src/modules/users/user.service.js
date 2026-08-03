// src/modules/users/user.service.js
import bcrypt from 'bcryptjs'
import { platformDb } from '../../lib/db.js'

/* =========================
   CREATE USER
   `db` es el TenantPrismaClient de la empresa (req.db): la conexión
   misma ya scopea los datos, no hace falta companyId.
========================= */
export async function createUser(db, companyId, data) {
  const { name, email, password, roleIds = [] } = data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error('Email already exists')
  }

  const existingDirectoryEntry = await platformDb.tenantUserDirectory.findUnique({
    where: { email }
  })
  if (existingDirectoryEntry) {
    throw new Error('Email already exists')
  }

  let finalRoleIds = roleIds
  if (finalRoleIds.length === 0) {
    const adminRole = await db.role.findFirst({ where: { name: 'ADMIN' } })
    if (adminRole) {
      finalRoleIds = [adminRole.id]
    }
  }

  const hashed = await bcrypt.hash(password, 10)

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      active: true,
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

  await platformDb.tenantUserDirectory.create({
    data: { email, companyId, userId: user.id }
  })

  return user
}

/* =========================
   UPDATE USER (NO PASSWORD)
========================= */
export async function updateUser(db, companyId, id, data) {
  const currentUser = await db.user.findUnique({ where: { id } })
  if (!currentUser) {
    throw new Error('User not found')
  }

  const { name, email, active, roleIds } = data

  const user = await db.user.update({
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

  if (email && email !== currentUser.email) {
    await platformDb.tenantUserDirectory.update({
      where: { email: currentUser.email },
      data: { email, companyId, userId: id }
    })
  }

  return user
}

/* =========================
   CHANGE PASSWORD (ADMIN)
========================= */
export async function changePassword(db, userId, newPassword) {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new Error('User not found')
  }

  const hashed = await bcrypt.hash(newPassword, 10)

  return db.user.update({
    where: { id: userId },
    data: { password: hashed }
  })
}

/* =========================
   TOGGLE ACTIVE
========================= */
export async function toggleUser(db, id) {
  const user = await db.user.findUnique({ where: { id } })
  if (!user) {
    throw new Error('User not found')
  }

  return db.user.update({
    where: { id },
    data: { active: !user.active }
  })
}

/* =========================
   LIST USERS (PAGINATED)
========================= */
export async function listUsers(db, page = 1, limit = 10) {
  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    db.user.findMany({
      skip,
      take: limit,
      include: {
        roles: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    db.user.count()
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
