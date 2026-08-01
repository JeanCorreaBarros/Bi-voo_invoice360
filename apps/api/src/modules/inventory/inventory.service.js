export async function getKardex(db, productId){

  const movements = await db.inventoryMovement.findMany({

    where:{
      productId
    },

    orderBy:{
      createdAt:"asc"
    }

  })

  let stock = 0

  const kardex = movements.map(m=>{

    stock += m.quantity

    return{
      date:m.createdAt,
      type:m.type,
      quantity:m.quantity,
      stock
    }

  })

  return kardex

}

export async function getKardexAll(db){

  const movements = await db.inventoryMovement.findMany({

    include:{
      product:true
    },

    orderBy:{
      createdAt:"desc"
    }

  })

  return movements.map(m=>({

    date:m.createdAt,
    product:m.product?.name,
    type:m.type,
    quantity:m.quantity

  }))

}

export async function getStock(db){

  const products = await db.product.findMany({

    select:{
      id:true,
      name:true,
      sku:true,
      stock:true
    }

  })

  return products

}
