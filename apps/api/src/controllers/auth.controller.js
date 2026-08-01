import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { signToken } from '../utils/jwt.js'

const prisma = new PrismaClient()

export async function login(req, res) {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      company: true,
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
    companyId: user.companyId,
    roles,
    permissions
  })

  // Quitamos el password antes de enviar
  const { password: _, ...userWithoutPassword } = user

  res.json({
    token,
    user: {
      ...userWithoutPassword,
      roles,
      permissions
    }
  })
}

export async function updateProfile(req, res) {
  try {
    const { name, email } = req.body
    const userId = req.user.id

    const existingUser = await prisma.user.findFirst({
      where: { email, id: { not: userId } }
    })
    
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está en uso' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email }
    })

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

    const user = await prisma.user.findUnique({ where: { id: userId } })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    })

    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}
