# Ayni Care — Skill Base de Datos

## Stack
- PostgreSQL (alojado en Supabase)
- Prisma 5.x como ORM
- Schema en `apps/backend/prisma/schema.prisma`

## Schema completo — Prisma

```prisma
// apps/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── FAMILIA ────────────────────────────────────────

model Family {
  id          String         @id @default(uuid())
  name        String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  members     FamilyMember[]
  elderly     ElderlyPerson?
  activities  Activity[]
  medications Medication[]
  appointments Appointment[]
  expenses    Expense[]
  notes       Note[]
  invitations Invitation[]
}

model FamilyMember {
  id           String       @id @default(uuid())
  familyId     String
  userId       String       @unique  // ID de Supabase Auth
  name         String
  phone        String?
  email        String?
  role         MemberRole
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  family       Family       @relation(fields: [familyId], references: [id])
  assignedActivities Activity[] @relation("AssignedTo")
  activityLogs ActivityLog[]
  medLogs      MedLog[]
  expenses     Expense[]    @relation("PaidBy")
  expenseSplits ExpenseSplit[]
  notes        Note[]
}

enum MemberRole {
  primary_caregiver
  remote_family
  weekend_helper
  paid_caregiver
}

model Invitation {
  id        String   @id @default(uuid())
  familyId  String
  email     String?
  phone     String?
  role      MemberRole
  token     String   @unique @default(uuid())
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  family    Family   @relation(fields: [familyId], references: [id])
}

// ─── ADULTO MAYOR ────────────────────────────────────

model ElderlyPerson {
  id          String    @id @default(uuid())
  familyId    String    @unique
  name        String
  birthDate   DateTime?
  conditions  String[]  // ["Alzheimer", "Diabetes tipo 2"]
  allergies   String[]
  bloodType   String?
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  family      Family    @relation(fields: [familyId], references: [id])
}

// ─── ACTIVIDADES (CHECKLIST) ─────────────────────────

model Activity {
  id           String       @id @default(uuid())
  familyId     String
  assignedToId String?
  title        String
  description  String?
  scheduledAt  DateTime?
  recurrence   Recurrence?  // si es recurrente
  status       ActivityStatus @default(pending)
  priority     Priority     @default(normal)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  deletedAt    DateTime?    // soft delete
  family       Family       @relation(fields: [familyId], references: [id])
  assignedTo   FamilyMember? @relation("AssignedTo", fields: [assignedToId], references: [id])
  logs         ActivityLog[]
}

model ActivityLog {
  id          String       @id @default(uuid())
  activityId  String
  completedById String
  completedAt DateTime     @default(now())
  notes       String?
  activity    Activity     @relation(fields: [activityId], references: [id])
  completedBy FamilyMember @relation(fields: [completedById], references: [id])
}

enum ActivityStatus {
  pending
  in_progress
  completed
  cancelled
  skipped
}

enum Priority {
  urgent
  normal
  low
}

enum Recurrence {
  daily
  weekly
  monthly
  custom
}

// ─── MEDICAMENTOS ────────────────────────────────────

model Medication {
  id          String    @id @default(uuid())
  familyId    String
  name        String
  dosage      String    // "10mg", "1 comprimido"
  form        String?   // "pastilla", "jarabe", "inyección"
  frequency   String    // "cada 8 horas", "una vez al día"
  times       String[]  // ["08:00", "14:00", "20:00"]
  instructions String?  // "tomar con comida"
  startDate   DateTime
  endDate     DateTime?
  isActive    Boolean   @default(true)
  stock       Int?      // unidades disponibles
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?    // soft delete
  family      Family    @relation(fields: [familyId], references: [id])
  logs        MedLog[]
}

model MedLog {
  id           String       @id @default(uuid())
  medicationId String
  givenById    String
  givenAt      DateTime     @default(now())
  skipped      Boolean      @default(false)
  skipReason   String?
  notes        String?
  medication   Medication   @relation(fields: [medicationId], references: [id])
  givenBy      FamilyMember @relation(fields: [givenById], references: [id])
}

// ─── CITAS ────────────────────────────────────────────

model Appointment {
  id          String    @id @default(uuid())
  familyId    String
  title       String    // "Cardiólogo - Dr. García"
  type        AppointmentType
  location    String?   // "Clínica San Felipe, Consultorio 305"
  doctorName  String?
  scheduledAt DateTime
  durationMin Int?      // duración estimada en minutos
  notes       String?
  reminderSent Boolean  @default(false)
  status      AppointmentStatus @default(scheduled)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?    // soft delete
  family      Family    @relation(fields: [familyId], references: [id])
}

enum AppointmentType {
  medical
  therapy
  lab
  pharmacy
  other
}

enum AppointmentStatus {
  scheduled
  completed
  cancelled
  rescheduled
}

// ─── GASTOS COMPARTIDOS ──────────────────────────────

model Expense {
  id          String         @id @default(uuid())
  familyId    String
  paidById    String
  title       String         // "Medicamentos de enero", "Cita cardiólogo"
  amount      Decimal        @db.Decimal(10, 2)
  currency    String         @default("PEN") // Soles peruanos
  category    ExpenseCategory
  date        DateTime
  receipt     String?        // URL de foto del comprobante
  notes       String?
  createdAt   DateTime       @default(now())
  deletedAt   DateTime?      // soft delete
  family      Family         @relation(fields: [familyId], references: [id])
  paidBy      FamilyMember   @relation("PaidBy", fields: [paidById], references: [id])
  splits      ExpenseSplit[]
}

model ExpenseSplit {
  id        String       @id @default(uuid())
  expenseId String
  memberId  String
  amount    Decimal      @db.Decimal(10, 2)
  isPaid    Boolean      @default(false)
  paidAt    DateTime?
  expense   Expense      @relation(fields: [expenseId], references: [id])
  member    FamilyMember @relation(fields: [memberId], references: [id])
}

enum ExpenseCategory {
  medications
  medical
  food
  transport
  hygiene
  equipment
  other
}

// ─── NOTAS MÉDICAS ────────────────────────────────────

model Note {
  id        String       @id @default(uuid())
  familyId  String
  authorId  String
  title     String?
  content   String
  type      NoteType     @default(general)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  deletedAt DateTime?    // soft delete
  family    Family       @relation(fields: [familyId], references: [id])
  author    FamilyMember @relation(fields: [authorId], references: [id])
}

enum NoteType {
  general
  medical
  handoff      // nota de turno entre cuidadores
  symptom      // registro de síntoma nuevo
  observation  // observación del día
}
```

