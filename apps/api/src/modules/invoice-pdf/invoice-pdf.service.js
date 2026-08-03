import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateQR } from './utils/qr.generator.js'
import { modernTemplate } from './templates/modern.template.js'
import { dianTemplate } from './templates/dian.template.js'

import { PassThrough } from 'stream'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


// ✅ FUNCIÓN MARCA DE AGUA (NO ALTERA NADA MÁS)
function addWatermark(doc, logoPath) {
  if (!logoPath) return

  const pageWidth = doc.page.width
  const pageHeight = doc.page.height

  const watermarkWidth = 450

  const x = (pageWidth - watermarkWidth) / 2
  const y = (pageHeight - watermarkWidth) / 2

  doc.save()

  doc.opacity(0.06) // Transparencia suave

  doc.image(logoPath, x, y, {
    width: watermarkWidth
  })

  doc.restore()
}



export async function generateInvoicePDF(db, invoiceId, style = 'modern') {
  const invoice = await db.invoice.findUnique({
    where: { id: Number(invoiceId) },
    include: {
      details: {
        include: {
          product: true
        }
      }
    }
  })

  if (!invoice) {
    throw new Error('Factura no encontrada')
  }

  // Los datos de la empresa ya no son una relación del Invoice (multi-tenant:
  // la BD misma es la empresa) — viven en la fila única CompanyProfile.
  invoice.company = await db.companyProfile.findFirst()

  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 40
  })

  const qrData = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${invoice.cufe || 'SIN-CUFE'}`
  const qrImage = await generateQR(qrData)

  const companyDir = path.join(
    process.cwd(),
    'uploads',
    'company'
  )

  // Default fallback logo: Invoices360 brand
  const defaultLogoPath = path.join(__dirname, '..', '..', '..', '..', '..', 'web', 'public', 'invoices360-logo.png')

  let logo = null

  if (fs.existsSync(companyDir)) {
    const files = fs.readdirSync(companyDir)

    const logoFile = files.find(file =>
      /^logo\.(png|jpg|jpeg|webp)$/i.test(file)
    )

    if (logoFile) {
      logo = path.join(companyDir, logoFile)
    }
  }

  // Use Invoices360 logo if no company logo is configured
  if (!logo && fs.existsSync(defaultLogoPath)) {
    logo = defaultLogoPath
  }

  // ✅ AGREGADO: Marca de agua antes del contenido
  addWatermark(doc, logo)

  if (style === 'dian') {
    dianTemplate(doc, invoice, logo, qrImage)
  } else {
    modernTemplate(doc, invoice, logo, qrImage)
  }

  doc.end()

  return doc
}



export async function generateInvoicePDFBuffer(db, invoiceId, style = 'modern') {
  const invoice = await db.invoice.findUnique({
    where: { id: Number(invoiceId) },
    include: {
      details: {
        include: { product: true }
      }
    }
  })

  if (!invoice) {
    throw new Error('Factura no encontrada')
  }

  // Los datos de la empresa ya no son una relación del Invoice (multi-tenant:
  // la BD misma es la empresa) — viven en la fila única CompanyProfile.
  invoice.company = await db.companyProfile.findFirst()

  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 40
  })

  const qrData = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${invoice.cufe || 'SIN-CUFE'}`
  const qrImage = await generateQR(qrData)

  const logoPath = path.join(
    process.cwd(),
    'uploads',
    'company',
    'logo.png'
  )

  const defaultLogoPath = path.join(__dirname, '..', '..', '..', '..', '..', 'web', 'public', 'invoices360-logo.png')

  let logo = null
  if (fs.existsSync(logoPath)) {
    logo = logoPath
  } else if (fs.existsSync(defaultLogoPath)) {
    logo = defaultLogoPath
  }

  // ✅ AGREGADO: Marca de agua antes del contenido
  addWatermark(doc, logo)

  if (style === 'dian') {
    dianTemplate(doc, invoice, logo, qrImage)
  } else {
    modernTemplate(doc, invoice, logo, qrImage)
  }

  const stream = new PassThrough()
  const chunks = []

  doc.pipe(stream)

  stream.on('data', chunk => chunks.push(chunk))

  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    stream.on('error', reject)

    doc.end()
  })
}
