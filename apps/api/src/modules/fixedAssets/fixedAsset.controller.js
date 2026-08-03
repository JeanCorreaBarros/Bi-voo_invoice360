import {
  listFixedAssets,
  createFixedAsset,
  updateFixedAsset,
  deactivateFixedAsset,
  runDepreciation
} from './fixedAsset.service.js'

export async function list(req, res) {
  try {
    const { active } = req.query
    const data = await listFixedAssets(req.db, { active: active === undefined ? undefined : active === 'true' })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function create(req, res) {
  try {
    const data = await createFixedAsset(req.db, req.body)
    res.status(201).json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function update(req, res) {
  try {
    const data = await updateFixedAsset(req.db, req.params.id, req.body)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function deactivate(req, res) {
  try {
    const data = await deactivateFixedAsset(req.db, req.params.id)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function depreciate(req, res) {
  try {
    const data = await runDepreciation(req.db, req.params.id, req.user.id)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
