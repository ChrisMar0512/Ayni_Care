import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { MemberRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { broadcast } from './realtime.service';
import { AssistantChatResponse, AssistantWidget } from '../types/assistant';

// Helper to initialize Gemini client safely
const getGeminiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY no está configurada en las variables de entorno.'
    );
  }

  return new GoogleGenAI({ apiKey });
};

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_FAST_MODEL = 'gemini-3.5-flash-lite';

// Transcripción fiel y ultrarrápida de notas de voz a texto
export const transcribeAudio = async (
  audioBase64: string,
  audioMimeType: string = 'audio/m4a'
): Promise<string> => {
  const gemini = getGeminiClient();
  const response = await gemini.models.generateContent({
    model: GEMINI_FAST_MODEL,
    contents: [
      {
        inlineData: {
          data: audioBase64,
          mimeType: audioMimeType,
        },
      },
      {
        text: 'Transcribe fielmente lo que se dice en este audio en español. Devuelve exclusivamente el texto hablado sin explicaciones, comillas ni formato markdown.',
      },
    ],
  });

  return response.text?.trim() || '';
};

// Helper para convertir fecha y hora local de Perú (UTC-5) a UTC Date para PostgreSQL
const parsePeruTimeToUTC = (dateOrTimeStr: string): Date => {
  if (!dateOrTimeStr) return new Date();

  // Si viene en formato ISO completo con Z o timezone
  if (dateOrTimeStr.includes('Z') || dateOrTimeStr.includes('+')) {
    return new Date(dateOrTimeStr);
  }

  // Si viene como "YYYY-MM-DD HH:mm" o "YYYY-MM-DDTHH:mm"
  if (dateOrTimeStr.includes('-') && (dateOrTimeStr.includes(':') || dateOrTimeStr.includes('T'))) {
    const cleanStr = dateOrTimeStr.replace('T', ' ');
    const [dPart, tPart] = cleanStr.split(' ');
    const [yyyy, mm, dd] = dPart.split('-').map(Number);
    const [hh, min] = (tPart || '00:00').split(':').map(Number);
    // En Perú (UTC-5), la hora UTC correspondiente es hora local + 5
    return new Date(Date.UTC(yyyy, mm - 1, dd, (hh || 0) + 5, min || 0, 0));
  }

  // Si viene solo como hora "HH:mm" (ej. "08:00" o "8:00")
  const matchTime = dateOrTimeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (matchTime) {
    const hh = parseInt(matchTime[1], 10);
    const min = parseInt(matchTime[2], 10);
    const nowPeru = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const yyyy = nowPeru.getUTCFullYear();
    const mm = nowPeru.getUTCMonth();
    const dd = nowPeru.getUTCDate();
    return new Date(Date.UTC(yyyy, mm, dd, hh + 5, min, 0));
  }

  return new Date(dateOrTimeStr);
};

// ─── Tool Declarations for Gemini ─────────────────────────────────────────────

