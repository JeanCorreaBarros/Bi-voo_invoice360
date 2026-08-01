import { getTenantClient } from '../lib/prisma.js'

// Debe ir después de `auth`. Exige que el usuario pertenezca a una empresa
// (los SUPER_ADMIN sin companyId no pasan por aquí, usan rutas propias)
// y cuelga en req.db un Prisma Client con el companyId ya aplicado.
export function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(403).json({ message: 'User is not associated with a company' })
  }

  req.db = getTenantClient(req.tenantId)
  next()
}
