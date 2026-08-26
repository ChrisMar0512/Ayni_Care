import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

/**
 * 1. Endpoint JSON con resumen consolidado de métricas de descubrimiento de negocio
 */
export const getAnalyticsSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalEvents,
      totalInsights,
      totalPulseResponses,
      activeFamiliesCount,
      allInsights,
      allPulseResponses,
      expenses,
    ] = await Promise.all([
      prisma.analyticsEvent.count(),
      prisma.conversationInsight.count(),
      prisma.weeklyPulseResponse.count(),
      prisma.family.count(),
      prisma.conversationInsight.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.weeklyPulseResponse.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.expense.findMany({
        where: { deletedAt: null },
      }),
    ]);

    // Desglose por categoría de dolor
    const categoryCounts: Record<string, number> = {};
    const sentimentCounts: Record<string, number> = {};
    const commercialIntentCounts: Record<string, number> = {};
    const unmetNeedsList: any[] = [];

    for (const ins of allInsights) {
      categoryCounts[ins.category] = (categoryCounts[ins.category] || 0) + 1;
      sentimentCounts[ins.sentiment] = (sentimentCounts[ins.sentiment] || 0) + 1;
      if (ins.commercialIntent) {
        commercialIntentCounts[ins.commercialIntent] =
          (commercialIntentCounts[ins.commercialIntent] || 0) + 1;
      }
      if (ins.isUnmetNeed) {
        unmetNeedsList.push({
          id: ins.id,
          message: ins.messageSnippet,
          painPoint: ins.painPointSummary,
          urgency: ins.urgencyLevel,
          commercialIntent: ins.commercialIntent,
          date: ins.createdAt,
        });
      }
    }

    // Desglose del micro-sondeo semanal
    const pulseFrictionCounts: Record<string, number> = {};
    for (const p of allPulseResponses) {
      pulseFrictionCounts[p.topFriction] = (pulseFrictionCounts[p.topFriction] || 0) + 1;
    }

    // Análisis financiero y ticket promedio
    let totalExpenseAmount = 0;
    const expensesByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      const amt = Number(exp.amount);
      totalExpenseAmount += amt;
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + amt;
    }

    const avgSpendPerFamily = activeFamiliesCount > 0
      ? (totalExpenseAmount / activeFamiliesCount).toFixed(2)
      : '0.00';

    res.json({
      success: true,
      data: {
        kpis: {
          activeFamilies: activeFamiliesCount,
          totalEventsTracked: totalEvents,
          totalInsightsAnalyzed: totalInsights,
          weeklyPulseResponses: totalPulseResponses,
          totalExpensesTrackedSoles: totalExpenseAmount.toFixed(2),
          avgSpendPerFamilySoles: avgSpendPerFamily,
        },
        painCategoriesRanked: categoryCounts,
        sentimentDistribution: sentimentCounts,
        commercialOpportunities: commercialIntentCounts,
        weeklyPulseResults: pulseFrictionCounts,
        expensesByCategory,
        unmetNeedsVerbatim: unmetNeedsList.slice(0, 15),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, data: null, error: error.message });
  }
};

/**
 * 2. Vista HTML interactiva del Dashboard de Insights para Fundadores
 */
