// AuditLog vive en la BD del tenant (req.db); este middleware debe ir
// después de `auth` + `requireTenant` en la cadena de la ruta.
export function audit({ action, module }) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = async (data) => {
      try {
        if (req.user && req.db && data?.entity) {
          await req.db.auditLog.create({
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
