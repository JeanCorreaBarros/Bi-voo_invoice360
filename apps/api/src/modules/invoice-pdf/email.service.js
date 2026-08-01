import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export async function sendInvoiceEmail(to, pdfBuffer, invoiceNumber) {
  await transporter.sendMail({
    from: `"Facturación" <${process.env.SMTP_USER}>`,
    to,
    subject: `Factura ${invoiceNumber}`,
    html: `
      <h3>Adjunto encontrarás tu factura</h3>
      <p>Gracias por tu compra.</p>
    `,
    attachments: [
      {
        filename: `factura-${invoiceNumber}.pdf`,
        content: pdfBuffer
      }
    ]
  })
}
