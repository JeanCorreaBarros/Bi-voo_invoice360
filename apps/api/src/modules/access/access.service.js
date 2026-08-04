// Role/Permission viven en la BD del tenant (se duplican por empresa).
export const getRoles = async (db) => {
  return await db.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
};

export const getPermissions = async (db) => {
  return await db.permission.findMany({
    orderBy: {
      code: 'asc'
    }
  });
};

// ADMIN es el rol que se siembra al provisionar la empresa y el que tiene
// el primer usuario administrador: no se puede renombrar, quedarse sin
// permisos ni borrar, porque dejaría a la empresa sin nadie que pueda
// administrarla.
const PROTECTED_ROLE_NAME = 'ADMIN';

async function assertRoleEditable(db, roleId) {
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error('Rol no encontrado');
  if (role.name === PROTECTED_ROLE_NAME) {
    throw new Error('El rol ADMIN es del sistema y no se puede modificar ni eliminar');
  }
  return role;
}

// Traduce los códigos de permiso recibidos a ids reales. Un código que no
// exista en el catálogo se ignora en silencio (el frontend manda su propio
// catálogo estático, que puede ir por delante de lo sembrado en la BD).
async function resolvePermissionIds(db, permissionCodes) {
  if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) return [];
  const permissions = await db.permission.findMany({
    where: { code: { in: permissionCodes } },
    select: { id: true }
  });
  return permissions.map((p) => p.id);
}

export const createRole = async (db, { name, description, permissionCodes }) => {
  const trimmedName = name?.trim();
  if (!trimmedName) throw new Error('El nombre del rol es obligatorio');

  const existing = await db.role.findUnique({ where: { name: trimmedName } });
  if (existing) throw new Error('Ya existe un rol con ese nombre');

  const permissionIds = await resolvePermissionIds(db, permissionCodes);

  return db.role.create({
    data: {
      name: trimmedName,
      description: description?.trim() || null,
      permissions: {
        create: permissionIds.map((permissionId) => ({ permissionId }))
      }
    },
    include: { permissions: { include: { permission: true } } }
  });
};

export const updateRole = async (db, roleId, { name, description, permissionCodes }) => {
  await assertRoleEditable(db, roleId);

  const trimmedName = name?.trim();
  if (trimmedName) {
    const duplicate = await db.role.findUnique({ where: { name: trimmedName } });
    if (duplicate && duplicate.id !== roleId) {
      throw new Error('Ya existe un rol con ese nombre');
    }
  }

  // Los permisos llegan como el set completo deseado, así que se reemplazan
  // enteros en vez de hacer diff: se borran los actuales y se crean los
  // nuevos dentro de la misma transacción.
  return db.$transaction(async (tx) => {
    if (Array.isArray(permissionCodes)) {
      const permissionIds = await resolvePermissionIds(tx, permissionCodes);
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId }))
        });
      }
    }

    return tx.role.update({
      where: { id: roleId },
      data: {
        ...(trimmedName ? { name: trimmedName } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {})
      },
      include: { permissions: { include: { permission: true } } }
    });
  });
};

export const deleteRole = async (db, roleId) => {
  await assertRoleEditable(db, roleId);

  const assignedUsers = await db.userRole.count({ where: { roleId } });
  if (assignedUsers > 0) {
    throw new Error(
      `No se puede eliminar: el rol está asignado a ${assignedUsers} usuario(s). Reasígnalos primero.`
    );
  }

  return db.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    return tx.role.delete({ where: { id: roleId } });
  });
};
