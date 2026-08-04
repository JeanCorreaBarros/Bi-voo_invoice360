import { getTenantClientByDbName } from '../src/lib/db.js'

async function main() {
  const db = getTenantClientByDbName('tenant_6743848_421d9d')
  
  const tables = await db.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name;
  `
  console.log('Tables in database:')
  console.log(tables.map(t => t.table_name))
  await db.$disconnect()
}

main().catch(console.error)
