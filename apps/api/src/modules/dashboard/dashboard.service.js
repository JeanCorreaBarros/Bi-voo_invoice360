export async function getDashboardInvoices(db) {
  const now = new Date()

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [
    overdueAgg,
    overdueList,
    dueMonthAgg,
    dueMonthList,
    availableAgg,
    availableList,
    paidInvoices,
    monthlySales,
    monthlyCollected,
    totalInvoices,
    totalPaid,
    topDebtors
  ] = await Promise.all([

    // 🔴 VENCIDAS (sin status específico, solo por fecha)
    db.invoice.aggregate({
      _sum: { orderTotalAmountDue: true },
      _count: { _all: true },
      where: {
        dueDate: {
          lt: now,
          not: null
        }
      }
    }),

    db.invoice.findMany({
      where: {
        dueDate: {
          lt: now,
          not: null
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    }),

    // 🟡 VENCEN ESTE MES
    db.invoice.aggregate({
      _sum: { orderTotalAmountDue: true },
      _count: { _all: true },
      where: {
        dueDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    }),

    db.invoice.findMany({
      where: {
        dueDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    }),

    // 🟢 DISPONIBLES (todas las facturas con dueDate)
    db.invoice.aggregate({
      _sum: { orderTotalAmountDue: true },
      _count: { _all: true },
      where: {
        dueDate: { not: null }
      }
    }),

    db.invoice.findMany({
      where: {
        dueDate: { not: null }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    }),

    // ⏱ PROMEDIO PAGO (facturas con paidAt)
    db.invoice.findMany({
      where: {
        paidAt: { not: null }
      },
      select: {
        orderDate: true,
        paidAt: true
      }
    }),

    // 📊 VENTAS DEL MES
    db.invoice.aggregate({
      _sum: { orderTotalAfterTax: true },
      where: {
        orderDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    }),

    // 💰 COBRADO DEL MES
    db.invoice.aggregate({
      _sum: { orderTotalAfterTax: true },
      where: {
        paidAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    }),

    // 📈 TOTAL FACTURAS
    db.invoice.count(),

    db.invoice.count({
      where: {
        paidAt: { not: null }
      }
    }),

    // 🚨 TOP 5 CLIENTES CON MÁS DEUDA
    db.invoice.groupBy({
      by: ['orderReceiverName'],
      _sum: {
        orderTotalAmountDue: true
      },
      where: {
        dueDate: { not: null }
      },
      orderBy: {
        _sum: {
          orderTotalAmountDue: 'desc'
        }
      },
      take: 5
    })
  ])

  // ⏱ Promedio real de pago
  let avgDays = 0

  if (paidInvoices.length > 0) {
    const totalDays = paidInvoices.reduce((acc, inv) => {
      const diff =
        (new Date(inv.paidAt) - new Date(inv.orderDate)) /
        (1000 * 60 * 60 * 24)
      return acc + diff
    }, 0)

    avgDays = Math.round(totalDays / paidInvoices.length)
  }

  const paidPercentage =
    totalInvoices > 0
      ? Math.round((totalPaid / totalInvoices) * 100)
      : 0

  return {
    overdue: {
      total: Number(overdueAgg._sum.orderTotalAmountDue || 0),
      count: overdueAgg._count._all,
      items: overdueList
    },
    dueThisMonth: {
      total: Number(dueMonthAgg._sum.orderTotalAmountDue || 0),
      count: dueMonthAgg._count._all,
      items: dueMonthList
    },
    availableForPayment: {
      total: Number(availableAgg._sum.orderTotalAmountDue || 0),
      count: availableAgg._count._all,
      items: availableList
    },
    averagePaymentDays: avgDays,

    monthlySales: Number(monthlySales._sum.orderTotalAfterTax || 0),
    monthlyCollected: Number(monthlyCollected._sum.orderTotalAfterTax || 0),

    paidPercentage,

    topDebtors
  }
}

export async function getMonthlySalesChart(db) {
  const now = new Date()

  const months = []

  // Generamos los últimos 12 meses
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)

    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

    months.push({
      label: start.toLocaleString('default', { month: 'short' }) + ' ' + start.getFullYear(),
      start,
      end
    })
  }

  const results = []

  for (const month of months) {
    const [sales, collected] = await Promise.all([
      db.invoice.aggregate({
        _sum: { orderTotalAfterTax: true },
        where: {
          orderDate: {
            gte: month.start,
            lte: month.end
          }
        }
      }),

      db.invoice.aggregate({
        _sum: { orderTotalAfterTax: true },
        where: {
          status: 'PAID',
          paidAt: {
            gte: month.start,
            lte: month.end
          }
        }
      })
    ])

    results.push({
      month: month.label,
      sales: Number(sales._sum.orderTotalAfterTax || 0),
      collected: Number(collected._sum.orderTotalAfterTax || 0)
    })
  }

  return results
}


// -------------------------
// VENTAS DE HOY
// -------------------------
export async function getSalesToday(db) {

  const start = new Date()
  start.setHours(0,0,0,0)

  const end = new Date()
  end.setHours(23,59,59,999)

  const invoices = await db.invoice.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end
      },
      status: {
        not: "CANCELLED"
      }
    }
  })

  const total = invoices.reduce(
    (sum, i) => sum + Number(i.orderTotalAmountDue),
    0
  )

  return {
    totalSales: total,
    invoices: invoices.length
  }

}

// -------------------------
// VENTAS DEL MES
// -------------------------
export async function getSalesMonth(db) {

  const now = new Date()

  const start = new Date(now.getFullYear(), now.getMonth(), 1)

  const invoices = await db.invoice.findMany({
    where: {
      createdAt: {
        gte: start
      },
      status: {
        not: "CANCELLED"
      }
    }
  })

  const total = invoices.reduce(
    (sum, i) => sum + Number(i.orderTotalAmountDue),
    0
  )

  return {
    totalSales: total,
    invoices: invoices.length
  }

}

// -------------------------
// CARTERA TOTAL
// -------------------------
export async function getAccountsReceivable(db) {

  const invoices = await db.invoice.findMany({
    where: {
      status: {
        not: "CANCELLED"
      }
    },
    include: {
      payments: true
    }
  })

  let total = 0

  for (const inv of invoices) {

    const paid = inv.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )

    const balance = inv.orderTotalAmountDue - paid

    if (balance > 0)
      total += balance

  }

  return {
    totalAccountsReceivable: total
  }

}

