import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import {
  platformDb,
  getTenantClient,
  getTenantClientByDbName,
  provisionTenantDatabase,
  dropTenantDatabase
} from '../../lib/db.js'
import { seedTenantRolesAndPermissions } from '../../seed/tenantRoles.js'
import { seedChartOfAccounts } from '../../seed/chartOfAccounts.js'
import { seedAccountingSettings } from '../../seed/accountingSettings.js'
import { seedDemoData } from '../../seed/demoData.js'

function slugify(text) {
  return (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildDbName(company) {
  const base = slugify(company.nit || company.businessName).slice(0, 40) || 'empresa'
  const suffix = crypto.randomBytes(3).toString('hex')
  return `tenant_${base}_${suffix}`
}

// ✅ Crear empresa + su primer usuario administrador
// Provisiona una BD física nueva, le corre las migraciones del schema
// tenant, la siembra (roles/permisos/ADMIN/perfil/usuario) y solo al
// final registra la empresa en la BD platform. No es atómico entre
// las dos BDs: si algo falla se hace best-effort cleanup.
export async function createCompanyWithAdmin({ company, admin, isDemo = false }) {
  const existingCompany = await platformDb.company.findUnique({ where: { nit: company.nit } })
  if (existingCompany) {
    throw new Error('Ya existe una empresa registrada con ese NIT')
  }

  const existingDirectoryEntry = await platformDb.tenantUserDirectory.findUnique({
    where: { email: admin.email }
  })
  if (existingDirectoryEntry) {
    throw new Error('El email del administrador ya está en uso')
  }

  const dbName = buildDbName(company)
  let tenantDb

  try {
    await provisionTenantDatabase(dbName)
    tenantDb = getTenantClientByDbName(dbName)

    const adminRole = await seedTenantRolesAndPermissions(tenantDb)
    await seedChartOfAccounts(tenantDb)
    await seedAccountingSettings(tenantDb)

    await tenantDb.companyProfile.create({
      data: {
        businessName: company.businessName,
        tradeName: company.tradeName,
        nit: company.nit,
        dv: company.dv,
        legalRepresentative: company.legalRepresentative,
        legalRepId: company.legalRepId,
        taxRegime: company.taxRegime,
        taxResponsibility: company.taxResponsibility,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        department: company.department,
        country: company.country
      }
    })

    const hashedPassword = await bcrypt.hash(admin.password, 10)

    const adminUser = await tenantDb.user.create({
      data: {
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        active: true,
        roles: {
          create: [{ role: { connect: { id: adminRole.id } } }]
        }
      }
    })

    // Datos de demostración: se siembran con el admin ya creado (los
    // documentos necesitan un userId) y antes de registrar la empresa en
    // platform, para que un fallo acá dispare el mismo cleanup que
    // cualquier otro error de provisioning.
    if (isDemo) {
      await seedDemoData(tenantDb, { userId: adminUser.id })
    }

    const newCompany = await platformDb.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          businessName: company.businessName,
          nit: company.nit,
          dbName,
          active: true,
          isDemo
        }
      })

      await tx.tenantUserDirectory.create({
        data: { email: admin.email, companyId: created.id, userId: adminUser.id }
      })

      return created
    })

    const { password: _password, ...adminWithoutPassword } = adminUser
    return { company: newCompany, admin: adminWithoutPassword }
  } catch (error) {
    await dropTenantDatabase(dbName).catch(() => {})
    await platformDb.company.deleteMany({ where: { dbName } }).catch(() => {})
    await platformDb.tenantUserDirectory.deleteMany({ where: { email: admin.email } }).catch(() => {})
    throw error
  } finally {
    await tenantDb?.$disconnect()
  }
}

// ✅ Listar empresas (registro platform)
export async function getCompanies() {
  return platformDb.company.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

// Combina el registro platform (businessName, nit, dbName, active) con el
// perfil fiscal/branding que vive en la BD del tenant, para que el frontend
// siga recibiendo la misma forma de objeto que antes.
export async function getCompanyById(id) {
  const company = await platformDb.company.findUnique({ where: { id } })
  if (!company) return null

  const tenantDb = await getTenantClient(id)
  const { id: _profileId, ...profile } = (await tenantDb.companyProfile.findFirst()) ?? {}

  return {
    ...profile,
    id: company.id,
    active: company.active,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    businessName: company.businessName,
    nit: company.nit
  }
}

// ✅ Actualizar empresa: campos de registro -> platform, resto -> CompanyProfile del tenant
export async function updateCompany(id, data) {
  const { active, ...profileFields } = data

  const tenantDb = await getTenantClient(id)
  const existingProfile = await tenantDb.companyProfile.findFirst()

  if (existingProfile) {
    await tenantDb.companyProfile.update({
      where: { id: existingProfile.id },
      data: profileFields
    })
  }

  return platformDb.company.update({
    where: { id },
    data: {
      ...(profileFields.businessName ? { businessName: profileFields.businessName } : {}),
      ...(profileFields.nit ? { nit: profileFields.nit } : {}),
      ...(active !== undefined ? { active } : {})
    }
  })
}

// ✅ Desactivar (mejor que borrar)
export async function deleteCompany(id) {
  return platformDb.company.update({
    where: { id },
    data: { active: false }
  })
}

export async function activateCompany(id) {
  return platformDb.company.update({
    where: { id },
    data: { active: true }
  })
}

// ✅ Administrador de una empresa: usado por el panel de SUPER_ADMIN, que no
// tiene BD propia y necesita cruzar a la BD del tenant vía companyId.
export async function getCompanyAdmin(companyId) {
  const tenantDb = await getTenantClient(companyId)

  const admin = await tenantDb.user.findFirst({
    where: { roles: { some: { role: { name: 'ADMIN' } } } },
    orderBy: { createdAt: 'asc' }
  })

  if (!admin) return null

  const { password: _password, ...adminWithoutPassword } = admin
  return adminWithoutPassword
}

export async function createCompanyAdmin(companyId, data) {
  const { name, email, password } = data
  const tenantDb = await getTenantClient(companyId)

  const existing = await tenantDb.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error('El email ya está en uso')
  }

  const existingDirectoryEntry = await platformDb.tenantUserDirectory.findUnique({ where: { email } })
  if (existingDirectoryEntry) {
    throw new Error('El email ya está en uso')
  }

  const adminRole = await tenantDb.role.findUnique({ where: { name: 'ADMIN' } })
  if (!adminRole) {
    throw new Error('El rol ADMIN no existe en esta empresa')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await tenantDb.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      active: true,
      roles: { create: [{ role: { connect: { id: adminRole.id } } }] }
    }
  })

  await platformDb.tenantUserDirectory.create({ data: { email, companyId, userId: user.id } })

  const { password: _password, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function updateCompanyAdmin(companyId, userId, data) {
  const tenantDb = await getTenantClient(companyId)

  const currentUser = await tenantDb.user.findUnique({ where: { id: userId } })
  if (!currentUser) {
    throw new Error('Administrador no encontrado')
  }

  const { name, email, password } = data
  const updateData = {}
  if (name) updateData.name = name
  if (email) updateData.email = email
  if (password) updateData.password = await bcrypt.hash(password, 10)

  const updated = await tenantDb.user.update({ where: { id: userId }, data: updateData })

  if (email && email !== currentUser.email) {
    await platformDb.tenantUserDirectory.update({
      where: { email: currentUser.email },
      data: { email, companyId, userId }
    })
  }

  const { password: _password, ...updatedWithoutPassword } = updated
  return updatedWithoutPassword
}
