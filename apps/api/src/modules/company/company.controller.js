import {
  createCompanyWithAdmin,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  activateCompany,
  getCompanyAdmin,
  createCompanyAdmin,
  updateCompanyAdmin
} from "./company.service.js"

function canManageCompany(req) {
  return req.user.permissions?.includes("company.manage") || req.params.id === req.tenantId
}

// Crear empresa + primer usuario administrador
export const create = async (req, res) => {
  try {
    const { company, admin, isDemo } = req.body

    if (!company || !admin || !admin.email || !admin.password) {
      return res.status(400).json({
        ok: false,
        message: "Se requiere 'company' y 'admin' (con email y password)"
      })
    }

    const result = await createCompanyWithAdmin({ company, admin, isDemo: Boolean(isDemo) })

    res.status(201).json({
      ok: true,
      data: result
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

// Listar
export const list = async (req, res) => {
  if (req.user.permissions?.includes("company.manage")) {
    const companies = await getCompanies()
    res.json({ ok: true, data: companies })
  } else if (req.tenantId) {
    const company = await getCompanyById(req.tenantId)
    res.json({ ok: true, data: company ? [company] : [] })
  } else {
    res.status(403).json({ ok: false, message: "No tienes permiso para ver empresas" })
  }
}

// Obtener por ID
export const getById = async (req, res) => {
  try {
    if (!req.user.permissions?.includes("company.manage") && req.params.id !== req.tenantId) {
      return res.status(403).json({ ok: false, message: "No tienes permiso para ver esta empresa" })
    }

    const company = await getCompanyById(req.params.id)

    if (!company)
      return res.status(404).json({ message: "Empresa no encontrada" })

    res.json({
      ok: true,
      data: company
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

// Actualizar
export const update = async (req, res) => {
  try {
    if (!req.user.permissions?.includes("company.manage") && req.params.id !== req.tenantId) {
      return res.status(403).json({ ok: false, message: "No tienes permiso para editar esta empresa" })
    }

    const company = await updateCompany(req.params.id, req.body)

    res.json({
      ok: true,
      data: company
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

// Desactivar
export const remove = async (req, res) => {
  try {
    await deleteCompany(req.params.id)

    res.json({
      ok: true,
      message: "Empresa desactivada"
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}


export const activate = async (req, res) => {
  try {
    await activateCompany(req.params.id)

    res.json({
      ok: true,
      message: "Empresa activada"
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

// Administrador de la empresa (usado por el panel de SUPER_ADMIN, que no
// tiene su propia BD y necesita cruzar a la BD del tenant vía companyId).
export const getAdmin = async (req, res) => {
  try {
    if (!canManageCompany(req)) {
      return res.status(403).json({ ok: false, message: "No tienes permiso para ver el administrador de esta empresa" })
    }

    const admin = await getCompanyAdmin(req.params.id)
    res.json({ ok: true, data: admin })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const createAdmin = async (req, res) => {
  try {
    if (!canManageCompany(req)) {
      return res.status(403).json({ ok: false, message: "No tienes permiso para crear el administrador de esta empresa" })
    }

    const admin = await createCompanyAdmin(req.params.id, req.body)
    res.status(201).json({ ok: true, data: admin })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const updateAdmin = async (req, res) => {
  try {
    if (!canManageCompany(req)) {
      return res.status(403).json({ ok: false, message: "No tienes permiso para editar el administrador de esta empresa" })
    }

    const current = await getCompanyAdmin(req.params.id)
    if (!current) {
      return res.status(404).json({ ok: false, message: "No hay administrador registrado para esta empresa" })
    }

    const admin = await updateCompanyAdmin(req.params.id, current.id, req.body)
    res.json({ ok: true, data: admin })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const uploadLogo = async (req, res) => {
  try {
    if (!req.user.permissions?.includes("company.manage") && req.params.id !== req.tenantId) {
      return res.status(403).json({ ok: false, message: "No tienes permiso para editar esta empresa" })
    }

    const file = req.file

    if (!file) {
      return res.status(400).json({
        ok: false,
        message: "No se envió ningún archivo"
      })
    }

    const logoUrl = `/uploads/company/${file.filename}`

    const company = await updateCompany(req.params.id, {
      logo: logoUrl
    })

    res.json({
      ok: true,
      data: company
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}
