export const getSalesSummaryService = async (db, { from, to }) => {
  return await db.invoice.aggregate({
    _sum: {
      orderTotalAfterTax: true,
      orderTotalAmountDue: true,
      orderTotalTax: true,
      orderTotalBeforeTax: true
    },
    _count: {
      id: true
    },
    where: {
      status: "PENDING",
      orderDate: {
        gte: new Date(from),
        lte: new Date(to)
      }
    }
  });
};

export const getSalesListService = async (db, { from, to }) => {
  return await db.invoice.findMany({
    where: {
      status: "PENDING",
      orderDate: {
        gte: new Date(from),
        lte: new Date(to)
      }
    },
    orderBy: {
      orderDate: "desc"
    },
    select: {
      id: true,
      orderPrefix: true,
      orderId: true,
      orderReceiverName: true,
      orderReceiverNit: true,
      orderDate: true,
      orderTotalAfterTax: true,
      orderTotalAmountDue: true,
      dianStatus: true,
      status: true,
      companyId: true
    }
  });
};

export const getSalesSummaryFormattedService = async (db, { from, to }) => {
  const result = await db.invoice.aggregate({
    _sum: {
      orderTotalAfterTax: true,
      orderTotalTax: true
    },
    _count: {
      id: true
    },
    where: {
      status: "PENDING",
      orderDate: {
        gte: new Date(from),
        lte: new Date(to)
      }
    }
  });

  return {
    totalInvoices: result._count.id,
    totalSales: Number(result._sum.orderTotalAfterTax || 0),
    totalTax: Number(result._sum.orderTotalTax || 0)
  };
};

const MAX_LIMIT = 1000; // seguridad servidor

export const getSalesService = async (db, {
  from,
  to,
  page = 1,
  limit = 50
}) => {

  const safeLimit = Math.min(Number(limit), MAX_LIMIT);
  const skip = (Number(page) - 1) * safeLimit;

  const where = {
    orderDate: {
      gte: new Date(from),
      lte: new Date(to)
    }
  };

  const [data, total] = await Promise.all([
    db.invoice.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { orderDate: "desc" },
      select: {
        id: true,
        orderPrefix: true,
        orderId: true,
        orderReceiverName: true,
        orderReceiverNit: true,
        orderDate: true,
        orderTotalAfterTax: true,
        status: true,
        dianStatus: true,
        companyId: true
      }
    }),

    db.invoice.count({ where })
  ]);

  return {
    data,
    pagination: {
      total,
      page: Number(page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};
