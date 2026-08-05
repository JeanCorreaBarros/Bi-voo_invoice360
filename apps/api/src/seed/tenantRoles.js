// Siembra los permisos base y el rol ADMIN dentro de la BD de UNA empresa.
// Se usa tanto al provisionar una empresa nueva (company.service.js) como
// desde el script standalone `npm run seed:tenant` en desarrollo.
export async function seedTenantRolesAndPermissions(tenantDb) {
  const permissionsList = [
    'user.create',
    'user.read',
    'user.update',
    'user.toggle',
    'user.change_password',

    'role.create',
    'role.read',
    'role.update',
    'role.delete',

    'product.create',
    'product.read',
    'product.update',
    'product.delete',

    'accounting.account.manage',
    'accounting.costcenter.manage',
    'accounting.entry.read',
    'accounting.entry.manage',
    'accounting.settings.manage',
    'accounting.audit.read',

    'pos.sell',
    'pos.manage'
  ]

  for (const code of permissionsList) {
    await tenantDb.permission.upsert({
      where: { code },
      update: {},
      create: { code }
    })
  }

  const adminRole = await tenantDb.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador de la empresa'
    }
  })

  const allPermissions = await tenantDb.permission.findMany()

  for (const permission of allPermissions) {
    await tenantDb.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id
      }
    })
  }

  return adminRole
}
