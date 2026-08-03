import { getTenantClient } from '../lib/db.js'

// Debe ir después de `auth`. Exige que el usuario pertenezca a una empresa
// (los SUPER_ADMIN sin companyId no pasan por aquí, usan rutas propias)
// y cuelga en req.db el Prisma Client conectado a la BD física de esa empresa.
export async function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(403).json({ message: 'User is not associated with a company' })
  }

  try {
    req.db = await getTenantClient(req.tenantId)
    next()
  } catch (err) {
    res.status(403).json({ message: err.message })
  }
}
