import { verifyToken } from '../utils/jwt.js'

export function auth(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    const token = header.split(' ')[1]
    const decoded = verifyToken(token)

    req.user = decoded
    req.tenantId = decoded.companyId ?? null
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
