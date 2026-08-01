import { PrismaClient } from '@prisma/client'

// Cliente sin scope: solo lo usan rutas cross-tenant (superadmin / gestión de empresas).
export const prisma = new PrismaClient()

// Modelos que tienen columna companyId y deben quedar aislados por empresa.
const TENANT_MODELS = new Set([
  'Product',
  'InventoryMovement',
  'Invoice',
  'Resolution',
  'Purchase',
  'Supplier',
  'Customer',
  'Payment',
  'CreditNote',
  'ProductPriceHistory',
  'CashMovement',
])

const tenantClientCache = new Map()

/**
 * Devuelve un PrismaClient extendido que automáticamente:
 * - agrega companyId al `where` de toda lectura/actualización/borrado
 * - estampa companyId en toda creación
 * para los modelos de TENANT_MODELS. El resto de modelos (roles, permisos, Company, etc.)
 * pasan sin modificar.
 */
export function getTenantClient(companyId) {
  if (!companyId) {
    throw new Error('getTenantClient requiere un companyId')
  }

  if (tenantClientCache.has(companyId)) {
    return tenantClientCache.get(companyId)
  }

  const client = prisma.$extends({
    name: `tenant-${companyId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) {
            return query(args)
          }

          args = args ?? {}

          switch (operation) {
            case 'create':
              args.data = { ...args.data, companyId }
              break

            case 'createMany':
              args.data = Array.isArray(args.data)
                ? args.data.map((row) => ({ ...row, companyId }))
                : { ...args.data, companyId }
              break

            case 'upsert':
              args.where = { ...args.where, companyId }
              args.create = { ...args.create, companyId }
              break

            default:
              // findFirst, findUnique, findMany, count, aggregate, groupBy,
              // update, updateMany, delete, deleteMany
              args.where = { ...(args.where ?? {}), companyId }
          }

          return query(args)
        },
      },
    },
  })

  tenantClientCache.set(companyId, client)
  return client
}
