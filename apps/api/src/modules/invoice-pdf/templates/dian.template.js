export function dianTemplate(doc, invoice, logo, qrImage) {

  const formatMoney = value =>
    Number(value || 0).toLocaleString("es-CO", {
      minimumFractionDigits: 2
    });

  const formatDate = date =>
    date ? new Date(date).toLocaleDateString("es-CO") : "";

  const pageWidth = doc.page.width;

  /* =====================================
     HEADER
  ===================================== */

  let yStart = 20;

  if (logo) {
    doc.image(logo, 40, yStart, { fit: [110, 80] });
  }

  /* =====================================
     EMPRESA
  ===================================== */

  let companyY = yStart + 10;
  // Columna centrada de verdad en la página (antes x=170/width=200 quedaba
  // corrida a la izquierda del centro real de la página).
  const companyBoxWidth = 300;
  const companyBoxX = (pageWidth - companyBoxWidth) / 2;

  doc.font("Helvetica-Bold").fontSize(11);

  if (invoice.company?.tradeName) {
    doc.text(invoice.company.tradeName, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center",
    });
    companyY += 12;
  }

  if (invoice.company?.businessName) {
    doc.text(invoice.company.businessName, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center",
    });
    companyY += 12;
  }

  doc.font("Helvetica").fontSize(9);

  if (invoice.company?.nit) {

    const dv = invoice.company.dv
      ? `-${invoice.company.dv}`
      : "";

    doc.text(`NIT: ${invoice.company.nit}${dv}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center",
    });

    companyY += 10;
  }

  if (invoice.company?.email) {
    doc.text(`Email: ${invoice.company.email}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center",
    });
    companyY += 10;
  }

  if (invoice.company?.phone) {
    doc.text(`Teléfono: ${invoice.company.phone}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center",
    });
    companyY += 10;
  }

  if (invoice.company?.address) {
    doc.text(`Dirección: ${invoice.company.address}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center",
    });
    companyY += 12;
  }

  if (invoice.orderResolution) {
    doc.font("Helvetica-Bold").fontSize(9);

    doc.text(`Resolución: ${invoice.orderResolution}`, companyBoxX, companyY, {
      width: companyBoxWidth,
      align: "center",
    });
  }

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("FACTURA ELECTRÓNICA DE VENTA", 0, 110, { align: "center" });

  /* =====================================
     INFO FACTURA
  ===================================== */

  doc.font("Helvetica").fontSize(10);

  const vencimientoMostrar =
    invoice.dueDate
      ? formatDate(invoice.dueDate)
      : invoice.vencimiento || "";

  doc
    .text(`Prefijo: ${invoice.orderPrefix || ""}`, pageWidth - 120, yStart + 10)
    .text(`Número: ${invoice.orderId || ""}`, pageWidth - 120, yStart + 25)
    .text(`Fecha: ${formatDate(invoice.orderDate)}`, pageWidth - 120, yStart + 40)
    .text(`Vence: ${vencimientoMostrar}`, pageWidth - 120, yStart + 55);

  doc.moveTo(40, 130).lineTo(pageWidth - 40, 130).stroke();

  /* =====================================
     CLIENTE
  ===================================== */

  let y = 140;

  doc.font("Helvetica-Bold").fontSize(11).text("DATOS DEL CLIENTE", 40, y);

  y += 15;

  doc.font("Helvetica").fontSize(10);

  doc.text(`Cliente: ${invoice.orderReceiverName || ""}`, 40, y);
  y += 15;

  doc.text(`NIT: ${invoice.orderReceiverNit || ""}`, 40, y);
  y += 15;

  doc.text(`Dirección: ${invoice.orderReceiverAddress || ""}`, 40, y);
  y += 15;

  doc.text(`Teléfono: ${invoice.orderReceiverPhone || ""}`, 40, y);

  /* =====================================
     TABLA
  ===================================== */

  y += 25;

  const drawHeader = () => {

    doc.moveTo(40, y).lineTo(pageWidth - 40, y).stroke();

    y += 8;

    doc.font("Helvetica-Bold").fontSize(10);

    doc.text("Descripción", 40, y);
    doc.text("Cant", 260, y, { width: 40, align: "right" });
    doc.text("Precio", 310, y, { width: 60, align: "right" });
    doc.text("Desc", 380, y, { width: 60, align: "right" });
    doc.text("IVA", 450, y, { width: 60, align: "right" });
    doc.text("Total", 510, y, { width: 60, align: "right" });

    y += 15;

    doc.moveTo(40, y).lineTo(pageWidth - 40, y).stroke();

    y += 10;

    doc.font("Helvetica").fontSize(10);
  };

  drawHeader();

  const items = invoice.details || invoice.items || [];

  let subtotal = 0;
  let totalDescuentos = 0;
  let totalIva = 0;

  items.forEach(item => {

    if (y > 700) {

      doc.addPage();
      y = 60;
      drawHeader();

    }

    const quantity = Number(item.orderItemQuantity || 0);
    const price = Number(item.orderItemPrice || 0);
    const discount = Number(item.orderItemDesc || 0);
    const ivaItem = Number(item.orderItemIva || 0);

    const base = quantity * price;
    const subtotalLinea = base - discount;
    const totalLinea = subtotalLinea + ivaItem;

    subtotal += base;
    totalDescuentos += discount;
    totalIva += ivaItem;

    const description =
      item.itemName ||
      item.descripcion ||
      item.product?.name ||
      "";

    doc.text(description, 40, y, { width: 200 });
    doc.text(quantity.toFixed(2), 260, y, { width: 40, align: "right" });
    doc.text(formatMoney(price), 310, y, { width: 60, align: "right" });
    doc.text(formatMoney(discount), 380, y, { width: 60, align: "right" });
    doc.text(formatMoney(ivaItem), 450, y, { width: 60, align: "right" });
    doc.text(formatMoney(totalLinea), 510, y, { width: 60, align: "right" });

    y += 18;

  });

  doc.moveTo(40, y).lineTo(pageWidth - 40, y).stroke();

  /* =====================================
     TOTALES
  ===================================== */

  if (y > 600) {
    doc.addPage();
    y = 80;
  }

  y += 20;

  const totalConIva = subtotal - totalDescuentos + totalIva;

  const retefuente = subtotal * (Number(invoice.retencion || 0) / 100);
  const reteica = subtotal * (Number(invoice.reteica || 0) / 100);
  const reteiva = totalIva * (Number(invoice.reteiva || 0) / 100);
  const autoret = subtotal * (Number(invoice.autoretencion || 0) / 100);

  const totalRetenciones =
    retefuente + reteica + reteiva + autoret;

  const totalPagar =
    totalConIva - totalRetenciones;

  doc.font("Helvetica").fontSize(10);

  doc.text(`Subtotal: $${formatMoney(subtotal)}`, pageWidth - 220, y);
  y += 15;

  doc.text(`Descuentos: -$${formatMoney(totalDescuentos)}`, pageWidth - 220, y);
  y += 15;

  doc.text(`IVA: $${formatMoney(totalIva)}`, pageWidth - 220, y);
  y += 15;

  doc.text(`Total con IVA: $${formatMoney(totalConIva)}`, pageWidth - 220, y);
  y += 15;

  if (retefuente > 0) {
    doc.text(`Retefuente (${invoice.retencion}%): -$${formatMoney(retefuente)}`, pageWidth - 220, y);
    y += 15;
  }

  if (reteica > 0) {
    doc.text(`ReteICA (${invoice.reteica}%): -$${formatMoney(reteica)}`, pageWidth - 220, y);
    y += 15;
  }

  if (reteiva > 0) {
    doc.text(`ReteIVA (${invoice.reteiva}%): -$${formatMoney(reteiva)}`, pageWidth - 220, y);
    y += 15;
  }

  if (autoret > 0) {
    doc.text(`Autoretención (${invoice.autoretencion}%): -$${formatMoney(autoret)}`, pageWidth - 220, y);
    y += 15;
  }

  doc.moveTo(pageWidth - 230, y).lineTo(pageWidth - 40, y).stroke();

  y += 15;

  doc.font("Helvetica-Bold").fontSize(13);

  doc.text(
    `TOTAL A PAGAR: $${formatMoney(totalPagar)}`,
    pageWidth - 220,
    y
  );

  /* =====================================
     QR + CUFE
  ===================================== */

  if (qrImage) {
    doc.image(qrImage, 40, 630, { width: 90 });
  }

  doc.fontSize(8).font("Helvetica");

  doc.text(
    `CUFE: ${invoice.cufe || "SIN CUFE"}`,
    40,
    730,
    { width: pageWidth - 80 }
  );
}