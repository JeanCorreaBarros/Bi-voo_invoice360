import bcrypt from 'bcryptjs'
import { platformDb } from '../lib/db.js'

// Crea la primera cuenta SUPER_ADMIN de plataforma. Las cuentas de
// plataforma no tienen roles/permisos en BD: su único permiso
// (company.manage) se estampa directo en el JWT al hacer login.
async function main() {
  const hashedPassword = await bcrypt.hash('Admin123*', 10)

  await platformDb.platformUser.upsert({
    where: { email: 'admin@plasticoslc.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@plasticoslc.com',
      password: hashedPassword,
      active: true
    }
  })

  console.log('SUPER ADMIN de plataforma listo 🚀')
}

main()
  .catch(console.error)
  .finally(() => platformDb.$disconnect())