export const renderInsightsDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      activeFamiliesCount,
      totalInsights,
      allInsights,
      allPulseResponses,
      expenses,
    ] = await Promise.all([
      prisma.family.count(),
      prisma.conversationInsight.count(),
      prisma.conversationInsight.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.weeklyPulseResponse.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.expense.findMany({ where: { deletedAt: null } }),
    ]);

    let totalExpense = 0;
    for (const e of expenses) totalExpense += Number(e.amount);

    const unmetList = allInsights.filter((i) => i.isUnmetNeed);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ayni Care — Founder Insights & Discovery Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d1310;
      --card-bg: #151d18;
      --border: #223326;
      --primary: #2D6A4F;
      --primary-light: #52B788;
      --accent: #D8F3DC;
      --text: #F8FAF8;
      --text-muted: #8FA89B;
      --danger: #E63946;
      --warning: #F4A261;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 32px 24px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    .logo {
      font-size: 26px;
      font-weight: 700;
      color: var(--primary-light);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      background: rgba(82, 183, 136, 0.15);
      color: var(--primary-light);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid rgba(82, 183, 136, 0.3);
    }
    .grid-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }
    .kpi-title { font-size: 14px; color: var(--text-muted); font-weight: 500; }
    .kpi-value { font-size: 32px; font-weight: 700; color: #fff; margin-top: 6px; }
    .kpi-sub { font-size: 12px; color: var(--primary-light); margin-top: 4px; }

    .grid-sections {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    @media (max-width: 900px) { .grid-sections { grid-template-columns: 1fr; } }

    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--accent);
    }

    .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .table th { text-align: left; padding: 10px 12px; font-size: 13px; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    .table td { padding: 12px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.05); }

    .tag-urgency-critical { background: rgba(230, 57, 70, 0.2); color: #FF6B6B; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .tag-urgency-high { background: rgba(244, 162, 97, 0.2); color: #F4A261; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .tag-urgency-medium { background: rgba(82, 183, 136, 0.2); color: #52B788; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .tag-urgency-low { background: rgba(255, 255, 255, 0.1); color: #ccc; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }

    .quote-box {
      background: rgba(0,0,0,0.3);
      border-left: 3px solid var(--primary-light);
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 12px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      🌿 Ayni Care <span class="badge">Founder Intelligence & Discovery</span>
    </div>
    <div>
      <span style="color: var(--text-muted); font-size: 14px;">Actualizado en tiempo real</span>
    </div>
  </div>

  <!-- KPIs -->
  <div class="grid-kpis">
    <div class="kpi-card">
      <div class="kpi-title">Familias Activas</div>
      <div class="kpi-value">${activeFamiliesCount}</div>
      <div class="kpi-sub">Meta: 100 familias (Septiembre)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Insights de IA Analizados</div>
      <div class="kpi-value">${totalInsights}</div>
      <div class="kpi-sub">Clasificación en segundo plano</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Gasto Total Registrado</div>
      <div class="kpi-value">S/. ${totalExpense.toFixed(2)}</div>
      <div class="kpi-sub">Transacciones reales en farmacia/cuidado</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Respuestas al Micro-Sondeo</div>
      <div class="kpi-value">${allPulseResponses.length}</div>
      <div class="kpi-sub">Pulso semanal de fricciones</div>
    </div>
  </div>

  <div class="grid-sections">
    <!-- Top Dolores Críticos & Necesidades No Resueltas -->
    <div class="section-card">
      <div class="section-title">🚨 Necesidades No Resueltas & Dolores Críticos</div>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">
        Situaciones expresadas por familias donde buscan servicios o ayuda que aún no está automatizada.
      </p>
      ${
        unmetList.length > 0
          ? unmetList
              .slice(0, 5)
              .map(
                (u) => `
        <div class="quote-box">
          <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
            <strong style="color: var(--primary-light);">${u.painPointSummary || 'Problema detectado'}</strong>
            <span class="tag-urgency-${u.urgencyLevel}">${u.urgencyLevel.toUpperCase()}</span>
          </div>
          <p style="color: #ddd;">"${u.messageSnippet}"</p>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
            Oportunidad comercial: <strong style="color: var(--warning);">${u.commercialIntent || 'General'}</strong> • ${new Date(u.createdAt).toLocaleDateString('es-PE')}
          </div>
        </div>
      `
              )
              .join('')
          : '<p style="color: var(--text-muted);">Aún no se han registrado dolores críticos no resueltos.</p>'
      }
    </div>

    <!-- Resultados del Micro-Sondeo Semanal -->
    <div class="section-card">
      <div class="section-title">📊 Pulso Semanal: ¿Qué fue lo más pesado de coordinar?</div>
      <table class="table">
        <thead>
          <tr>
            <th>Fricción Principal</th>
            <th>Respuesta de la Familia</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${
            allPulseResponses.length > 0
              ? allPulseResponses
                  .slice(0, 6)
                  .map(
                    (p) => `
            <tr>
              <td><strong style="color: var(--primary-light);">${p.topFriction}</strong></td>
              <td>"${p.details || p.rawAnswer}"</td>
              <td style="color: var(--text-muted); font-size: 12px;">${new Date(p.createdAt).toLocaleDateString('es-PE')}</td>
            </tr>
          `
                  )
                  .join('')
              : '<tr><td colspan="3" style="color: var(--text-muted);">No hay respuestas de sondeo aún.</td></tr>'
          }
        </tbody>
      </table>
    </div>
  </div>

  <!-- Últimos Mensajes Clasificados por IA -->
  <div class="section-card">
    <div class="section-title">🧠 Feed de Inteligencia Conversacional (Últimos 15 Mensajes)</div>
    <table class="table">
      <thead>
        <tr>
          <th>Categoría</th>
          <th>Mensaje / Transcripción</th>
          <th>Sentimiento</th>
          <th>Urgencia</th>
          <th>Oportunidad Comercial</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        ${
          allInsights.length > 0
            ? allInsights
                .slice(0, 15)
                .map(
                  (i) => `
          <tr>
            <td><strong style="color: var(--accent);">${i.category}</strong></td>
            <td>"${i.messageSnippet}"</td>
            <td>${i.sentiment}</td>
            <td><span class="tag-urgency-${i.urgencyLevel}">${i.urgencyLevel}</span></td>
            <td style="color: var(--warning);">${i.commercialIntent || '—'}</td>
            <td style="color: var(--text-muted); font-size: 12px;">${new Date(i.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
        `
                )
                .join('')
            : '<tr><td colspan="6" style="color: var(--text-muted);">Esperando mensajes de familias...</td></tr>'
        }
      </tbody>
    </table>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error: any) {
    res.status(500).send(`Error cargando dashboard: ${error.message}`);
  }
};