const tools: FunctionDeclaration[] = [
  {
    name: 'log_medication_dose',
    description:
      'Registra que se administró (o se omitió) una dosis de un medicamento al adulto mayor.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        medicationName: {
          type: Type.STRING,
          description: 'Nombre del medicamento (ej. Paracetamol, Losartán, Enalapril, etc.).',
        },
        skipped: {
          type: Type.BOOLEAN,
          description: 'true si la dosis NO fue tomada/administrada, false o ausente si fue tomada con éxito.',
        },
        skipReason: {
          type: Type.STRING,
          description: 'Motivo por el cual no se tomó la dosis (si aplica).',
        },
        notes: {
          type: Type.STRING,
          description: 'Observaciones sobre la toma (ej. "La tomó con el almuerzo", "Tenía náuseas").',
        },
      },
      required: ['medicationName'],
    },
  },
  {
    name: 'create_medication',
    description:
      'Registra y agrega un nuevo medicamento al horario regular o plan de salud del adulto mayor (ej. "Agrega Paracetamol los lunes, miércoles y viernes a las 8am").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'Nombre del medicamento (ej. "Paracetamol", "Losartán", "Enalapril", etc.).',
        },
        dosage: {
          type: Type.STRING,
          description: 'Dosis (ej. "500mg", "1 tableta", "10ml", "1 pastilla").',
        },
        frequency: {
          type: Type.STRING,
          description:
            'Frecuencia de administración (ej. "Lunes, Miércoles y Viernes", "Cada 8 horas", "Todos los días", "Una vez al día").',
        },
        times: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            'Lista de horas de toma en formato 24h HH:MM (ej. ["08:00"] o ["08:00", "20:00"]).',
        },
        form: {
          type: Type.STRING,
          description: 'Presentación: tableta, cápsula, jarabe, gotas, inyección, etc.',
        },
        instructions: {
          type: Type.STRING,
          description: 'Indicaciones especiales (ej. "Tomar después de comer", "Con un vaso lleno de agua").',
        },
        stock: {
          type: Type.NUMBER,
          description: 'Cantidad de pastillas o unidades iniciales en stock (opcional).',
        },
      },
      required: ['name', 'dosage', 'frequency', 'times'],
    },
  },
  {
    name: 'create_activity',
    description: 'Crea una nueva tarea, recordatorio o actividad de cuidado diario para la familia (ej. "Bañar a papá", "Pasear 20 min", "Ejercicios de respiración"). NO usar para medicamentos.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Título descriptivo de la actividad (ej. "Baño asistido", "Caminar 15 min", "Cambio de vendaje").',
        },
        scheduledTime: {
          type: Type.STRING,
          description: 'Hora programada para hoy en formato HH:MM (ej. "10:30", "16:00") o fecha ISO.',
        },
        priority: {
          type: Type.STRING,
          enum: ['urgent', 'normal', 'low'],
          description: 'Prioridad de la actividad.',
        },
        assignedToName: {
          type: Type.STRING,
          description: 'Nombre del familiar o cuidador al que se asigna la tarea (opcional).',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_activity',
    description: 'Marca una actividad de cuidado como completada.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        activityTitle: {
          type: Type.STRING,
          description: 'Título o palabra clave de la actividad a completar.',
        },
        notes: {
          type: Type.STRING,
          description: 'Notas u observaciones del cumplimiento.',
        },
      },
      required: ['activityTitle'],
    },
  },
  {
    name: 'create_expense',
    description: 'Registra un gasto económico del cuidado y lo divide entre los familiares.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Descripción del gasto (ej. "Pañales para adultos", "Medicinas de farmacia", "Ensure").',
        },
        amount: {
          type: Type.NUMBER,
          description: 'Monto total del gasto en números (ej. 45.50, 80).',
        },
        category: {
          type: Type.STRING,
          enum: ['medications', 'medical', 'food', 'transport', 'hygiene', 'equipment', 'other'],
          description: 'Categoría del gasto.',
        },
        splitWithAll: {
          type: Type.BOOLEAN,
          description: 'true si se debe dividir en partes iguales entre todos los miembros de la familia.',
        },
        splitWithNames: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista de nombres de los familiares con quienes dividir el gasto (incluyendo quien paga o "todos").',
        },
      },
      required: ['title', 'amount'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Agenda una cita médica, consulta, examen o terapia en el calendario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Título de la cita (ej. "Cardiólogo - Control mensual", "Terapia física").',
        },
        doctorName: {
          type: Type.STRING,
          description: 'Nombre del doctor o profesional (opcional).',
        },
        location: {
          type: Type.STRING,
          description: 'Clínica, hospital o dirección de la cita (opcional).',
        },
        scheduledDate: {
          type: Type.STRING,
          description: 'Fecha y hora de la cita en formato YYYY-MM-DD HH:mm o ISO (ej. "2026-08-20 16:00").',
        },
        type: {
          type: Type.STRING,
          enum: ['medical', 'therapy', 'lab', 'pharmacy', 'other'],
          description: 'Tipo de cita.',
        },
        notes: {
          type: Type.STRING,
          description: 'Indicaciones o notas previas (ej. "Ir en ayunas", "Llevar resultados anteriores").',
        },
      },
      required: ['title', 'scheduledDate'],
    },
  },
  {
    name: 'create_note',
    description: 'Guarda una nota de cuidado, observación de salud, síntoma o nota de relevo/handoff.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Título corto de la nota.',
        },
        content: {
          type: Type.STRING,
          description: 'Contenido completo de la nota o síntoma observado.',
        },
        type: {
          type: Type.STRING,
          enum: ['general', 'medical', 'handoff', 'symptom', 'observation'],
          description: 'Tipo de nota.',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_daily_summary',
    description: 'Obtiene un resumen del estado del día: medicamentos pendientes, actividades y citas.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: 'Fecha a consultar en formato YYYY-MM-DD (por defecto hoy).',
        },
      },
    },
  },
];

