export async function createInvoice(db, data, tenantId) {
  return db.$transaction(async (tx) => {

    let totalBeforeTax = 0
    let totalTax = 0
    let totalAfterTax = 0

    const productsCache = []

    // 0️⃣ VALIDAR USUARIO (debe pertenecer a esta misma empresa)
    const user = await tx.user.findUnique({
      where: { id: data.userId }
    })

    if (!user)
      throw new Error("Usuario no existe")

    if (user.companyId !== tenantId)
      throw new Error("El usuario no pertenece a esta empresa")

    if (data.sellerId) {
      const seller = await tx.user.findUnique({
        where: { id: data.sellerId }
      })

      if (!seller || seller.companyId !== tenantId)
        throw new Error("El vendedor no pertenece a esta empresa")
    }

    // 1️⃣ VALIDAR ITEMS Y CALCULAR
    for (const item of data.items) {

      const product = await tx.product.findUnique({
        where: { id: item.productId }
      })

      if (!product)
        throw new Error(`Producto no existe`)

      // Usar orderItemQuantity si existe, sino quantity
      const quantity = Number(item.orderItemQuantity || item.quantity)

      if (product.type !== "SERVICE") {
        if (product.stock < quantity)
          throw new Error(`Stock insuficiente para ${product.name}`)
      }

      // ✅ Usar valores del payload si vienen, sino recalcular
      const price = Number(item.orderItemPrice || product.price)
      const subtotal = price * quantity
      const itemDesc = Number(item.orderItemDesc ?? 0)
      const iva = Number(item.orderItemIva !== undefined ? item.orderItemIva : subtotal * 0.19)
      const total = Number(item.orderItemFinalAmount || subtotal + iva - itemDesc)

      // ✅ VALIDAR DATOS ENVIADOS vs CALCULADOS
      if (item.orderItemFinalAmount) {
        const expectedTotal = subtotal + iva - itemDesc
        const diff = Math.abs(expectedTotal - total)
        if (diff > 0.01) {
          throw new Error(
            `Item ${item.itemName}: Total incorrecto. Enviaste ${total}, esperado ${expectedTotal.toFixed(2)}`
          )
        }
      }

      totalBeforeTax += subtotal
      totalTax += iva
      totalAfterTax += total

      productsCache.push({
        product,
        quantity: quantity,
        price: price,
        subtotal,
        iva,
        itemDesc,
        total
      })
    }

    // ===============================
    // 🔹 DESCUENTOS Y RETENCIONES
    // ===============================

    const globalDiscount = Number(data.globalDiscount || 0)

    const reteFuentePercent = Number(data.reteFuentePercent || 0)
    const reteIcaPercent = Number(data.reteIcaPercent || 0)

    // Base después de descuento
    const taxableBase = totalBeforeTax - globalDiscount

    // Retenciones (si aplican)
    const reteFuente = taxableBase * (reteFuentePercent / 100)
    const reteIca = taxableBase * (reteIcaPercent / 100)

    const totalRetenciones = reteFuente + reteIca

    // Total final real a pagar
    const grandTotal =
      totalAfterTax - globalDiscount - totalRetenciones

    // ===============================
    // 2️⃣ GENERAR CONSECUTIVO
    // ===============================

    const nextNumber = await getNextInvoiceNumber(tx, data.orderPrefix)

    // ===============================
    // 3️⃣ CALCULAR FECHA VENCIMIENTO
    // ===============================

    const orderDateObj = data.orderDate ? new Date(data.orderDate) : new Date()
    const plazoPagoValue = parseInt(data.plazoPago || "0")
    let calculatedDueDate = null

    if (plazoPagoValue > 0) {
      calculatedDueDate = new Date(orderDateObj)
      calculatedDueDate.setDate(calculatedDueDate.getDate() + plazoPagoValue)
    }

    // ===============================
    // 4️⃣ CREAR FACTURA
    // ===============================

    const invoice = await tx.invoice.create({
      data: {
        status: data.status || "1",
        dianStatus: "PENDING",

        orderId: nextNumber,
        orderPrefix: data.orderPrefix,

        orderReceiverName: data.orderReceiverName,
        orderReceiverNit: data.orderReceiverNit,
        orderReceiverAddress: data.orderReceiverAddress,
        orderReceiverPhone: data.orderReceiverPhone || "",
        orderReceiverEmail: data.orderReceiverEmail || "",
        sellerId: data.sellerId || null,

        userId: data.userId,

        // 🔹 INFORMACIÓN ADICIONAL
        orderDate: orderDateObj,
        note: data.note || null,
        cufe: data.cufe || "",
        orderResolution: data.orderResolution || null,
        paymentForms: data.paymentForms || 0,
        paymentMethods: data.paymentMethods || 0,
        plazoPago: data.plazoPago || "0",
        vencimiento: data.vencimiento || "0",
        orderTaxPer: data.orderTaxPer || "19",
        ciiu: data.ciiu || null,
        autoretencion: data.autoretencion || 0,

        // 🔹 TOTALES
        orderSubtotalBeforeTax: totalBeforeTax,
        orderTotalBeforeTax: taxableBase,
        orderTotalTax: totalTax,

        orderTotalDesc: globalDiscount,

        reteica: data.reteica || reteIca,
        reteiva: data.reteiva || 0,
        retencion: data.retencion || (reteFuente ? "RETEFUENTE" : null),

        orderTotalAfterTax: totalAfterTax,
        orderTotalAmountDue: grandTotal,

        orderAmountPaid: data.orderAmountPaid ?? grandTotal,
        dueDate: calculatedDueDate
      }
    })

    // ===============================
    // 5️⃣ CREAR DETALLE
    // ===============================


    await tx.invoiceDetail.createMany({
      data: productsCache.map(item => ({
        invoiceId: invoice.id,
        orderPrefix: invoice.orderPrefix,
        productId: item.product.id,

        itemCode: item.product.code || "",
        reference: item.product.reference || "",
        itemName: item.product.name,
        descripcion: item.product.description || "",

        orderItemQuantity: item.quantity,
        orderItemPrice: item.price,
        orderItemIva: item.iva,
        orderItemDesc: item.itemDesc,
        orderItemFinalAmount: item.total
      }))
    })

    // ===============================
    // 6️⃣ DESCONTAR STOCK + MOVIMIENTO
    // ===============================


    for (const item of productsCache) {

      if (item.product.type !== "SERVICE") {

        await tx.product.update({
          where: { id: item.product.id },
          data: {
            stock: { decrement: item.quantity }
          }
        })

        await tx.inventoryMovement.create({
          data: {
            productId: item.product.id,
            type: "SALE",
            quantity: item.quantity,
            reference: "INVOICE",
            referenceId: invoice.id
          }
        })
      }
    }

    // ===============================
    // 6️⃣ RETORNAR FACTURA COMPLETA
    // ===============================

    const fullInvoice = await tx.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        company: true,
        details: {
          include: {
            product: true
          }
        }
      }
    })

    return fullInvoice
  })
}

