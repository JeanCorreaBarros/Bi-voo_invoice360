import {
  createWarehouse,
  listWarehouses,
  updateWarehouse,
  deactivateWarehouse,
  getStockByWarehouse,
  createTransfer,
  listTransfers
} from './warehouse.service.js'

export const create = async (req, res) => {
  try {
    const { name, code, address } = req.body
    if (!name) return res.status(400).json({ ok: false, message: 'El nombre de la bodega es obligatorio' })
    const warehouse = await createWarehouse(req.db, { name, code, address })
    res.status(201).json({ ok: true, data: warehouse })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const list = async (req, res) => {
  try {
    const { active } = req.query
    const data = await listWarehouses(req.db, { active: active === undefined ? undefined : active === 'true' })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const update = async (req, res) => {
  try {
    const warehouse = await updateWarehouse(req.db, req.params.id, req.body)
    res.json({ ok: true, data: warehouse })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const deactivate = async (req, res) => {
  try {
    const warehouse = await deactivateWarehouse(req.db, req.params.id)
    res.json({ ok: true, data: warehouse })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const stockByWarehouse = async (req, res) => {
  try {
    const data = await getStockByWarehouse(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const transferCreate = async (req, res) => {
  try {
    const { productId, fromWarehouseId, toWarehouseId, quantity, reason } = req.body
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
      return res.status(400).json({ ok: false, message: 'Producto, bodega origen, bodega destino y cantidad son obligatorios' })
    }
    const transfer = await createTransfer(req.db, {
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity: Number(quantity),
      reason,
      userId: req.user?.id
    })
    res.status(201).json({ ok: true, data: transfer })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const transferList = async (req, res) => {
  try {
    const { page, limit } = req.query
    const data = await listTransfers(req.db, { page, limit })
    res.json({ ok: true, ...data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
