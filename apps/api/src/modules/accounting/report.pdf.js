import PDFDocument from 'pdfkit'

const MARGIN = 40
const COL_CODE_X = MARGIN
const COL_NAME_X = MARGIN + 60
const COL_BALANCE_X = 480

function money(n) {
  return `$${Number(n || 0).toLocaleString('es-CO')}`
}

function drawRow(doc, code, name, balance, { bold = false, indent = 0 } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
  doc.text(code || '', COL_CODE_X, doc.y, { width: 55, continued: false })
  doc.text(name || '', COL_NAME_X + indent, doc.y - doc.currentLineHeight(), { width: COL_BALANCE_X - COL_NAME_X - indent - 10 })
  if (balance !== undefined && balance !== '') {
    doc.text(money(balance), COL_BALANCE_X, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' })
  }
  doc.moveDown(0.3)
}

// sections: [{ label, rows: [{code,name,balance}], total }]
// summaryRows: [{ label, value, bold }] — líneas finales (ej. Utilidad Neta)
export function generateAccountingReportPDF(res, { title, subtitle, sections, summaryRows = [] }) {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=${title.toLowerCase().replace(/\s+/g, '_')}.pdf`)
  doc.pipe(res)

  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' })
  if (subtitle) {
    doc.moveDown(0.2)
    doc.fontSize(10).font('Helvetica').text(subtitle, { align: 'center' })
  }
  doc.moveDown(1.5)

  for (const section of sections) {
    if (doc.y > 700) doc.addPage()
    doc.fontSize(11).font('Helvetica-Bold').text(section.label)
    doc.moveDown(0.3)
    for (const row of section.rows) {
      if (doc.y > 730) doc.addPage()
      drawRow(doc, row.code, row.name, row.balance, { indent: 10 })
    }
    doc.moveDown(0.1)
    drawRow(doc, '', `Total ${section.label}`, section.total, { bold: true })
    doc.moveDown(0.8)
  }

  if (summaryRows.length > 0) {
    doc.moveDown(0.5)
    for (const row of summaryRows) {
      drawRow(doc, '', row.label, row.value, { bold: row.bold })
    }
  }

  doc.moveDown(1.5)
  doc.fontSize(8).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-CO')}`, { align: 'center' })

  doc.end()
}