export async function updateInvoice(db, id, data) {
  return db.$transaction(async (tx) => {

    // 1️⃣ BUSCAR FACTURA EXISTENTE
    const existing = await tx.invoice.findUnique({
      where: { id },
      include: { details: true }
    })

    if (!existing)
      throw new Error("Factura no existe")

    if (existing.dianStatus === "APPROVED")
      throw new Error("No se puede modificar una factura aprobada por DIAN")

    // ❌ factura pagada
    if (existing.status === "PAID")
      throw new Error("No se puede modificar una factura pagada")

    // ❌ factura anulada
    if (existing.status === "CANCELLED")
      throw new Error("No se puede modificar una factura cancelada")

    const payments = await tx.payment.count({
      where: { invoiceId: id }
    })

    if (payments > 0)
      throw new Error("No se puede modificar una factura con pagos registrados")

    // 1️⃣.5 VALIDAR USUARIO (si viene en los datos)
    if (data.userId) {
      const userCheck = await tx.user.findUnique({
        where: { id: data.userId }
      })

      if (!userCheck)
        throw new Error("Usuario no existe")
    }

    // =====================================
    // 🔹 CASO ESPECIAL: SOLO ACTUALIZAR STATUS (Y CAMPOS SIMPLES)
    // =====================================

    if (!data.items || data.items.length === 0) {
      // Actualización simple sin recalcular items
      const updateData = {}

      // Campos que se pueden actualizar sin items
      if (data.status !== undefined) updateData.status = data.status
      if (data.orderReceiverName !== undefined) updateData.orderReceiverName = data.orderReceiverName
      if (data.orderReceiverNit !== undefined) updateData.orderReceiverNit = data.orderReceiverNit
      if (data.orderReceiverAddress !== undefined) updateData.orderReceiverAddress = data.orderReceiverAddress
      if (data.orderReceiverPhone !== undefined) updateData.orderReceiverPhone = data.orderReceiverPhone
      if (data.orderReceiverEmail !== undefined) updateData.orderReceiverEmail = data.orderReceiverEmail
      if (data.sellerId !== undefined) updateData.sellerId = data.sellerId
      if (data.note !== undefined) updateData.note = data.note
      if (data.cufe !== undefined) updateData.cufe = data.cufe
      if (data.orderResolution !== undefined) updateData.orderResolution = data.orderResolution
      if (data.paymentForms !== undefined) updateData.paymentForms = data.paymentForms
      if (data.paymentMethods !== undefined) updateData.paymentMethods = data.paymentMethods
      if (data.orderAmountPaid !== undefined) updateData.orderAmountPaid = data.orderAmountPaid
      if (data.orderDate !== undefined) updateData.orderDate = new Date(data.orderDate)
      if (data.userId !== undefined) updateData.userId = data.userId

      updateData.updatedAt = new Date()

      return await tx.invoice.update({
        where: { id },
        data: updateData,
        include: {
          company: true,
          details: {
            include: { product: true }
          }
        }
      })
    }

    // =====================================
    // 2️⃣ DEVOLVER STOCK ANTERIOR
    // =====================================

    for (const detail of existing.details) {

      const product = await tx.product.findUnique({
        where: { id: detail.productId }
      })

      if (product && product.type !== "SERVICE") {
        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: { increment: detail.orderItemQuantity }
          }
        })
      }
    }

    // =====================================
    // 3️⃣ BORRAR DETALLES ANTERIORES
    // =====================================

    await tx.invoiceDetail.deleteMany({
      where: { invoiceId: id }
    })

    // =====================================
    // 4️⃣ RECALCULAR TODO
    // =====================================

    let totalBeforeTax = 0
    let totalTax = 0
    let totalAfterTax = 0

    const productsCache = []

    for (const item of data.items) {

      const product = await tx.product.findUnique({
        where: { id: item.productId }
      })

      if (!product)
        throw new Error("Producto no existe")

      // Usar orderItemQuantity si existe, sino quantity
      const quantity = Number(item.orderItemQuantity || item.quantity)

      if (product.type !== "SERVICE") {
        if (product.stock < quantity)
          throw new Error(`Stock insuficiente para ${product.name}`)
      }

      // ✅ Usar valores del payload si vienen, sino recalcular
      const price = Number(item.orderItemPrice || product.price)
      const subtotal = price * quantity
      const itemDesc = Number(item.orderItemDesc ?? 0)
      const iva = Number(item.orderItemIva !== undefined ? item.orderItemIva : subtotal * 0.19)
      const total = Number(item.orderItemFinalAmount || subtotal + iva - itemDesc)

      // ✅ VALIDAR DATOS ENVIADOS vs CALCULADOS
      if (item.orderItemFinalAmount) {
        const expectedTotal = subtotal + iva - itemDesc
        const diff = Math.abs(expectedTotal - total)
        if (diff > 0.01) {
          throw new Error(
            `Item ${item.itemName}: Total incorrecto. Enviaste ${total}, esperado ${expectedTotal.toFixed(2)}`
          )
        }
      }

      totalBeforeTax += subtotal
      totalTax += iva
      totalAfterTax += total

      productsCache.push({
        product,
        quantity: quantity,
        price: price,
        subtotal,
        iva,
        itemDesc,
        total
      })
    }

    // 🔹 DESCUENTOS Y RETENCIONES
    const globalDiscount = Number(data.globalDiscount || 0)
    const reteFuentePercent = Number(data.reteFuentePercent || 0)
    const reteIcaPercent = Number(data.reteIcaPercent || 0)

    const taxableBase = totalBeforeTax - globalDiscount

    const reteFuente = taxableBase * (reteFuentePercent / 100)
    const reteIca = taxableBase * (reteIcaPercent / 100)

    const totalRetenciones = reteFuente + reteIca

    const grandTotal =
      totalAfterTax - globalDiscount - totalRetenciones

    // =====================================
    // 5️⃣ CALCULAR FECHA VENCIMIENTO
    // =====================================

    const updateOrderDate = data.orderDate ? new Date(data.orderDate) : existing.orderDate
    const updatePlazoPago = data.plazoPago !== undefined ? data.plazoPago : existing.plazoPago
    const updatePlazoPagoValue = parseInt(updatePlazoPago || "0")
    let updateCalculatedDueDate = undefined

    if (updatePlazoPagoValue > 0) {
      updateCalculatedDueDate = new Date(updateOrderDate)
      updateCalculatedDueDate.setDate(updateCalculatedDueDate.getDate() + updatePlazoPagoValue)
    } else {
      updateCalculatedDueDate = null
    }

    // =====================================
    // 6️⃣ ACTUALIZAR CABECERA
    // =====================================

    const updatedInvoice = await tx.invoice.update({
      where: { id },
      data: {

        orderReceiverName: data.orderReceiverName,
        orderReceiverNit: data.orderReceiverNit,
        orderReceiverAddress: data.orderReceiverAddress,
        orderReceiverPhone: data.orderReceiverPhone || "",
        orderReceiverEmail: data.orderReceiverEmail || "",
        sellerId: data.sellerId || null,

        orderSubtotalBeforeTax: totalBeforeTax,
        orderTotalBeforeTax: taxableBase,
        orderTotalTax: totalTax,

        orderTotalDesc: globalDiscount,

        reteica: data.reteica || reteIca,
        reteiva: data.reteiva || 0,
        retencion: data.retencion || (reteFuente ? "RETEFUENTE" : null),

        orderTotalAfterTax: totalAfterTax,
        orderTotalAmountDue: grandTotal,

        orderAmountPaid: data.orderAmountPaid ?? grandTotal,

        // 🔹 INFORMACIÓN ADICIONAL
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        note: data.note !== undefined ? data.note : undefined,
        cufe: data.cufe !== undefined ? data.cufe : undefined,
        orderResolution: data.orderResolution !== undefined ? data.orderResolution : undefined,
        paymentForms: data.paymentForms !== undefined ? data.paymentForms : undefined,
        paymentMethods: data.paymentMethods !== undefined ? data.paymentMethods : undefined,
        plazoPago: data.plazoPago !== undefined ? data.plazoPago : undefined,
        vencimiento: data.vencimiento !== undefined ? data.vencimiento : undefined,
        orderTaxPer: data.orderTaxPer !== undefined ? data.orderTaxPer : undefined,
        ciiu: data.ciiu !== undefined ? data.ciiu : undefined,
        autoretencion: data.autoretencion !== undefined ? data.autoretencion : undefined,
        dueDate: updateCalculatedDueDate,

        updatedAt: new Date()
      }
    })

    // =====================================
    // 7️⃣ CREAR NUEVOS DETALLES
    // =====================================

    await tx.invoiceDetail.createMany({
      data: productsCache.map(item => ({
        invoiceId: id,
        orderPrefix: existing.orderPrefix,
        productId: item.product.id,

        itemCode: item.product.code || "",
        reference: item.product.reference || "",
        itemName: item.product.name,
        descripcion: item.product.description || "",

        orderItemQuantity: item.quantity,
        orderItemPrice: item.price,
        orderItemIva: item.iva,
        orderItemDesc: item.itemDesc,
        orderItemFinalAmount: item.total
      }))
    })

    // =====================================
    // 8️⃣ DESCONTAR STOCK NUEVO
    // =====================================

    for (const item of productsCache) {

      if (item.product.type !== "SERVICE") {

        await tx.product.update({
          where: { id: item.product.id },
          data: {
            stock: { decrement: item.quantity }
          }
        })

        await tx.inventoryMovement.create({
          data: {
            productId: item.product.id,
            type: "SALE",
            quantity: item.quantity,
            reference: "INVOICE-UPDATE",
            referenceId: id
          }
        })
      }
    }

    // =====================================
    // 8️⃣ RETORNAR COMPLETA
    // =====================================

    return await tx.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        details: {
          include: { product: true }
        }
      }
    })
  })
}