// ─── Tool Execution Handlers ──────────────────────────────────────────────────

interface UserContext {
  userId: string;
  familyId: string;
  memberId: string;
  role: MemberRole;
}

class AssistantToolExecutor {
  constructor(private user: UserContext) {}

  async execute(name: string, args: Record<string, any>): Promise<{ result: any; widget?: AssistantWidget; actionName: string }> {
    switch (name) {
      case 'log_medication_dose':
        return this.logMedicationDose(args);
      case 'create_medication':
        return this.createMedication(args);
      case 'create_activity':
        return this.createActivity(args);
      case 'complete_activity':
        return this.completeActivity(args);
      case 'create_expense':
        return this.createExpense(args);
      case 'create_appointment':
        return this.createAppointment(args);
      case 'create_note':
        return this.createNote(args);
      case 'get_daily_summary':
        return this.getDailySummary(args);
      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  }

  // 1. Dosis de Medicamento
  private async logMedicationDose(args: any) {
    if (this.user.role === 'remote_family') {
      return {
        result: { error: 'Los familiares remotos no tienen permiso para registrar tomas de medicamentos de forma presencial.' },
        actionName: 'log_medication_dose_denied',
      };
    }

    const { medicationName, skipped = false, skipReason, notes } = args;

    // Buscar medicamento insensible a mayúsculas
    const medications = await prisma.medication.findMany({
      where: { familyId: this.user.familyId, isActive: true, deletedAt: null },
    });

    const match = medications.find((m) =>
      m.name.toLowerCase().includes(medicationName.toLowerCase()) ||
      medicationName.toLowerCase().includes(m.name.toLowerCase())
    );

    if (!match) {
      return {
        result: {
          error: `No encontré el medicamento '${medicationName}' en la lista activa de la familia. ¿Deseas que lo agregue a su horario regular?`,
        },
        actionName: 'medication_not_found',
      };
    }

    // Registrar dosis en la base de datos
    const log = await prisma.$transaction(async (tx) => {
      const createdLog = await tx.medLog.create({
        data: {
          medicationId: match.id,
          givenById: this.user.memberId,
          givenAt: new Date(),
          skipped,
          skipReason: skipped ? skipReason : null,
          notes: notes || null,
        },
        include: {
          medication: { select: { id: true, name: true, dosage: true, stock: true } },
          givenBy: { select: { id: true, name: true } },
        },
      });

      // Descontar stock si no fue omitido y hay stock configurado
      if (!skipped && match.stock !== null && match.stock > 0) {
        await tx.medication.update({
          where: { id: match.id },
          data: { stock: Math.max(0, match.stock - 1) },
        });
      }

      return createdLog;
    });

    // Notificar realtime a la familia
    await broadcast(this.user.familyId, 'medication:dose_logged', log);

    const widget: AssistantWidget = {
      type: 'medication_dose_logged',
      title: skipped ? 'Dosis Omitida' : 'Dosis Registrada',
      data: {
        medicationName: match.name,
        dosage: match.dosage,
        givenByName: log.givenBy.name,
        skipped,
        skipReason: log.skipReason,
        notes: log.notes,
        stockRemaining: match.stock !== null ? Math.max(0, match.stock - 1) : null,
        givenAt: log.givenAt.toISOString(),
      },
    };

    return {
      result: {
        success: true,
        medication: match.name,
        dosage: match.dosage,
        status: skipped ? 'omitida' : 'tomada',
        stockRemaining: match.stock !== null ? Math.max(0, match.stock - 1) : null,
      },
      widget,
      actionName: 'log_medication_dose',
    };
  }

  // 2. Crear / Configurar Nuevo Medicamento
  private async createMedication(args: any) {
    if (this.user.role === 'paid_caregiver') {
      return {
        result: {
          error: 'Los cuidadores pagados no tienen permiso para agregar medicamentos nuevos al catálogo.',
        },
        actionName: 'create_medication_denied',
      };
    }

    const {
      name,
      dosage = '1 dosis',
      frequency = 'Todos los días',
      times = ['08:00'],
      form = 'pastilla',
      instructions,
      stock,
    } = args;

    // Formatear horas a HH:mm
    const formattedTimes: string[] = (Array.isArray(times) ? times : [times]).map((t: string) => {
      const match = String(t).trim().match(/(\d{1,2}):(\d{2})/);
      if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
      }
      return String(t);
    });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const medication = await prisma.medication.create({
      data: {
        familyId: this.user.familyId,
        name,
        dosage,
        frequency,
        times: formattedTimes,
        form: form || null,
        instructions: instructions || null,
        stock: stock !== undefined && stock !== null ? Number(stock) : null,
        startDate: startOfToday,
        isActive: true,
      },
    });

    await broadcast(this.user.familyId, 'medication:created', medication);

    const widget: AssistantWidget = {
      type: 'medication_created',
      title: 'Medicamento Agregado al Horario',
      data: {
        id: medication.id,
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        times: medication.times,
        instructions: medication.instructions,
      },
    };

    return {
      result: {
        success: true,
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        times: medication.times,
      },
      widget,
      actionName: 'create_medication',
    };
  }