// -------------------------
// PRODUCTOS MAS VENDIDOS
// -------------------------
export async function getTopProducts(db) {

  // InvoiceDetail no tiene companyId propio (hereda el scope de su factura),
  // así que se recorre a través de Invoice (que sí queda filtrado por tenant).
  const invoices = await db.invoice.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      details: {
        include: { product: true }
      }
    }
  })

  const map = {}

  for (const invoice of invoices) {
    for (const item of invoice.details) {

      if (!item.product) continue

      if (!map[item.productId]) {

        map[item.productId] = {
          product: item.product.name,
          quantity: 0
        }

      }

      map[item.productId].quantity += Number(item.orderItemQuantity || 0)
    }
  }

  return Object.values(map)
    .sort((a,b)=> b.quantity - a.quantity)
    .slice(0,5)

}
// -------------------------
// CASH FLOW
// -------------------------
export async function getCashFlow(db) {

  const payments = await db.payment.findMany()

  const total = payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )

  return {
    totalIncome: total
  }

}

export async function getFullDashboard(db) {

  const todayStart = new Date()
  todayStart.setHours(0,0,0,0)

  const todayEnd = new Date()
  todayEnd.setHours(23,59,59,999)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // =========================
  // FACTURAS
  // =========================

  const invoices = await db.invoice.findMany({
    where: {
      status: { not: "CANCELLED" }
    },
    include: {
      payments: true,
      details: {
        include: {
          product: true
        }
      }
    }
  })

  // =========================
  // VENTAS HOY
  // =========================

  const salesTodayInvoices = invoices.filter(i =>
    i.createdAt >= todayStart && i.createdAt <= todayEnd
  )

  const salesToday = salesTodayInvoices.reduce(
    (sum,i)=> sum + Number(i.orderTotalAmountDue || 0),
    0
  )

  // =========================
  // VENTAS MES
  // =========================

  const salesMonthInvoices = invoices.filter(i =>
    i.createdAt >= monthStart
  )

  const salesMonth = salesMonthInvoices.reduce(
    (sum,i)=> sum + Number(i.orderTotalAmountDue || 0),
    0
  )

  // =========================
  // CARTERA
  // =========================

  let accountsReceivable = 0

  for(const inv of invoices){

    const paid = inv.payments.reduce(
      (sum,p)=> sum + Number(p.amount),
      0
    )

    const balance = Number(inv.orderTotalAmountDue || 0) - paid

    if(balance > 0)
      accountsReceivable += balance
  }

  // =========================
  // FACTURAS VENCIDAS
  // =========================

  const overdueInvoices = invoices.filter(i =>
    i.dueDate && new Date(i.dueDate) < now
  ).length

  // =========================
  // TOP PRODUCTOS
  // =========================

  const productMap = {}

  for(const inv of invoices){

    for(const item of inv.details){

      if(!item.productId) continue

      if(!productMap[item.productId]){

        productMap[item.productId] = {
          productId: item.productId,
          productName: item.product?.name || "Producto",
          quantity: 0
        }

      }

      productMap[item.productId].quantity += Number(item.orderItemQuantity || 0)

    }

  }

  const topProducts = Object.values(productMap)
    .sort((a,b)=> b.quantity - a.quantity)
    .slice(0,5)

  // =========================
  // CASH FLOW
  // =========================

  const payments = await db.payment.findMany()

  const cashFlow = payments.reduce(
    (sum,p)=> sum + Number(p.amount),
    0
  )

  return {

    salesToday,
    salesMonth,

    accountsReceivable,

    overdueInvoices,

    cashFlow,

    topProducts

  }

}