export async function getInvoices(db, query) {
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const skip = (page - 1) * limit

  const where = {}

  if (query.status) {
    where.status = query.status
  }

  if (query.orderReceiverNit) {
    where.orderReceiverNit = {
      contains: query.orderReceiverNit,
      mode: 'insensitive'
    }
  }

  if (query.orderPrefix) {
    where.orderPrefix = query.orderPrefix
  }

  const [data, total] = await db.$transaction([
    db.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        details: {
          include: {
            product: true
          }
        }
      }
    }),
    db.invoice.count({ where })
  ])

  return {
    data,
    total,
    page,
    lastPage: Math.ceil(total / limit)
  }
}


export async function getInvoiceById(db, id) {
  const invoice = await db.invoice.findUnique({
    where: { id: Number(id) },
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

  return invoice
}

export async function getInvoiceByNumber(db, prefix, orderId) {
  const invoice = await db.invoice.findFirst({
    where: {
      orderPrefix: prefix,
      orderId: Number(orderId)
    },
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

  return invoice
}




async function getNextInvoiceNumber(tx, prefix) {

  const resolution = await tx.resolution.findFirst({
    where: { prefix }
  })

  if (!resolution)
    throw new Error(`No existe resolución para prefijo ${prefix}`)

  if (!resolution.active)
    throw new Error(`La resolución ${prefix} está inactiva`)

  const nextNumber = resolution.currentNumber + 1

  if (nextNumber > resolution.toNumber)
    throw new Error(`Se agotó el rango autorizado para ${prefix}`)

  // actualizar consecutivo
  await tx.resolution.update({
    where: { id: resolution.id },
    data: {
      currentNumber: nextNumber
    }
  })

  return nextNumber
}

export async function cancelInvoice(db, prefix, number) {
  return db.$transaction(async (tx) => {

    const invoice = await tx.invoice.findFirst({
      where: {
        orderPrefix: prefix,
        orderId: Number(number)
      },
      include: { details: true }
    })

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    // 🔴 Si ya fue validada por DIAN
    if (invoice.dianStatus === "ACCEPTED") {
      throw new Error(
        "Factura validada por DIAN. Debe generar Nota Crédito."
      )
    }

    // 🔴 Si ya está anulada
    if (invoice.dianStatus === "VOIDED") {
      throw new Error("La factura ya está anulada")
    }

    // 🔹 Devolver stock
    for (const item of invoice.details) {
      if (!item.productId) continue

      if (item.product?.type !== "SERVICE") {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: Number(item.orderItemQuantity)
            }
          }
        })
      }
    }

    // 🔹 Marcar como anulada
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "0",
        dianStatus: "VOIDED"
      }
    })

    return { message: "Factura anulada correctamente" }
  })
}


// ==========================================
// SERVICIO
// Calcula el saldo real de una factura
// ==========================================
export async function getInvoiceBalance(db, invoiceId) {

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true
    }
  });

  // total pagado
  const totalPaid = invoice.payments.reduce((sum, payment) => {
    return sum + Number(payment.amount);
  }, 0);

  // total factura
  const totalInvoice = Number(invoice.orderTotalAfterTax);

  // saldo pendiente
  const balance = totalInvoice - totalPaid;

  return {
    invoiceId: invoice.id,
    total: totalInvoice,
    paid: totalPaid,
    balance: balance
  };
}




// ==========================================
// ACTUALIZA EL ESTADO DE LA FACTURA
// SEGÚN LOS PAGOS REGISTRADOS
// ==========================================



export async function updateInvoiceStatus(db, invoiceId) {

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });

  const totalPaid = invoice.payments.reduce((sum, p) => {
    return sum + Number(p.amount);
  }, 0);

  const totalInvoice = Number(invoice.orderTotalAfterTax);

  let status = "PENDING";

  if (totalPaid === 0) {
    status = "PENDING";
  } else if (totalPaid < totalInvoice) {
    status = "PARTIAL";
  } else {
    status = "PAID";
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status }
  });

}
