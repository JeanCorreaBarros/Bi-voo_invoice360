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