  // 3. Crear Actividad
  private async createActivity(args: any) {
    if (this.user.role === 'paid_caregiver') {
      return {
        result: { error: 'Los cuidadores pagados no tienen permiso para crear nuevas actividades globales.' },
        actionName: 'create_activity_denied',
      };
    }

    const { title, scheduledTime, priority = 'normal', assignedToName } = args;

    let assignedToId: string | undefined = undefined;
    if (assignedToName) {
      const members = await prisma.familyMember.findMany({
        where: { familyId: this.user.familyId, isActive: true },
      });
      const memberMatch = members.find((m) =>
        m.name.toLowerCase().includes(assignedToName.toLowerCase())
      );
      if (memberMatch) {
        assignedToId = memberMatch.id;
      }
    }

    let scheduledAt: Date | undefined = undefined;
    if (scheduledTime) {
      scheduledAt = parsePeruTimeToUTC(scheduledTime);
    }

    const activity = await prisma.activity.create({
      data: {
        familyId: this.user.familyId,
        title,
        priority,
        scheduledAt,
        assignedToId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await broadcast(this.user.familyId, 'activity:created', activity);

    const widget: AssistantWidget = {
      type: 'activity_created',
      title: 'Actividad Creada',
      data: {
        id: activity.id,
        title: activity.title,
        priority: activity.priority,
        scheduledAt: activity.scheduledAt?.toISOString(),
        assignedTo: activity.assignedTo?.name,
      },
    };

    return {
      result: {
        success: true,
        id: activity.id,
        title: activity.title,
        assignedTo: activity.assignedTo?.name || 'Cualquiera',
      },
      widget,
      actionName: 'create_activity',
    };
  }

  // 3. Completar Actividad
  private async completeActivity(args: any) {
    if (this.user.role === 'remote_family') {
      return {
        result: { error: 'Los familiares remotos no pueden marcar actividades de cuidado presencial como completadas.' },
        actionName: 'complete_activity_denied',
      };
    }

    const { activityTitle, notes } = args;

    const activities = await prisma.activity.findMany({
      where: {
        familyId: this.user.familyId,
        deletedAt: null,
        status: { in: ['pending', 'in_progress'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const match = activities.find((a) =>
      a.title.toLowerCase().includes(activityTitle.toLowerCase()) ||
      activityTitle.toLowerCase().includes(a.title.toLowerCase())
    );

    if (!match) {
      return {
        result: {
          error: `No encontré ninguna actividad pendiente que coincida con "${activityTitle}". Las pendientes son: ${activities.map((a) => a.title).join(', ') || 'ninguna'}.`,
        },
        actionName: 'activity_not_found',
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.update({
        where: { id: match.id },
        data: { status: 'completed' },
      });

      await tx.activityLog.create({
        data: {
          activityId: match.id,
          completedById: this.user.memberId,
          notes: notes || null,
        },
      });

      return act;
    });

    await broadcast(this.user.familyId, 'activity:updated', updated);

    const widget: AssistantWidget = {
      type: 'activity_completed',
      title: 'Actividad Completada',
      data: {
        id: updated.id,
        title: updated.title,
        completedAt: new Date().toISOString(),
      },
    };

    return {
      result: { success: true, title: updated.title, status: 'completed' },
      widget,
      actionName: 'complete_activity',
    };
  }

  // 4. Crear Gasto
  private async createExpense(args: any) {
    if (this.user.role === 'paid_caregiver') {
      return {
        result: { error: 'Por motivos de privacidad y seguridad, los cuidadores pagados no tienen acceso al módulo de finanzas familiares.' },
        actionName: 'create_expense_denied',
      };
    }

    const { title, amount, category = 'medications', splitWithNames = [], splitWithAll = false } = args;

    const allMembers = await prisma.familyMember.findMany({
      where: { familyId: this.user.familyId, isActive: true },
    });

    const eligibleMembers = allMembers.filter((m) => m.role !== 'paid_caregiver');
    let targetMembers = eligibleMembers;

    if (!splitWithAll && splitWithNames.length > 0) {
      const matched = eligibleMembers.filter((m) =>
        splitWithNames.some((name: string) =>
          m.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(m.name.toLowerCase()) ||
          name.toLowerCase() === 'yo' ||
          name.toLowerCase() === 'mi'
        )
      );
      if (matched.length > 0) {
        targetMembers = matched;
      }
    }

    if (!targetMembers.some((m) => m.id === this.user.memberId)) {
      const payer = eligibleMembers.find((m) => m.id === this.user.memberId);
      if (payer) targetMembers.push(payer);
    }

    const splitCount = Math.max(1, targetMembers.length);
    const splitAmount = Number((Number(amount) / splitCount).toFixed(2));

    const expense = await prisma.$transaction(async (tx) => {
      const newExp = await tx.expense.create({
        data: {
          familyId: this.user.familyId,
          paidById: this.user.memberId,
          title,
          amount,
          currency: 'PEN',
          category,
          date: new Date(),
        },
      });

      await tx.expenseSplit.createMany({
        data: targetMembers.map((m) => ({
          expenseId: newExp.id,
          memberId: m.id,
          amount: splitAmount,
          isPaid: m.id === this.user.memberId,
          paidAt: m.id === this.user.memberId ? new Date() : null,
        })),
      });

      return tx.expense.findUnique({
        where: { id: newExp.id },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: { include: { member: { select: { id: true, name: true } } } },
        },
      });
    });

    await broadcast(this.user.familyId, 'expense:created', expense);

    const widget: AssistantWidget = {
      type: 'expense_created',
      title: 'Gasto Registrado',
      data: {
        id: expense?.id,
        title: expense?.title,
        amount: Number(expense?.amount),
        currency: 'PEN',
        paidBy: expense?.paidBy.name,
        splits: expense?.splits.map((s) => ({
          name: s.member.name,
          amount: Number(s.amount),
          isPaid: s.isPaid,
        })),
      },
    };

    return {
      result: {
        success: true,
        title,
        amount,
        splitCount,
        splitAmountEach: splitAmount,
        members: targetMembers.map((m) => m.name),
      },
      widget,
      actionName: 'create_expense',
    };
  }

  // 5. Crear Cita
  private async createAppointment(args: any) {
    if (this.user.role === 'paid_caregiver') {
      return {
        result: { error: 'Los cuidadores pagados no tienen permiso para agendar citas médicas globales.' },
        actionName: 'create_appointment_denied',
      };
    }

    const { title, doctorName, location, scheduledDate, type = 'medical', notes } = args;

    const scheduledAt = parsePeruTimeToUTC(scheduledDate);

    const appointment = await prisma.appointment.create({
      data: {
        familyId: this.user.familyId,
        title,
        doctorName: doctorName || null,
        location: location || null,
        scheduledAt,
        type,
        notes: notes || null,
      },
    });

    await broadcast(this.user.familyId, 'appointment:created', appointment);

    const widget: AssistantWidget = {
      type: 'appointment_created',
      title: 'Cita Agendada',
      data: {
        id: appointment.id,
        title: appointment.title,
        doctorName: appointment.doctorName,
        location: appointment.location,
        scheduledAt: appointment.scheduledAt.toISOString(),
      },
    };

    return {
      result: {
        success: true,
        title: appointment.title,
        scheduledAt: appointment.scheduledAt.toISOString(),
        doctor: appointment.doctorName || 'No especificado',
      },
      widget,
      actionName: 'create_appointment',
    };
  }

  // 6. Crear Nota
  private async createNote(args: any) {
    const { title, content, type = 'general' } = args;

    const note = await prisma.note.create({
      data: {
        familyId: this.user.familyId,
        authorId: this.user.memberId,
        title: title || 'Nota rápida',
        content,
        type,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    await broadcast(this.user.familyId, 'note:created', note);

    const widget: AssistantWidget = {
      type: 'note_created',
      title: 'Nota Guardada',
      data: {
        id: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        author: note.author.name,
      },
    };

    return {
      result: {
        success: true,
        title: note.title,
        type: note.type,
        author: note.author.name,
      },
      widget,
      actionName: 'create_note',
    };
  }

  // 7. Resumen Diario
  private async getDailySummary(args: any) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCHours(23, 59, 59, 999);

    const [medications, activities, appointments] = await Promise.all([
      prisma.medication.findMany({
        where: { familyId: this.user.familyId, isActive: true, deletedAt: null },
        include: {
          logs: {
            where: { givenAt: { gte: startOfToday, lte: endOfToday } },
            include: { givenBy: { select: { name: true } } },
          },
        },
      }),
      prisma.activity.findMany({
        where: {
          familyId: this.user.familyId,
          deletedAt: null,
          scheduledAt: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          assignedTo: { select: { name: true } },
          logs: { include: { completedBy: { select: { name: true } } } },
        },
      }),
      prisma.appointment.findMany({
        where: {
          familyId: this.user.familyId,
          deletedAt: null,
          scheduledAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
    ]);

    const medSummary = medications.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      times: m.times,
      takenToday: m.logs.length,
      isFullyTaken: m.logs.length >= m.times.length,
    }));

    const actSummary = activities.map((a) => ({
      title: a.title,
      status: a.status,
      assignedTo: a.assignedTo?.name || 'Cualquiera',
    }));

    const widget: AssistantWidget = {
      type: 'daily_summary',
      title: 'Resumen del Día',
      data: {
        medications: medSummary,
        activities: actSummary,
        appointments: appointments.map((app) => ({
          title: app.title,
          time: app.scheduledAt.toISOString(),
          doctor: app.doctorName,
        })),
      },
    };

    return {
      result: {
        totalMedications: medications.length,
        medications: medSummary,
        activities: actSummary,
        appointments: appointments.map((app) => ({ title: app.title, time: app.scheduledAt })),
      },
      widget,
      actionName: 'get_daily_summary',
    };
  }
}

// ─── Main Assistant Chat Function ─────────────────────────────────────────────

export interface ProcessAssistantChatOptions {
  user: UserContext;
  message?: string;
  audioBase64?: string;
  audioMimeType?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const processAssistantChat = async ({
  user,
  message,
  audioBase64,
  audioMimeType = 'audio/m4a',
  history = [],
}: ProcessAssistantChatOptions): Promise<AssistantChatResponse> => {
  const gemini = getGeminiClient();

  // 1. Obtener información de contexto familiar
  const family = await prisma.family.findUnique({
    where: { id: user.familyId },
    include: {
      elderly: true,
      members: { where: { isActive: true }, select: { id: true, name: true, role: true } },
    },
  });

  const elderlyName = family?.elderly?.name || 'el adulto mayor';
  const elderlyConditions = family?.elderly?.conditions?.join(', ') || 'ninguna registrada';
  const elderlyAllergies = family?.elderly?.allergies?.join(', ') || 'ninguna registrada';
  const currentUserMember = family?.members.find((m) => m.id === user.memberId);
  const currentUserName = currentUserMember?.name || 'Familiar';
  const familyMembersList = family?.members.map((m) => `${m.name} (${m.role})`).join(', ') || '';

  const nowPeru = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const currentTimeStr = nowPeru.toISOString().replace('T', ' ').substring(0, 16);

  // 2. System Instruction
  const systemInstruction = `
Eres Ayni, el asistente inteligente de coordinación de cuidado de la app "Ayni Care".
Tu misión es facilitar al máximo la vida de las familias latinoamericanas que cuidan a un adulto mayor en casa.

CONTEXTO ACTUAL DE LA FAMILIA:
- Familia: ${family?.name || 'Familia'}
- Adulto Mayor: ${elderlyName}
- Condiciones Médicas: ${elderlyConditions}
- Alergias: ${elderlyAllergies}
- Usuario actual en el chat: ${currentUserName} (Rol: ${user.role})
- Miembros de la red familiar: ${familyMembersList}
- Fecha y Hora actual en Perú (UTC-5): ${currentTimeStr}

REGLAS DE INTERACCIÓN:
1. Tono: Cálido, empático, conciso, respetuoso y con modismos amables latinoamericanos/peruanos.
2. EJECUCIÓN CON HERRAMIENTAS: Cuando el usuario te cuente que hizo algo o pida una acción (ej. "ya le di su pastilla", "agrega Paracetamol al horario", "compré pañales", "agenda cita con el geriatra", "bañé a papá"), DEBES invocar la herramienta correspondiente para registrarlo en la base de datos.
3. No inventes IDs ni datos que no tengas. Si falta un dato crítico (por ejemplo, el monto de un gasto), pregunta amablemente.
4. Si el usuario hace una consulta sobre medicamentos o el día, consulta la herramienta 'get_daily_summary'.
5. Sé breve en tus respuestas textuales, pues la app mostrará una tarjeta interactiva visual complementaria con la acción ejecutada.
6. DISTINCIÓN CRÍTICA ENTRE MEDICAMENTOS Y ACTIVIDADES:
   - Si el usuario te pide registrar, agregar o configurar un medicamento en el horario regular (ej. "agrégalo como toma lunes, miércoles y viernes a las 8am", "agrega Losartán 50mg cada 12 horas"), DEBES invocar la herramienta 'create_medication'.
   - NUNCA uses 'create_activity' para medicamentos o pastillas. 'create_activity' es exclusivamente para tareas de cuidado diario como baño, aseo, paseos o cambios de apósito.
`.trim();

  const executor = new AssistantToolExecutor(user);

  let userTranscription: string | undefined = undefined;

  // 3. Preparar contenidos para Gemini
  const contents: any[] = [];

  // Agregar historial previo
  for (const h of history.slice(-6)) {
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    });
  }

  // Si se envió un audio, transcribirlo primero
  let effectiveMessage = message || '';
  if (audioBase64) {
    try {
      userTranscription = await transcribeAudio(audioBase64, audioMimeType);
      if (userTranscription) {
        effectiveMessage = effectiveMessage
          ? `${effectiveMessage} (Audio: ${userTranscription})`
          : userTranscription;
      }
    } catch (err) {
      console.warn('[AI] Falló transcripción previa de audio, pasando inlineData:', err);
    }
  }

  // Agregar mensaje actual
  const currentParts: any[] = [];
  if (audioBase64 && !userTranscription) {
    currentParts.push({
      inlineData: {
        data: audioBase64,
        mimeType: audioMimeType,
      },
    });
  }
  if (effectiveMessage) {
    currentParts.push({ text: effectiveMessage });
  }

  if (currentParts.length === 0) {
    throw new Error('Debes enviar al menos un mensaje de texto o un audio.');
  }

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  // 4. Invocar Gemini con Function Calling
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: tools }],
      temperature: 0.2,
    },
  });

  const candidate = response.candidates?.[0];
  const functionCalls = candidate?.content?.parts?.filter((p) => p.functionCall)?.map((p) => p.functionCall);

  let finalWidget: AssistantWidget | undefined = undefined;
  const actionsExecuted: string[] = [];

  // 5. Si el modelo llamó funciones, ejecutarlas y solicitar respuesta final
  if (functionCalls && functionCalls.length > 0) {
    const toolResponseParts: any[] = [];

    for (const fc of functionCalls) {
      if (!fc || !fc.name) continue;
      const { result, widget, actionName } = await executor.execute(fc.name, fc.args as Record<string, any>);
      if (widget) {
        finalWidget = widget;
      }
      actionsExecuted.push(actionName);

      toolResponseParts.push({
        functionResponse: {
          name: fc.name,
          response: { result },
        },
      });
    }

    // Agregar el turno del modelo con sus function calls y las respuestas de las funciones
    contents.push(candidate!.content!);
    contents.push({
      role: 'user',
      parts: toolResponseParts,
    });

    const secondTurnResponse = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const replyText =
      secondTurnResponse.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
      '¡Listo! He registrado la acción en el sistema.';

    return {
      message: replyText,
      userTranscription,
      widget: finalWidget,
      actionsExecuted,
    };
  }

  // Si no hubo llamadas a funciones, devolver el texto directo
  const replyText =
    candidate?.content?.parts?.map((p) => p.text).join('') ||
    '¿En qué puedo ayudarte hoy con el cuidado de tu familiar?';

  return {
    message: replyText,
    userTranscription,
    widget: finalWidget,
    actionsExecuted,
  };
};
