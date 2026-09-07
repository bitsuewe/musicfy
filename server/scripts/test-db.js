import pkg from '@prisma/client/default.js';
const { PrismaClient } = pkg;
import dotenv from 'dotenv';
dotenv.config();

console.log('DATABASE_URL starts with:', (process.env.DATABASE_URL || '').split('@')[1]);

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ PRISMA SUCCESSFULLY CONNECTED TO SUPABASE!');
    const count = await prisma.user.count();
    console.log('Total users in Supabase DB:', count);
    const users = await prisma.user.findMany({ take: 10 });
    console.log('Sample users:');
    users.forEach(u => console.log(` - ID: ${u.id}, Username: ${u.username}, Email: ${u.email}`));
  } catch (err) {
    console.error('❌ Connection error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
