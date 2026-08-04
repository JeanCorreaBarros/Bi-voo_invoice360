import { platformDb } from '../src/lib/db.js'

async function main() {
  const companies = await platformDb.company.findMany()
  console.log('Registered companies in platform database:')
  console.log(JSON.stringify(companies, null, 2))
  
  const directory = await platformDb.tenantUserDirectory.findMany()
  console.log('\nUser directory entries:')
  console.log(JSON.stringify(directory, null, 2))
}

main().catch(console.error)
