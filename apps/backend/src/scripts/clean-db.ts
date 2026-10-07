import 'dotenv/config';
import { prisma } from '../prisma/client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function clean() {
  console.log('--- Iniciando limpieza de base de datos y Supabase Auth ---');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados en el archivo .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 1. Eliminar usuarios de Supabase Auth
  try {
    console.log('Listando usuarios de Supabase Auth...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    console.log(`Se encontraron ${users.length} usuario(s) en Supabase Auth.`);
    for (const user of users) {
      console.log(`Eliminando usuario auth: ${user.email || user.phone} (ID: ${user.id})...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Error al eliminar usuario auth ${user.id}:`, deleteError.message);
      } else {
        console.log(`Usuario auth ${user.id} eliminado correctamente.`);
      }
    }
  } catch (error) {
    console.error('Error al limpiar usuarios de Supabase Auth:', error);
  }

  // 2. Limpiar tablas de la base de datos PostgreSQL pública con Prisma
  try {
    console.log('Eliminando registros de la base de datos pública...');

    // Las eliminamos en orden inverso de dependencias para evitar errores de FK
    console.log('Borrando MedLogs...');
    await prisma.medLog.deleteMany({});

    console.log('Borrando ActivityLogs...');
    await prisma.activityLog.deleteMany({});

    console.log('Borrando ExpenseSplits...');
    await prisma.expenseSplit.deleteMany({});

    console.log('Borrando Activities...');
    await prisma.activity.deleteMany({});

    console.log('Borrando Medications...');
    await prisma.medication.deleteMany({});

    console.log('Borrando Appointments...');
    await prisma.appointment.deleteMany({});

    console.log('Borrando Expenses...');
    await prisma.expense.deleteMany({});

    console.log('Borrando Notes...');
    await prisma.note.deleteMany({});

    console.log('Borrando Invitations...');
    await prisma.invitation.deleteMany({});

    console.log('Borrando ElderlyPeople...');
    await prisma.elderlyPerson.deleteMany({});

    console.log('Borrando FamilyMembers...');
    await prisma.familyMember.deleteMany({});

    console.log('Borrando Families...');
    await prisma.family.deleteMany({});

    console.log('¡Base de datos pública limpiada exitosamente!');
  } catch (error) {
    console.error('Error al limpiar tablas de la base de datos con Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('--- Proceso de limpieza finalizado ---');
}

clean();
