import * as service from "./inventory.service.js"

export const kardex = async(req,res)=>{

  try{

    const { productId } = req.params

    const data = await service.getKardex(req.db, productId)

    res.json({
      ok:true,
      data
    })

  }catch(error){

    res.status(500).json({
      ok:false,
      message:error.message
    })

  }

}

export const kardexAll = async(req,res)=>{

  try{

    const data = await service.getKardexAll(req.db)

    res.json({
      ok:true,
      data
    })

  }catch(error){

    res.status(500).json({
      ok:false,
      message:error.message
    })

  }

}


export const stock = async(req,res)=>{

  try{

    const data = await service.getStock(req.db)

    res.json({
      ok:true,
      data
    })

  }catch(error){

    res.status(500).json({
      ok:false,
      message:error.message
    })

  }

}
