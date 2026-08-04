import * as accessService from './access.service.js';

function formatRole(role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map(rp => ({
      id: rp.permission.id,
      code: rp.permission.code,
      description: rp.permission.description
    }))
  };
}

export const getRoles = async (req, res) => {
  try {
    const roles = await accessService.getRoles(req.db);
    res.json(roles.map(formatRole));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo roles' });
  }
};

export const getPermissions = async (req, res) => {
  try {
    const permissions = await accessService.getPermissions(req.db);
    res.json(permissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo permisos' });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description, permissionCodes } = req.body;
    const role = await accessService.createRole(req.db, { name, description, permissionCodes });
    res.status(201).json(formatRole(role));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { name, description, permissionCodes } = req.body;
    const role = await accessService.updateRole(req.db, req.params.id, { name, description, permissionCodes });
    res.json(formatRole(role));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRole = async (req, res) => {
  try {
    await accessService.deleteRole(req.db, req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
