export async function listAuditLogs(db, { page = 1, limit = 30, module, action } = {}) {
  const take = Math.min(Number(limit) || 30, 100)
  const skip = (Number(page) - 1) * take

  const where = {
    ...(module ? { module } : {}),
    ...(action ? { action } : {})
  }

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    db.auditLog.count({ where })
  ])

  return { items, total, page: Number(page), limit: take }
}
