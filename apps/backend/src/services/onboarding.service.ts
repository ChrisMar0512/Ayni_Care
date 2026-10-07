import { randomUUID } from 'crypto';
import { prisma } from '../prisma/client';
import { MemberRole } from '@prisma/client';
import {
  getGeminiClient,
  callGeminiWithFallback,
  MODEL_CANDIDATES,
} from './ai.service';
import { formatTextForWhatsApp } from '../utils/whatsapp-formatter';

interface OnboardingSession {
  phone: string;
  step: 'AWAITING_ELDERLY_INFO' | 'AWAITING_MEDICATIONS' | 'COMPLETED';
  caregiverName?: string;
  elderlyName?: string;
  familyId?: string;
  memberId?: string;
  updatedAt: Date;
}

// Memoria de sesiones de onboarding en curso por número telefónico
const sessions = new Map<string, OnboardingSession>();

/**
 * Procesa un mensaje entrante para usuarios que están en proceso de Onboarding
 */
export const processOnboardingMessage = async ({
  phone,
  text,
  senderName,
}: {
  phone: string;
  text: string;
  senderName?: string;
}): Promise<string> => {
  const cleanPhone = phone.replace(/\D/g, '');
  const last9 = cleanPhone.slice(-9);

  let session = sessions.get(cleanPhone);

  // 1. Si no existe sesión previa, iniciar onboarding con mensaje de bienvenida
  if (!session) {
    session = {
      phone: cleanPhone,
      step: 'AWAITING_ELDERLY_INFO',
      caregiverName: senderName || 'Familiar',
      updatedAt: new Date(),
    };
    sessions.set(cleanPhone, session);

    const greetingName = senderName ? ` ¡Hola, ${senderName}!` : ' ¡Hola!';
    return (
      `🌿 *¡Bienvenido a Ayni Care!*${greetingName}\n\n` +
      `Soy tu asistente de cuidado familiar. Te ayudo a coordinar medicamentos, tareas, citas y gastos para que cuidar a tu ser querido sea mucho más fácil y en equipo.\n\n` +
      `Para comenzar en 1 minuto: *¿A quién cuidamos hoy?*\n` +
      `Cuéntame su nombre, edad o qué parentesco tiene contigo (por ejemplo: _"A mi papá Luis de 78 años"_ o _"A mi mamá Carmen"_).`
    );
  }

  const gemini = getGeminiClient();

  // 2. PASO 1: Extraer información del Adulto Mayor y crear Familia en BD
  if (session.step === 'AWAITING_ELDERLY_INFO') {
    try {
      const parsePrompt = `
Eres el asistente de onboarding de Ayni Care. Analiza el siguiente mensaje del usuario y extrae la información del adulto mayor y cuidador en formato JSON:
Mensaje: "${text}"

Devuelve estrictamente un objeto JSON con este esquema:
{
  "elderlyName": string (nombre del adulto mayor, ej. "Luis Carrillo" o "Luis"),
  "relationship": string (ej. "papá", "mamá", "abuelo", "tío", "familiar"),
  "approxAge": number o null (si se mencionó la edad)
}
`;

      const aiRes = await callGeminiWithFallback(gemini, MODEL_CANDIDATES, {
        contents: [{ text: parsePrompt }],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(aiRes.text || '{}');
      const elderlyName = parsed.elderlyName || 'Adulto Mayor';
      const relationship = parsed.relationship || 'familiar';

      // Crear Familia, Adulto Mayor y Miembro Cuidador Principal en la base de datos
      const familyName = `Familia de ${elderlyName}`;

      const createdFamily = await prisma.family.create({
        data: {
          name: familyName,
          elderly: {
            create: {
              name: elderlyName,
              notes: `Registrado por WhatsApp. Parentesco: ${relationship}.`,
            },
          },
          members: {
            create: {
              userId: randomUUID(), // ID único vinculado al teléfono
              name: session.caregiverName || 'Cuidador Principal',
              phone: cleanPhone,
              role: MemberRole.primary_caregiver,
              isActive: true,
            },
          },
        },
        include: {
          members: true,
          elderly: true,
        },
      });

      const member = createdFamily.members[0];

      // Actualizar sesión a siguiente paso
      session.step = 'AWAITING_MEDICATIONS';
      session.familyId = createdFamily.id;
      session.memberId = member.id;
      session.elderlyName = elderlyName;
      session.updatedAt = new Date();

      return (
        `¡Mucho gusto! Ya registré a *${elderlyName}* en Ayni Care. 🌿\n\n` +
        `Ahora cuéntame: *¿Qué medicamentos o pastillas toma actualmente y a qué hora?*\n\n` +
        `_(Puedes escribirme la lista o mandarme una nota de voz, por ejemplo: "Toma Losartán 50mg a las 8am y Metformina 850mg con el almuerzo")_`
      );
    } catch (err) {
      console.error('[Onboarding] Error procesando datos de adulto mayor:', err);
      return `¡Entendido! ¿Podrías confirmarme el nombre de la persona a la que vas a cuidar?`;
    }
  }

  // 3. PASO 2: Extraer medicamentos y guardarlos en la base de datos
  if (session.step === 'AWAITING_MEDICATIONS') {
    try {
      const medPrompt = `
Eres el asistente clínico de Ayni Care. Extrae los medicamentos mencionados por el usuario en formato JSON:
Mensaje: "${text}"

Devuelve estrictamente un JSON con esta estructura:
{
  "hasMedications": boolean,
  "medications": [
    {
      "name": string (nombre del fármaco, ej. "Losartán"),
      "dosage": string (ej. "50mg" o "1 comprimido"),
      "frequency": string (ej. "cada 12 horas" o "una vez al día"),
      "times": string[] (array de horas en formato HH:mm en 24h, ej. ["08:00", "20:00"]),
      "instructions": string (ej. "Con el desayuno" o "En ayunas")
    }
  ]
}
`;

      const medRes = await callGeminiWithFallback(gemini, MODEL_CANDIDATES, {
        contents: [{ text: medPrompt }],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const medData = JSON.parse(medRes.text || '{}');
      const medications = medData.medications || [];

      let medsSummary = '';

      if (session.familyId && medications.length > 0) {
        for (const med of medications) {
          const times = Array.isArray(med.times) && med.times.length > 0 ? med.times : ['08:00'];
          await prisma.medication.create({
            data: {
              familyId: session.familyId,
              name: med.name,
              dosage: med.dosage || '1 unidad',
              frequency: med.frequency || 'Diario',
              times,
              instructions: med.instructions || 'Según indicación',
              startDate: new Date(),
              stock: 30,
              isActive: true,
            },
          });

          medsSummary += `  • 💊 *${med.name}* (${med.dosage || ''}) — ${times.join(', ')}\n`;
        }
      }

      // Marcar sesión como completada y eliminar de memoria
      sessions.delete(cleanPhone);

      const elderlyName = session.elderlyName || 'tu familiar';

      return (
        `🎉 *¡Todo listo! Tu red de cuidado para ${elderlyName} está 100% activa.* 🌿\n\n` +
        (medsSummary ? `*Medicamentos configurados en horario:*\n${medsSummary}\n` : '') +
        `*A partir de este momento puedes pedirme por WhatsApp:*\n` +
        `• 📋 _"Ayni, ¿cuál es el resumen de hoy?"_\n` +
        `• 💊 _"Ayni, ya le di su medicina a papá"_\n` +
        `• 💰 _"Ayni, compré Ensure por 90 soles y divídelo"_\n` +
        `• 🩺 _"Ayni, agenda una cita con el geriatra el viernes a las 4pm"_\n\n` +
        `💡 *Para sumar a tus hermanos o cuidadora:* Solo pásales este número de WhatsApp para que ellos también coordinen el cuidado en el mismo registro familiar.`
      );
    } catch (err) {
      console.error('[Onboarding] Error guardando medicamentos:', err);
      sessions.delete(cleanPhone);
      return (
        `🎉 *¡Tu registro en Ayni Care está listo!* 🌿\n\n` +
        `Ya puedes empezar a hablarme. Escribe _"Ayni, ¿cuál es el resumen de hoy?"_ o mándame una nota de voz.`
      );
    }
  }

  return `¡Hola! ¿En qué puedo ayudarte hoy con el cuidado familiar? 🌿`;
};
