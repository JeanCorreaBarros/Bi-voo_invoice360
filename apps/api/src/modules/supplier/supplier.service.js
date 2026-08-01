export const create = async (db, data) => {
  return await db.supplier.create({
    data,
  });
};

export const findAll = async (db) => {
  return await db.supplier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
};

export const findById = async (db, id) => {
  return await db.supplier.findUnique({
    where: { id },
  });
};

export const update = async (db, id, data) => {
  return await db.supplier.update({
    where: { id },
    data,
  });
};

export const deleteSupplier = async (db, id) => {
  return await db.supplier.update({
    where: { id },
    data: { active: false },
  });
};
