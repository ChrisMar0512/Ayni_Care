import { prisma } from '../src/prisma/client';

export const cleanupDatabase = async () => {
  // Eliminar en orden para evitar fallos de restricciones de clave foránea
  await prisma.activityLog.deleteMany({});
  await prisma.medLog.deleteMany({});
  await prisma.expenseSplit.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.medication.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.familyMember.deleteMany({});
  await prisma.elderlyPerson.deleteMany({});
  await prisma.family.deleteMany({});
};

export interface TestFamilyOptions {
  name?: string;
  roles?: ('primary_caregiver' | 'remote_family' | 'weekend_helper' | 'paid_caregiver')[];
}

export const createTestFamily = async (options: TestFamilyOptions = {}) => {
  const familyName = options.name || `Test Family ${Math.floor(Math.random() * 1000000)}`;
  const roles = options.roles || ['primary_caregiver'];

  // Crear la familia
  const family = await prisma.family.create({
    data: { name: familyName },
  });

  // Crear al adulto mayor
  const elderly = await prisma.elderlyPerson.create({
    data: {
      name: 'Abuelo Test',
      birthDate: new Date('1940-01-01'),
      familyId: family.id,
    },
  });

  const members = [];
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const suffix = Math.floor(Math.random() * 1000000);
    const userId = `user-${role}-${suffix}`;
    const member = await prisma.familyMember.create({
      data: {
        userId,
        familyId: family.id,
        name: `Nombre ${role}`,
        email: `test-${role}-${suffix}@aynicare.local`,
        role,
        isActive: true,
      },
    });
    members.push(member);
  }

  return { family, elderly, members, member: members[0]! };
};

export const getAuthToken = (userId: string): string => {
  return `dev-token-new:${userId}`;
};
