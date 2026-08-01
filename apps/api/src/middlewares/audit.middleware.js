import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function audit({ action, module }) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = async (data) => {
      try {
        if (req.user && data?.entity) {
          await prisma.auditLog.create({
            data: {
              userId: req.user.id,
              action,
              module,
              entityId: String(data.entity.id),
              before: data.before ?? null,
              after: data.entity,
              ip: req.ip
            }
          })
        }
      } catch (err) {
        console.error('Audit error:', err)
      }

      return originalJson(data)
    }

    next()
  }
}
