import app from './app.js'
import { startInvoiceSchedulerJob } from './jobs/invoiceScheduler.job.js'
import { ensurePlatformDatabase, ensureSuperAdmin } from './lib/db.js'

const PORT = process.env.PORT || 3000

try {
  await ensurePlatformDatabase()
  await ensureSuperAdmin()
} catch (err) {
  console.error('❌ No se pudo preparar la base de datos de plataforma:', err)
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  startInvoiceSchedulerJob()
})
