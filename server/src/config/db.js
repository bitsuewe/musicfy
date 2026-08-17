import pkg from '@prisma/client/default.js';
const { PrismaClient } = pkg;

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
