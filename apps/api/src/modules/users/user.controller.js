// src/modules/users/user.controller.js
import * as userService from './user.service.js'

export async function createUser(req, res) {
  try {
    const targetCompanyId = req.tenantId === null && req.body.companyId 
      ? req.body.companyId 
      : req.tenantId

    const user = await userService.createUser(targetCompanyId, req.body)
    res.status(201).json(user)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function updateUser(req, res) {
  try {
    const user = await userService.updateUser(req.tenantId, req.params.id, req.body)
    res.json(user)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function changePassword(req, res) {
  try {
    await userService.changePassword(req.tenantId, req.params.id, req.body.newPassword)
    res.json({ message: 'Password updated successfully' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function toggleUser(req, res) {
  try {
    const user = await userService.toggleUser(req.tenantId, req.params.id)
    res.json(user)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function listUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    // Si es SUPER_ADMIN (tenantId es null) y envían companyId, usar ese.
    const targetCompanyId = req.tenantId === null && req.query.companyId 
      ? req.query.companyId 
      : req.tenantId

    const result = await userService.listUsers(targetCompanyId, page, limit)

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
