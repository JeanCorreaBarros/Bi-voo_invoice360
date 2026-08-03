import * as service from './invoice.service.js'

export async function create(req, res) {
  try {

    const invoice = await service.createInvoice(req.db, req.body)

    res.status(201).json({
      ok: true,
      invoice
    })

  } catch (error) {

    console.error(error)

    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

export const update = async (req, res) => {
  try {
    const { id } = req.params

    const invoice = await service.updateInvoice(
      req.db,
      Number(id),
      req.body
    )

    res.json({
      ok: true,
      data: invoice
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}



export async function list(req, res) {
  try {
    const result = await service.getInvoices(req.db, req.query)
    res.json({ ok: true, ...result })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function getById(req, res) {
  try {
    const invoice = await service.getInvoiceById(req.db, req.params.id)
    res.json({ ok: true, invoice })
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message })
  }
}

export async function getByNumber(req, res) {
  try {
    const { prefix, number } = req.params
    const invoice = await service.getInvoiceByNumber(req.db, prefix, number)
    res.json({ ok: true, invoice })
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message })
  }
}


export async function cancel(req, res) {
  try {
    const { prefix, number } = req.params
    const result = await service.cancelInvoice(req.db, prefix, number)
    res.json({ ok: true, ...result })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
