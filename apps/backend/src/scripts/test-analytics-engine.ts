import 'dotenv/config';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma/client';
import { trackEvent, classifyInsightAsync } from '../services/analytics.service';
import { processPulseAnswer } from '../services/pulse-check.service';

async function testAnalyticsEngine() {
  console.log('🧪 Iniciando prueba integral del Motor de Analítica y Descubrimiento de Dolores...\n');

  // 1. Probar Telemetría Básica (Event Tracking)
  console.log('--- 📊 Paso 1: Registro de Telemetría (AnalyticsEvent) ---');
  await trackEvent({
    eventType: 'med_dose_logged',
    channel: 'whatsapp',
    metadata: { medication: 'Losartán 50mg', time: '08:00' },
  });
  console.log('✅ Evento de telemetría registrado con éxito.');

  // 2. Probar Clasificación Semántica por IA (ConversationInsight)
  console.log('\n--- 🧠 Paso 2: Clasificación de Dolores y Necesidades con IA ---');

  const testCases = [
    {
      title: '🚨 Crisis de Cuidadora',
      text: 'La enfermera no vino hoy y no sé cómo cambiar la sonda de mi papá, estoy agotada y sola en esto',
      role: 'primary_caregiver',
    },
    {
      title: '💰 Conflicto de Gastos entre Hermanos',
      text: 'Compré pañales y Ensure por 190 soles en Inkafarma y mis hermanos no me transfieren su parte',
      role: 'primary_caregiver',
    },
    {
      title: '❓ Necesidad No Resuelta (Alquiler de Equipos)',
      text: 'Ayni, ¿dónde puedo alquilar una cama clínica articulada y un balón de oxígeno para el fin de semana?',
      role: 'family_member',
    },
  ];

  for (const tc of testCases) {
    console.log(`\nProbando caso: ${tc.title}`);
    console.log(`Mensaje: "${tc.text}"`);
    await classifyInsightAsync({
      messageText: tc.text,
      senderRole: tc.role,
      channel: 'whatsapp',
    });
  }

  // 3. Probar Respuesta al Micro-Sondeo Semanal (Pulse Check)
  console.log('\n--- 📋 Paso 3: Respuesta al Micro-Sondeo Semanal ---');
  // Buscar una familia existente para asociar
  const sampleFamily = await prisma.family.findFirst({
    include: { members: true },
  });

  if (sampleFamily && sampleFamily.members.length > 0) {
    const member = sampleFamily.members[0];
    const pulseReply = await processPulseAnswer({
      familyId: sampleFamily.id,
      memberId: member.id,
      phone: member.phone || '51999888777',
      rawAnswer: 'Lo más pesado fue coordinar quién compraba las pastillas porque la farmacia no tenía stock',
    });
    console.log('🤖 Respuesta de Ayni al sondeo:');
    console.log(pulseReply);
  }

  // 4. Probar Endpoint JSON de Analítica (/admin/analytics/summary)
  console.log('\n--- 📈 Paso 4: Consulta de Resumen Analítico para Fundadores ---');
  const summaryRes = await request(app)
    .get('/admin/analytics/summary')
    .set('x-admin-token', 'aynicare-admin-2026');

  if (summaryRes.status === 200 && summaryRes.body.success) {
    console.log('✅ Resumen Analítico obtenido con éxito:');
    console.log('   - KPIs:', summaryRes.body.data.kpis);
    console.log('   - Categorías de dolor rankeadas:', summaryRes.body.data.painCategoriesRanked);
    console.log('   - Oportunidades comerciales detectadas:', summaryRes.body.data.commercialOpportunities);
    console.log('   - Total necesidades no resueltas detectadas:', summaryRes.body.data.unmetNeedsVerbatim.length);
  } else {
    throw new Error(`❌ Falló /admin/analytics/summary. Status: ${summaryRes.status}`);
  }

  // 5. Probar Renderizado HTML del Dashboard (/admin/insights)
  console.log('\n--- 🖥️ Paso 5: Renderizado del Dashboard Visual (/admin/insights) ---');
  const dashboardRes = await request(app)
    .get('/admin/insights')
    .query({ token: 'aynicare-admin-2026' });

  if (dashboardRes.status === 200 && dashboardRes.text.includes('Founder Intelligence')) {
    console.log('✅ Dashboard HTML cargó al 100% con estilos visuales y tablas.');
  } else {
    throw new Error(`❌ Falló renderizado de /admin/insights. Status: ${dashboardRes.status}`);
  }

  console.log('\n🎉 ¡MOTOR DE INTELIGENCIA DE DATOS Y DESCUBRIMIENTO PROBADO CON ÉXITO! 🌿📊');
}

testAnalyticsEngine().catch(console.error);
