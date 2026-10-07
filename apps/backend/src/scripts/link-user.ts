import 'dotenv/config';
import { prisma } from '../prisma/client';
import { supabaseAdmin } from '../lib/supabase';

async function linkRealUser() {
  const targetEmail = 'marchristian48@gmail.com';
  console.log(`Buscando usuario en Supabase con email: ${targetEmail}...`);

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error listando usuarios en Supabase:', error);
    return;
  }

  const supabaseUser = data.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());

  if (supabaseUser) {
    console.log(`✅ Usuario encontrado en Supabase: ID = ${supabaseUser.id}, Email = ${supabaseUser.email}`);
    
    // Actualizar el miembro de Christian para que tenga este userId y email exactos
    const updated = await prisma.familyMember.updateMany({
      where: { name: { contains: 'Christian', mode: 'insensitive' } },
      data: {
        userId: supabaseUser.id,
        email: targetEmail,
      },
    });

    console.log(`✅ Vinculado exitosamente con ${updated.count} registro(s) de FamilyMember.`);
  } else {
    console.log(`ℹ️ Usuario no encontrado aún en Supabase auth. Actualizando email en FamilyMember a ${targetEmail}...`);
    await prisma.familyMember.updateMany({
      where: { name: { contains: 'Christian', mode: 'insensitive' } },
      data: {
        email: targetEmail,
      },
    });
    console.log(`✅ Email actualizado a ${targetEmail}.`);
  }
}

linkRealUser().finally(() => prisma.$disconnect());
