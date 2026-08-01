import * as accessService from './access.service.js';

export const getRoles = async (req, res) => {
  try {
    const roles = await accessService.getRoles();

    const formatted = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(rp => ({
        id: rp.permission.id,
        code: rp.permission.code,
        description: rp.permission.description
      }))
    }));

    res.json(formatted);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo roles' });
  }
};

export const getPermissions = async (req, res) => {
  try {
    const permissions = await accessService.getPermissions();
    res.json(permissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo permisos' });
  }
};
