import * as service from "./reportes.service.js"

export const getReportes = async(req,res)=>{
  try{

    const data = await service.getAllReportes()

    res.json({ ok:true, data })

  }catch(error){

    res.status(500).json({ ok:false, message:error.message })

  }
}

export const createReporte = async (req, res) => {
  try {

    const { nombre, descripcion, icon, descargas } = req.body;

    const data = await prisma.reporte.create({
      data: {
        nombre,
        descripcion,
        icon,
        descargas: {
          create: descargas
        }
      },
      include: {
        descargas: true
      }
    });

    res.json({ ok: true, data });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      message: error.message
    });

  }
};

export const getReporte = async (req, res) => {
  try {

    const data = await prisma.reporte.findMany({
      include: {
        descargas: true
      },
      orderBy: {
        id: "asc"
      }
    });

    res.json({ ok: true, data });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      message: error.message
    });

  }
};
export const updateReporte = async(req,res)=>{
  try{

    const data = await service.updateReporte(req.params.id,req.body)

    res.json({ ok:true, data })

  }catch(error){

    res.status(500).json({ ok:false, message:error.message })

  }
}

export const deleteReporte = async(req,res)=>{
  try{

    const data = await service.deleteReporte(req.params.id)

    res.json({ ok:true, data })

  }catch(error){

    res.status(500).json({ ok:false, message:error.message })

  }
}

export const createDescarga = async(req,res)=>{
  try{

    const data = await service.createDescarga(req.body)

    res.json({ ok:true, data })

  }catch(error){

    res.status(500).json({ ok:false, message:error.message })

  }
}

export const deleteDescarga = async(req,res)=>{
  try{

    const data = await service.deleteDescarga(req.params.id)

    res.json({ ok:true, data })

  }catch(error){

    res.status(500).json({ ok:false, message:error.message })

  }
}