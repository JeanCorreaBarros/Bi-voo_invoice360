export async function getProfitReport(from, to) {

  const where = {
    status: { not: "CANCELLED" }
  }

  if (from && to) {
    where.createdAt = {
      gte: new Date(from),
      lte: new Date(to)
    }
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      details: {
        include: {
          product: true
        }
      }
    }
  })

  let totalSales = 0
  let totalCost = 0

  for (const inv of invoices) {

    totalSales += Number(inv.orderTotalAmountDue || 0)

    for (const item of inv.details) {

      if (!item.product) continue

      const quantity = Number(item.orderItemQuantity || 0)

      const cost = Number(item.product.cost || 0)

      totalCost += quantity * cost

    }

  }

  const profit = totalSales - totalCost

  return {

    totalSales,
    totalCost,
    profit,
    margin: totalSales > 0 ? (profit / totalSales) * 100 : 0

  }

}