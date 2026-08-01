import { generateInvoicePDF } from './invoice-pdf.service.js'

import { generateInvoicePDFBuffer } from './invoice-pdf.service.js'
import { sendInvoiceEmail } from './email.service.js'

export async function downloadInvoicePDF(req, res) {
  try {
    const { id } = req.params
    const { style } = req.query

    const pdfStream = await generateInvoicePDF(req.db, id, style)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${id}.pdf`
    )

    pdfStream.pipe(res)
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}


export async function sendInvoiceByEmail(req, res) {
  try {
    const { id } = req.params
    const { email, style } = req.body

    const pdfBuffer = await generateInvoicePDFBuffer(req.db, id, style)

    await sendInvoiceEmail(email, pdfBuffer, id)

    res.json({
      ok: true,
      message: 'Factura enviada correctamente'
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}
