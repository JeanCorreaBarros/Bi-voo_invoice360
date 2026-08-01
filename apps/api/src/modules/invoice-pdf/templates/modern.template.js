export function modernTemplate(doc, invoice, logo, qrImage) {

  const formatMoney = value =>
    Number(value || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 2
    })

  const formatDate = date =>
    date ? new Date(date).toLocaleDateString('es-CO') : ''

  const pageWidth = doc.page.width

  /* =====================================================
     HEADER
  ===================================================== */

  doc.save()
  doc.rect(0, 0, pageWidth, 70).fill('#0E477B')
  doc.restore()

  doc.fillColor('white')
  doc.fontSize(18)
  doc.text('FACTURA DE VENTA', 40, 25)
  doc.fillColor('black')

  /* =====================================================
     LOGO
  ===================================================== */

  if (logo) {
    doc.image(logo, 40, 75, { fit: [100, 70] })
  }

  /* =====================================================
     INFORMACIÓN EMPRESA
     (columna centrada de verdad en la página, no en una
     franja arbitraria — antes x=160/width=220 quedaba
     corrida a la izquierda del centro real)
  ===================================================== */

  let companyY = 85
  const companyBoxWidth = 320
  const companyBoxX = (pageWidth - companyBoxWidth) / 2

  doc.font('Helvetica-Bold')

  if (invoice.company?.tradeName) {
    doc.fontSize(12)
    doc.text(invoice.company.tradeName, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center"
    })
    companyY += 14
  }

  if (invoice.company?.businessName) {
    doc.fontSize(10)
    doc.text(invoice.company.businessName, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center"
    })
    companyY += 12
  }

  doc.font('Helvetica')
  doc.fontSize(9)

  if (invoice.company?.nit) {

    const dv = invoice.company.dv
      ? `-${invoice.company.dv}`
      : ''

    doc.text(`NIT: ${invoice.company.nit}${dv}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center"
    })

    companyY += 10
  }

  if (invoice.company?.email) {
    doc.text(`Email: ${invoice.company.email}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center"
    })
    companyY += 10
  }

  if (invoice.company?.phone) {
    doc.text(`Teléfono: ${invoice.company.phone}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center"
    })
    companyY += 10
  }

  if (invoice.company?.address) {
    doc.text(`Dirección: ${invoice.company.address}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center"
    })
    companyY += 12
  }

  if (invoice.orderResolution) {
    doc.font('Helvetica-Bold')
    doc.fontSize(9)
    doc.text(`Resolución: ${invoice.orderResolution}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center"
    })
  }

  /* =====================================================
     INFO FACTURA
  ===================================================== */

  doc.fontSize(10)

  doc.text(`Prefijo: ${invoice.orderPrefix}`, 480, 90)
  doc.text(`Número: ${invoice.orderId}`, 480, 105)
  doc.text(`Fecha: ${formatDate(invoice.orderDate)}`, 480, 120)

  const vencimientoMostrar =
    invoice.dueDate
      ? formatDate(invoice.dueDate)
      : invoice.vencimiento || ''

  doc.text(`Vencimiento: ${vencimientoMostrar}`, 480, 135)

  /* =====================================================
     CLIENTE
  ===================================================== */

  doc.roundedRect(40, 170, 535, 90, 6).stroke('#d1d5db')

  doc.fontSize(12)
  doc.text('Datos del Cliente', 50, 180)

  doc.fontSize(10)

  doc.text(`Nombre: ${invoice.orderReceiverName}`, 50, 200)
  doc.text(`NIT: ${invoice.orderReceiverNit}`, 50, 215)
  doc.text(`Dirección: ${invoice.orderReceiverAddress}`, 50, 230)
  doc.text(`Teléfono: ${invoice.orderReceiverPhone}`, 50, 245)

  /* =====================================================
     TABLA
  ===================================================== */

  let y = 270

  const drawTableHeader = () => {

    doc.save()
    doc.rect(40, y, 510, 25).fill('#f3f4f6')
    doc.restore()

    doc.fontSize(10)

    doc.text('Descripción', 50, y + 7)
    doc.text('Cant', 260, y + 7, { width: 40, align: 'right' })
    doc.text('Precio', 310, y + 7, { width: 60, align: 'right' })
    doc.text('Desc', 380, y + 7, { width: 60, align: 'right' })
    doc.text('IVA', 450, y + 7, { width: 60, align: 'right' })
    doc.text('Total', 510, y + 7, { width: 60, align: 'right' })

    y += 35
  }

  drawTableHeader()

  let subtotalCalculado = 0
  let totalDescuentosCalculado = 0
  let totalIvaCalculado = 0

  invoice.details.forEach(item => {

    if (y > 700) {

      doc.addPage()
      y = 80
      drawTableHeader()

    }

    const quantity = Number(item.orderItemQuantity || 0)
    const price = Number(item.orderItemPrice || 0)
    const discount = Number(item.orderItemDesc || 0)
    const ivaItem = Number(item.orderItemIva || 0)

    const base = quantity * price
    const subtotalLinea = base - discount
    const totalLinea = subtotalLinea + ivaItem

    subtotalCalculado += base
    totalDescuentosCalculado += discount
    totalIvaCalculado += ivaItem

    const description =
      item.itemName ||
      item.descripcion ||
      item.product?.name ||
      ''

    doc.fontSize(9)

    doc.text(description, 50, y, { width: 200 })
    doc.text(quantity.toFixed(2), 260, y, { width: 40, align: 'right' })
    doc.text(formatMoney(price), 310, y, { width: 60, align: 'right' })
    doc.text(formatMoney(discount), 380, y, { width: 60, align: 'right' })
    doc.text(formatMoney(ivaItem), 450, y, { width: 60, align: 'right' })
    doc.text(formatMoney(totalLinea), 510, y, { width: 60, align: 'right' })

    y += 22

  })

  doc.moveTo(40, y).lineTo(550, y).stroke('#e5e7eb')

  /* =====================================================
     TOTALES
  ===================================================== */

  if (y > 520) {

    doc.addPage()
    y = 80

  }

  y += 20

  const subtotal = subtotalCalculado
  const descuentos = totalDescuentosCalculado
  const iva = totalIvaCalculado
  const totalConIva = subtotal - descuentos + iva

  const retefuente = subtotal * (Number(invoice.retencion || 0) / 100)
  const reteica = subtotal * (Number(invoice.reteica || 0) / 100)
  const reteiva = iva * (Number(invoice.reteiva || 0) / 100)
  const autoret = subtotal * (Number(invoice.autoretencion || 0) / 100)

  const totalRetenciones =
    retefuente + reteica + reteiva + autoret

  const totalPagar =
    totalConIva - totalRetenciones

  doc.roundedRect(330, y, 250, 220, 6).stroke('#d1d5db')
  

  let ty = y + 15

  doc.fontSize(10)

  const row = (label, value) => {
    doc.text(label, 340, ty)
    doc.text(value, 455, ty, { width: 90, align: 'right' })
    ty += 15
  }

  row('Subtotal:', `$${formatMoney(subtotal)}`)
  row('Descuentos:', `-$${formatMoney(descuentos)}`)
  row('IVA:', `$${formatMoney(iva)}`)

  doc.moveTo(340, ty).lineTo(565, ty).stroke('#e5e7eb')
  ty += 10

  row('Total con IVA:', `$${formatMoney(totalConIva)}`)

  ty += 10
  doc.moveTo(340, ty).lineTo(565, ty).stroke('#e5e7eb')
  ty += 10

  row(`Retefuente (${invoice.retencion || 0}%):`, `-$${formatMoney(retefuente)}`)
  row(`ReteICA (${invoice.reteica || 0}%):`, `-$${formatMoney(reteica)}`)
  row(`ReteIVA (${invoice.reteiva || 0}%):`, `-$${formatMoney(reteiva)}`)
  row(`Autoretención (${invoice.autoretencion || 0}%):`, `-$${formatMoney(autoret)}`)

  ty += 10

  doc.moveTo(340, ty).lineTo(565, ty).stroke('#0E477B')

  ty += 15

  doc.fontSize(13)

  doc.text('TOTAL A PAGAR:', 340, ty)

  doc.text(
    `$${formatMoney(totalPagar)}`,
    450,
    ty,
    { width: 90, align: 'right' }
  )

  /* =====================================================
     QR + FOOTER
  ===================================================== */

  if (qrImage) {
    doc.image(qrImage, 40, 650, { width: 90 })
  }

  doc.fontSize(8)

  doc.text(
    'Representación gráfica de la factura electrónica.',
    40,
    740
  )

  doc.text(
    'Firmado digitalmente por el sistema ERP',
    350,
    740,
    { align: 'right' }
  )

}