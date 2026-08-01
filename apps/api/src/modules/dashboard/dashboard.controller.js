import { getDashboardInvoices, getMonthlySalesChart } from './dashboard.service.js'
import * as service from "./dashboard.service.js"

export const invoiceDashboard = async (req, res) => {
  try {
    const data = await getDashboardInvoices(req.db)

    res.json({
      ok: true,
      data
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
}

export const monthlySalesChart = async (req, res) => {
  try {
    const data = await getMonthlySalesChart(req.db)

    res.json({
      ok: true,
      data
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
}


export const salesToday = async (req,res)=>{
  try{

    const data = await service.getSalesToday(req.db)

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


export const salesMonth = async (req,res)=>{
  try{

    const data = await service.getSalesMonth(req.db)

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


export const accountsReceivable = async (req,res)=>{
  try{

    const data = await service.getAccountsReceivable(req.db)

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


export const topProducts = async (req,res)=>{
  try{

    const data = await service.getTopProducts(req.db)

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


export const cashFlow = async (req,res)=>{
  try{

    const data = await service.getCashFlow(req.db)

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

export const fullDashboard = async (req,res)=>{

  try{

    const data = await service.getFullDashboard(req.db)

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