## Reglas de la base de datos

### Soft delete
Los modelos Activity, Medication, Appointment, Expense y Note usan soft delete con `deletedAt DateTime?`.

**Reglas:**
- NUNCA usar `prisma.model.delete()` en estos modelos. Usar update con `deletedAt: new Date()`
- SIEMPRE agregar `deletedAt: null` al `where` de queries de lectura
- Para restaurar: `update({ where: { id }, data: { deletedAt: null } })`

**Patrón de soft delete:**
```typescript
// ❌ MAL — borra permanentemente
await prisma.activity.delete({ where: { id } });

// ✅ BIEN — soft delete
await prisma.activity.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// ✅ BIEN — query que excluye eliminados
const activities = await prisma.activity.findMany({
  where: {
    familyId,
    deletedAt: null, // SIEMPRE incluir esto
  },
});
```

**Modelos SIN soft delete** (se borran normalmente):
- `ActivityLog` y `MedLog` — son registros históricos, nunca se borran
- `ExpenseSplit` — se eliminan en cascada con el Expense padre
- `Invitation` — son efímeras, se pueden borrar al expirar
- `FamilyMember` — se desactivan con `isActive: false`, no se borran

### Migraciones
```bash
# Crear migración después de cambiar schema.prisma
npx prisma migrate dev --name descripcion-del-cambio

# Aplicar en producción
npx prisma migrate deploy

# Ver estado de migraciones
npx prisma migrate status
```

### NUNCA hacer
- Nunca modificar una migración ya aplicada en producción
- Nunca eliminar columnas sin antes deprecarlas (agrega `@deprecated` al schema y espera un deploy)
- Nunca hacer queries sin filtrar por `familyId` (datos de una familia no deben ser visibles a otra)
- Nunca usar `deleteMany` sin un `where` muy específico
- Nunca usar `prisma.model.delete()` en modelos con soft delete (usar update con deletedAt)

### Seed de datos de prueba
```bash
# Correr seed
npx prisma db seed

# El seed crea:
# - 1 familia "García Rodríguez"
# - 3 FamilyMembers con roles diferentes
# - 1 ElderlyPerson (Rosa, 78 años)
# - 5 actividades del día (con diferentes estados)
# - 3 medicamentos activos
# - 2 citas próximas
# - 2 gastos recientes
```

### Queries frecuentes — Patrones Prisma

```typescript
// Actividades del día de una familia
const today = new Date();
const activities = await prisma.activity.findMany({
  where: {
    familyId, // SIEMPRE filtrar por familyId
    scheduledAt: {
      gte: startOfDay(today),
      lte: endOfDay(today),
    },
  },
  include: {
    assignedTo: { select: { name: true, id: true } },
    logs: { orderBy: { completedAt: 'desc' }, take: 1 },
  },
  orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }],
});

// Medicamentos activos con sus logs del día
const medications = await prisma.medication.findMany({
  where: { familyId, isActive: true },
  include: {
    logs: {
      where: { givenAt: { gte: startOfDay(today) } },
      include: { givenBy: { select: { name: true } } },
    },
  },
});
```
