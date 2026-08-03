import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { signToken } from '../utils/jwt.js'
import { platformDb, getTenantClient } from '../lib/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AVATAR_DIR = path.resolve(__dirname, '../../uploads/avatars')

export async function login(req, res) {
  const { email, password } = req.body

  // 1) ¿Es una cuenta de plataforma (SUPER_ADMIN)? Vive en la BD platform,
  //    no pertenece a ninguna empresa.
  const platformUser = await platformDb.platformUser.findUnique({ where: { email } })

  if (platformUser) {
    if (!platformUser.active) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, platformUser.password)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const roles = ['SUPER_ADMIN']
    const permissions = ['company.manage']

    const token = signToken({ id: platformUser.id, companyId: null, roles, permissions })
    const { password: _, ...userWithoutPassword } = platformUser

    return res.json({
      token,
      user: { ...userWithoutPassword, companyId: null, roles, permissions }
    })
  }

  // 2) Usuario de una empresa: la BD platform solo dice a qué empresa
  //    pertenece; los datos de login (password, roles) viven en la BD del tenant.
  const directoryEntry = await platformDb.tenantUserDirectory.findUnique({ where: { email } })

  if (!directoryEntry) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const db = await getTenantClient(directoryEntry.companyId)

  const user = await db.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      }
    }
  })

  if (!user || !user.active) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const roles = user.roles.map(r => r.role.name)

  const permissions = user.roles.flatMap(r =>
    r.role.permissions.map(p => p.permission.code)
  )

  const token = signToken({
    id: user.id,
    companyId: directoryEntry.companyId,
    roles,
    permissions
  })

  // Quitamos el password antes de enviar
  const { password: _, ...userWithoutPassword } = user

  res.json({
    token,
    user: {
      ...userWithoutPassword,
      companyId: directoryEntry.companyId,
      roles,
      permissions
    }
  })
}

// Resuelve el "modelo usuario" correcto según si quien llama es una cuenta
// de plataforma (sin empresa) o un usuario de una empresa (su BD de tenant).
async function resolveUserModel(req) {
  if (req.tenantId) {
    const db = await getTenantClient(req.tenantId)
    return db.user
  }
  return platformDb.platformUser
}

export async function updateProfile(req, res) {
  try {
    const { name, email } = req.body
    const userId = req.user.id
    const userModel = await resolveUserModel(req)

    const currentUser = await userModel.findUnique({ where: { id: userId } })

    const existingUser = await userModel.findFirst({
      where: { email, id: { not: userId } }
    })

    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está en uso' })
    }

    const user = await userModel.update({
      where: { id: userId },
      data: { name, email }
    })

    // Si es un usuario de empresa, el directorio de login debe reflejar el nuevo email.
    if (req.tenantId && currentUser && currentUser.email !== email) {
      await platformDb.tenantUserDirectory.update({
        where: { email: currentUser.email },
        data: { email, companyId: req.tenantId, userId }
      }).catch(() => {})
    }

    const { password: _, ...userWithoutPassword } = user
    res.json(userWithoutPassword)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function updateAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ningún archivo' })
    }

    const userId = req.user.id
    const userModel = await resolveUserModel(req)

    const currentUser = await userModel.findUnique({ where: { id: userId } })
    if (!currentUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`

    const user = await userModel.update({
      where: { id: userId },
      data: { avatar: avatarUrl }
    })

    // Limpieza best-effort del avatar anterior (nombre único por subida, no se pisan entre sí).
    if (currentUser.avatar && currentUser.avatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(AVATAR_DIR, path.basename(currentUser.avatar))
      fs.unlink(oldPath, () => {})
    }

    const { password: _, ...userWithoutPassword } = user
    res.json(userWithoutPassword)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id
    const userModel = await resolveUserModel(req)

    const user = await userModel.findUnique({ where: { id: userId } })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await userModel.update({
      where: { id: userId },
      data: { password: hashed }
    })

    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}
