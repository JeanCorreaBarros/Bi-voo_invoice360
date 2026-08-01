import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getRoles = async () => {
  return await prisma.role.findMany({
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

export const getPermissions = async () => {
  return await prisma.permission.findMany({
    orderBy: {
      code: 'asc'
    }
  });
};
