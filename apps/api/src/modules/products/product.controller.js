import {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  activateProduct,
  deactivateProduct
} from './product.service.js'

import { moveStock } from './inventory.service.js'

export async function create(req, res) {
  const product = await createProduct(req.db, req.body)
  res.json({ entity: product })
}

export async function list(req, res) {
  const { active } = req.query

  const products = await listProducts(req.db, {
    active:
      active === undefined
        ? undefined
        : active === 'true'
  })

  res.json(products)
}

export async function getById(req, res) {
  const product = await getProductById(req.db, req.params.id)

  if (!product)
    return res.status(404).json({ message: 'Producto no encontrado' })

  res.json({ entity: product })
}

export async function update(req, res) {
  const product = await updateProduct(
    req.db,
    req.params.id,
    req.body
  )

  res.json({ entity: product })
}

export async function move(req, res) {
  const { type, quantity, reason } = req.body

  const [product] = await moveStock(req.db, {
    productId: req.params.id,
    type,
    quantity,
    reason
  })

  res.json({ entity: product })
}

export async function activate(req, res) {
  const product = await activateProduct(req.db, req.params.id)
  res.json({ entity: product })
}

export async function deactivate(req, res) {
  const product = await deactivateProduct(req.db, req.params.id)
  res.json({ entity: product })
}
