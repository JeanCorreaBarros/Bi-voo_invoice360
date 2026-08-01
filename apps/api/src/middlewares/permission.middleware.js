export function hasPermission(permission) {
  return (req, res, next) => {
    if (!req.user?.permissions?.includes(permission)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    next()
  }
}
