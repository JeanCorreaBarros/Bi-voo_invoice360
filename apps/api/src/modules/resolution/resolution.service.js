export const create = async (db, data) => {
  return await db.resolution.create({
    data,
  });
};

export const findAll = async (db) => {
  return await db.resolution.findMany({
    orderBy: { id: "desc" },
  });
};

export const findById = async (db, id) => {
  return await db.resolution.findUnique({
    where: { id: Number(id) },
  });
};

export const update = async (db, id, data) => {
  return await db.resolution.update({
    where: { id: Number(id) },
    data,
  });
};

export const remove = async (db, id) => {
  return await db.resolution.update({
    where: { id: Number(id) },
    data: { active: false },
  });
};
