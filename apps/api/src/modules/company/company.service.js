import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'

// ✅ Crear empresa + su primer usuario administrador (transacción)
// companies/users NO usan el cliente con scope de tenant aquí:
// esta es la única zona del sistema que opera cross-tenant a propósito.
export async function createCompanyWithAdmin({ company, admin }) {
  return prisma.$transaction(async (tx) => {
    const newCompany = await tx.company.create({
      data: company
    })

    const existingUser = await tx.user.findUnique({
      where: { email: admin.email }
    })

    if (existingUser) {
      throw new Error('El email del administrador ya está en uso')
    }

    const adminRole = await tx.role.findUnique({
      where: { name: 'ADMIN' }
    })

    if (!adminRole) {
      throw new Error('Rol ADMIN no existe. Corre el seed primero.')
    }

    const hashedPassword = await bcrypt.hash(admin.password, 10)

    const adminUser = await tx.user.create({
      data: {
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        active: true,
        companyId: newCompany.id,
        roles: {
          create: [{ role: { connect: { id: adminRole.id } } }]
        }
      }
    })

    return { company: newCompany, admin: adminUser }
  })
}

// ✅ Listar empresas
export async function getCompanies() {
  return prisma.company.findMany({
    orderBy: { createdAt: "desc" }
  })
}

// ✅ Obtener por ID
export async function getCompanyById(id) {
  return prisma.company.findUnique({
    where: { id }
  })
}

// ✅ Actualizar empresa
export async function updateCompany(id, data) {
  return prisma.company.update({
    where: { id },
    data
  })
}

// ✅ Desactivar (mejor que borrar)
export async function deleteCompany(id) {
  return prisma.company.update({
    where: { id },
    data: { active: false }
  })
}

export async function activateCompany(id) {
  return prisma.company.update({
    where: { id },
    data: { active: true }
  })
}
