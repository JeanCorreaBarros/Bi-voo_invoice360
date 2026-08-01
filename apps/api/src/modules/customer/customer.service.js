export const create = async (db, data) => {
  return await db.customer.create({ data });
};

export const findAll = async (db) => {
  return await db.customer.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
};

export const findById = async (db, id) => {
  return await db.customer.findUnique({
    where: { id },
  });
};

export const update = async (db, id, data) => {
  return await db.customer.update({
    where: { id },
    data,
  });
};

export const deleteCustomer = async (db, id) => {
  return await db.customer.update({
    where: { id },
    data: { active: false },
  });
};

export const deactivate = async (db, id) => {
  return await db.customer.update({
    where: { id },
    data: { active: false }
  });
};

export const activate = async (db, id) => {
  return await db.customer.update({
    where: { id },
    data: { active: true }
  });
};
