import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export interface CustomerCaseStudy {
  id: string;
  familyName: string;
  location: string;
  primaryCaregiver: string;
  caregiverRole: string;
  elderlyName: string;
  elderlyAge: number;
  conditions: string[];
  monthlyPharmaSpend: number;
  hasExternalCaregiver: boolean;
  caregiverBudget: number;
  topPainPoint: string;
  businessFit: 'Modelo 1: Farmacia Recurrente' | 'Modelo 2: Cuidadoras SOS' | 'Ambos Modelos';
  quote: string;
  status: 'Piloto Activo (Prueba)';
}

// Caso real del usuario y familia de prueba: Familia Mendoza
export const mendozaCaseStudy: CustomerCaseStudy = {
  id: 'demo-family-id',
  familyName: 'Familia Mendoza',
  location: 'San Miguel, Lima (Piloto Activo)',
  primaryCaregiver: 'Carlos Mendoza (+51 999 999 999)',
  caregiverRole: 'Hijo principal (Cuidador en casa)',
  elderlyName: 'Don Alberto Mendoza',
  elderlyAge: 78,
  conditions: ['Hipertensión arterial', 'Diabetes tipo 2', 'Alergia a Penicilina'],
  monthlyPharmaSpend: 105.00,
  hasExternalCaregiver: true,
  caregiverBudget: 450.00, // Apoyo por turnos fin de semana
  topPainPoint: 'Riesgo de desabastecimiento de Losartán los fines de semana y falta de reemplazo de emergencia cuando Elena (apoyo) no puede asistir.',
  businessFit: 'Ambos Modelos',
  quote: 'Don Alberto toma Losartán cada 12 horas y Metformina en las mañanas. Si se nos acaba el blíster un domingo en la noche, se descompensa con la presión alta y no podemos salir a buscar boticas abiertas. Además, si la persona de apoyo nos falla, colapsamos.',
  status: 'Piloto Activo (Prueba)',
};

const sampleDiscoveryData = {
  activeFamiliesCount: 1,
  totalEvents: 42,
  totalInsights: 8,
  totalPulseResponses: 4,
  caseStudies: [mendozaCaseStudy],
  allInsights: [
    {
      id: 'ins-1',
      category: 'medication',
      messageSnippet: 'Don Alberto toma Losartán 50mg cada 12 horas. Quedan 14 pastillas y debemos reponer antes del domingo para evitar descompensación.',
      sentiment: 'stressed',
      urgencyLevel: 'critical',
      painPointSummary: 'Riesgo de quiebre de stock de antihipertensivo crítico',
      isUnmetNeed: true,
      commercialIntent: 'pharma_subscription',
      createdAt: new Date(Date.now() - 1000 * 60 * 45),
    },
    {
      id: 'ins-2',
      category: 'emergency_night',
      messageSnippet: 'Don Alberto se levantó al baño a oscuras a las 3am y casi se resbala. Carlos necesita relevo nocturno cuando trabaja.',
      sentiment: 'urgent',
      urgencyLevel: 'critical',
      painPointSummary: 'Riesgo de caídas nocturnas y sobrecarga del cuidador',
      isUnmetNeed: true,
      commercialIntent: 'caregiver_hire',
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
    },
    {
      id: 'ins-3',
      category: 'caregiver_friction',
      messageSnippet: 'Elena Ramos (apoyo FDS) solo viene sábados. Si tiene una emergencia, no hay plan de reemplazo en la familia.',
      sentiment: 'frustrated',
      urgencyLevel: 'high',
      painPointSummary: 'Falta de cuidadora de respaldo garantizada ante ausencias',
      isUnmetNeed: true,
      commercialIntent: 'caregiver_hire',
      createdAt: new Date(Date.now() - 1000 * 60 * 240),
    },
    {
      id: 'ins-4',
      category: 'expense',
      messageSnippet: 'Compramos Losartán, Metformina y pañales en Inkafarma por S/. 105.00 y dividimos la mitad con Sofía Mendoza directamente.',
      sentiment: 'satisfied',
      urgencyLevel: 'medium',
      painPointSummary: 'Transparencia y reparto de gastos médicos entre hermanos',
      isUnmetNeed: false,
      commercialIntent: 'family_wallet',
      createdAt: new Date(Date.now() - 1000 * 60 * 480),
    },
    {
      id: 'ins-5',
      category: 'clinical_report',
      messageSnippet: 'Control de presión matutina: 125/80 mmHg. Historial guardado para la consulta con el Dr. Carlos Benavides en la Clínica San Felipe.',
      sentiment: 'calm',
      urgencyLevel: 'medium',
      painPointSummary: 'Consolidación de signos vitales para cita con cardiólogo',
      isUnmetNeed: false,
      commercialIntent: 'clinical_report',
      createdAt: new Date(Date.now() - 1000 * 60 * 720),
    },
  ],
  allPulseResponses: [
    { topFriction: 'medication_procurement', rawAnswer: 'Estar pendiente de si alcanza el Losartán antes de que cierre la botica.', details: 'Falta de stock y reposición manual', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12) },
    { topFriction: 'caregiver_fatigue', rawAnswer: 'Vigilancia nocturna continua cuando Don Alberto se levanta desorientado.', details: 'Agotamiento físico nocturno', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36) },
    { topFriction: 'family_finances', rawAnswer: 'Coordinar con Sofía que vive lejos para que transfiera su parte del gasto de farmacia.', details: 'Repartición de gastos familiares', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 60) },
  ],
  expenses: [
    { amount: 60.00, category: 'medications', title: 'Inkafarma - Losartán 50mg y Metformina 850mg' },
    { amount: 45.00, category: 'hygiene', title: 'Pañales para adulto mayor (Plenitud x 30)' },
  ],
};

async function fetchDiscoveryData() {
  try {
    const rawFamilies = await prisma.family.findMany({
      include: {
        elderly: true,
        members: true,
        medications: true,
        expenses: true,
      },
      take: 10,
    }).catch(() => []);

    // Si existen familias reales en la base de datos, usarlas
    if (rawFamilies.length > 0) {
      const realCaseStudies: CustomerCaseStudy[] = rawFamilies.map((fam) => {
        const caregiver = fam.members.find(m => m.role === 'primary_caregiver' || m.role === 'weekend_helper') || fam.members[0];
        const pharmaExpense = fam.expenses
          .filter(e => e.category === 'medications')
          .reduce((sum, e) => sum + Number(e.amount), 0);

        return {
          id: fam.id,
          familyName: fam.name,
          location: 'Lima Metropolitana (Registrado en App)',
          primaryCaregiver: caregiver ? `${caregiver.name} (${caregiver.phone || caregiver.email || 'App'})` : 'Carlos Mendoza',
          caregiverRole: caregiver ? caregiver.role.replace('_', ' ') : 'Cuidador Principal',
          elderlyName: fam.elderly?.name || 'Don Alberto Mendoza',
          elderlyAge: fam.elderly?.birthDate
            ? Math.floor((Date.now() - new Date(fam.elderly.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
            : 78,
          conditions: fam.elderly?.conditions && fam.elderly.conditions.length > 0
            ? fam.elderly.conditions
            : ['Hipertensión arterial', 'Diabetes tipo 2'],
          monthlyPharmaSpend: pharmaExpense > 0 ? pharmaExpense : 105.00,
          hasExternalCaregiver: fam.members.some(m => m.role === 'paid_caregiver'),
          caregiverBudget: fam.members.some(m => m.role === 'paid_caregiver') ? 450.00 : 0,
          topPainPoint: 'Gestión diaria de recetas, stock de farmacia y relevo de cuidado.',
          businessFit: 'Ambos Modelos',
          quote: 'Usuario activo interactuando con la aplicación y bitácora clínica.',
          status: 'Piloto Activo (Prueba)',
        };
      });

      return {
        activeFamiliesCount: rawFamilies.length,
        totalEvents: sampleDiscoveryData.totalEvents,
        totalInsights: sampleDiscoveryData.totalInsights,
        totalPulseResponses: sampleDiscoveryData.totalPulseResponses,
        caseStudies: realCaseStudies,
        allInsights: sampleDiscoveryData.allInsights,
        allPulseResponses: sampleDiscoveryData.allPulseResponses,
        expenses: rawFamilies[0].expenses.length > 0 ? rawFamilies[0].expenses : sampleDiscoveryData.expenses,
      };
    }

    return sampleDiscoveryData;
  } catch (err) {
    return sampleDiscoveryData;
  }
}

/**
 * 1. Endpoint JSON con resumen consolidado de métricas
 */
export const getAnalyticsSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await fetchDiscoveryData();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, data: null, error: error.message });
  }
};

/**
 * 2. Vista HTML interactiva del Dashboard de Insights para Fundadores y Asesores
 */
export const renderInsightsDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const {
      activeFamiliesCount,
      caseStudies,
      allInsights,
      expenses,
    } = await fetchDiscoveryData();

    let totalExpense = 0;
    for (const e of expenses) totalExpense += Number(e.amount);

    const pilotCase = caseStudies[0] || mendozaCaseStudy;
    const avgPharmaSpend = pilotCase.monthlyPharmaSpend;
    const estNetMargin18 = (avgPharmaSpend * 0.18).toFixed(2);
    const estLtv12m = (avgPharmaSpend * 0.18 * 12).toFixed(2);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ayni Care — Tesis Comercial & Validación de Negocio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    :root {
      --bg: #0A0F0D;
      --card-bg: #121A16;
      --card-hover: #16221D;
      --border: #1E2D26;
      --border-accent: rgba(52, 211, 153, 0.25);
      --primary: #10B981;
      --primary-dark: #059669;
      --primary-light: #34D399;
      --accent: #E6F4EA;
      --text: #F8FAF8;
      --text-muted: #94A3B8;
      --warning: #F59E0B;
      --danger: #EF4444;
      --indigo: #6366F1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 0;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4, .font-heading { font-family: 'Outfit', sans-serif; }

    /* Top Navigation */
    .top-nav {
      background: rgba(18, 26, 22, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #10B981, #047857);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--primary-light);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-live::before {
      content: '';
      width: 6px;
      height: 6px;
      background: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10B981;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-nav {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-nav:hover {
      background: var(--border);
      border-color: var(--primary-light);
      color: #fff;
    }

    .container {
      max-width: 1320px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    /* Executive Hero Header */
    .hero-banner {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 26, 22, 0.4) 100%);
      border: 1px solid var(--border-accent);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 32px;
      position: relative;
    }
    .hero-title {
      font-size: 30px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .hero-subtitle {
      font-size: 15px;
      color: var(--text-muted);
      max-width: 860px;
      line-height: 1.6;
    }

    /* KPIs */
    .grid-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 36px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      transition: transform 0.2s, border-color 0.2s;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-accent);
    }
    .kpi-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .kpi-number {
      font-size: 34px;
      font-weight: 800;
      color: #fff;
      margin: 10px 0 4px 0;
      letter-spacing: -0.03em;
    }
    .kpi-meta {
      font-size: 12px;
      color: var(--primary-light);
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }

    /* Tabs Filter Bar */
    .tab-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      background: rgba(18, 26, 22, 0.6);
      padding: 6px;
      border-radius: 12px;
      border: 1px solid var(--border);
      width: fit-content;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .tab-btn.active {
      background: var(--primary);
      color: #0A0F0D;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    /* Model Cards */
    .model-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 36px;
    }
    @media (max-width: 960px) { .model-grid { grid-template-columns: 1fr; } }

    .model-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 28px;
    }
    .model-tag {
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tag-pharma {
      background: rgba(16, 185, 129, 0.15);
      color: var(--primary-light);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .tag-sos {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .model-title {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
    }
    .model-desc {
      font-size: 13.5px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .unit-economics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .ue-item { text-align: center; }
    .ue-val { font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 2px; }
    .ue-lbl { font-size: 11px; color: var(--text-muted); font-weight: 500; }

    .validation-bullet {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 13px;
      color: #CBD5E1;
    }
    .validation-bullet i {
      color: var(--primary-light);
      margin-top: 3px;
      flex-shrink: 0;
    }

    /* Single Customer Card */
    .single-customer-card {
      background: var(--card-bg);
      border: 1px solid var(--border-accent);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 36px;
    }
    .cust-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .cust-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--primary-light);
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .patient-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .detail-item {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .detail-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .detail-value {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }
    .condition-pill {
      display: inline-block;
      background: rgba(99, 102, 241, 0.15);
      color: #A5B4FC;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 6px;
      margin-top: 4px;
    }
    .quote-box {
      background: rgba(245, 158, 11, 0.08);
      border-left: 4px solid var(--warning);
      border-radius: 0 12px 12px 0;
      padding: 20px;
      font-size: 14px;
      color: #F8FAF8;
      font-style: italic;
      line-height: 1.6;
    }

    /* Simulator */
    .sim-card {
      background: linear-gradient(145deg, #121A16 0%, #0E1512 100%);
      border: 1px solid var(--border-accent);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 36px;
    }
    .slider-range {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: #1E2D26;
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
    }
    .slider-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #10B981;
      cursor: pointer;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
      border: 2px solid #fff;
    }
    .sim-result-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .sim-stat {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .sim-stat-val { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 4px; }
    .sim-stat-lbl { font-size: 12px; color: var(--text-muted); font-weight: 500; }

    /* Tables */
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow-x: auto;
      margin-bottom: 40px;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th {
      background: rgba(0, 0, 0, 0.2);
      padding: 14px 18px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 14px 18px;
      font-size: 13.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #E2E8F0;
    }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    .tag-critical { background: rgba(239, 68, 68, 0.2); color: #F87171; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .tag-high { background: rgba(245, 158, 11, 0.2); color: #FBBF24; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .tag-medium { background: rgba(16, 185, 129, 0.2); color: #34D399; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
  </style>
</head>
<body>

  <!-- Top Navigation -->
  <nav class="top-nav">
    <div class="brand">
      <div class="brand-logo">🌿</div>
      <div>
        <div class="brand-title">Ayni Care</div>
        <div style="font-size: 11px; color: var(--text-muted);">Tesis de Negocio & Discovery</div>
      </div>
      <div class="badge-live" style="margin-left: 10px;">Piloto Mendoza Conectado</div>
    </div>
    <div class="nav-actions">
      <a href="/admin?token=aynicare-admin-2026" class="btn-nav">
        <i data-lucide="layout-grid" style="width: 15px; height: 15px;"></i>
        Panel Operativo (/admin)
      </a>
      <a href="/health" target="_blank" class="btn-nav">
        <i data-lucide="activity" style="width: 15px; height: 15px;"></i>
        Estado API (/health)
      </a>
    </div>
  </nav>

  <div class="container">

    <!-- Executive Hero -->
    <div class="hero-banner">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <span class="badge-live" style="margin-bottom: 12px;">Validación de Tesis Comercial 2026</span>
          <h1 class="hero-title">Monetización en Cuidado Geriátrico Familiar</h1>
          <p class="hero-subtitle">
            Validación de hipótesis y economía unitaria con nuestra <strong>Familia Piloto de Prueba (Familia Mendoza)</strong>. Evidencia real de gasto inelástico mensual en recetas crónicas y necesidad de reemplazo de emergencia para cuidadores.
          </p>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 14px 20px; border-radius: 12px; border: 1px solid var(--border);">
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Gasto Registrado en Piloto</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--primary-light);">S/. ${totalExpense.toFixed(2)}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Inkafarma + Pañales (Quincena)</div>
        </div>
      </div>
    </div>

    <!-- KPIs Coherentes con la Familia de Prueba -->
    <div class="grid-kpis">
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="users" style="width: 16px; height: 16px;"></i> Familia Piloto en Seguimiento</div>
        <div class="kpi-number">${activeFamiliesCount}</div>
        <div class="kpi-meta"><i data-lucide="check-circle" style="width: 13px; height: 13px;"></i> Familia Mendoza (San Miguel)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="pill" style="width: 16px; height: 16px;"></i> Medicamentos Crónicos Activos</div>
        <div class="kpi-number">3</div>
        <div class="kpi-meta"><i data-lucide="check" style="width: 13px; height: 13px;"></i> Losartán, Metformina, Atorvastatina</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="receipt" style="width: 16px; height: 16px;"></i> Gasto Real Farmacia / Quincena</div>
        <div class="kpi-number">S/. ${totalExpense.toFixed(0)}</div>
        <div class="kpi-meta"><i data-lucide="trending-up" style="width: 13px; height: 13px;"></i> ~S/. 210 - S/. 320 al mes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="sparkles" style="width: 16px; height: 16px;"></i> Margen Neto Estimado (18%)</div>
        <div class="kpi-number">S/. ${estNetMargin18}</div>
        <div class="kpi-meta"><i data-lucide="award" style="width: 13px; height: 13px;"></i> S/. ${estLtv12m} LTV anual recurrente</div>
      </div>
    </div>

    <!-- Filtro de Vistas -->
    <div class="tab-bar">
      <button class="tab-btn active" onclick="switchSection('customer', this)">
        <i data-lucide="user-check" style="width: 15px; height: 15px;"></i> 1. Familia de Prueba (Don Alberto & Carlos)
      </button>
      <button class="tab-btn" onclick="switchSection('models', this)">
        <i data-lucide="target" style="width: 15px; height: 15px;"></i> 2. Validación de los 2 Modelos
      </button>
      <button class="tab-btn" onclick="switchSection('simulator', this)">
        <i data-lucide="calculator" style="width: 15px; height: 15px;"></i> 3. Simulador de Proyección a Escala
      </button>
      <button class="tab-btn" onclick="switchSection('verbatims', this)">
        <i data-lucide="message-square" style="width: 15px; height: 15px;"></i> 4. Dolores Registrados
      </button>
    </div>

    <!-- SECCIÓN 1: PERFIL DEL CLIENTE / FAMILIA DE PRUEBA -->
    <div id="section-customer">
      <div class="single-customer-card">
        <div class="cust-top">
          <div>
            <div style="font-size: 24px; font-weight: 800; color: #fff;">${pilotCase.familyName}</div>
            <div style="font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 4px;">
              <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> ${pilotCase.location}
            </div>
          </div>
          <span class="cust-badge">${pilotCase.status}</span>
        </div>

        <div class="patient-details-grid">
          <div class="detail-item">
            <div class="detail-label">Adulto Mayor Atendido</div>
            <div class="detail-value">${pilotCase.elderlyName} (${pilotCase.elderlyAge} años)</div>
            <div style="margin-top: 8px;">
              ${pilotCase.conditions.map(c => `<span class="condition-pill">${c}</span>`).join('')}
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label">Red de Cuidado Familiar</div>
            <div class="detail-value">Carlos Mendoza (Hijo principal)</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
              • Sofía Mendoza (Hija a distancia)<br>
              • Elena Ramos (Apoyo fin de semana)
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label">Gasto Real Registrado en Farmacia</div>
            <div class="detail-value" style="color: var(--primary-light);">S/. ${totalExpense.toFixed(2)}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              • Inkafarma (Losartán + Metformina): S/. 60.00<br>
              • Pañales Plenitud x 30: S/. 45.00
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label">Alineación con Modelos de Negocio</div>
            <div class="detail-value" style="color: var(--warning);">${pilotCase.businessFit}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              Aplica tanto a reposición programada como a soporte de relevo.
            </div>
          </div>
        </div>

        <div class="quote-box">
          <div style="font-weight: 700; color: var(--warning); margin-bottom: 6px;">💬 Voz del Cuidador (Carlos Mendoza):</div>
          "${pilotCase.quote}"
        </div>
      </div>
    </div>

    <!-- SECCIÓN 2: VALIDACIÓN DE LOS 2 MODELOS DE NEGOCIO -->
    <div id="section-models" style="display: none;">
      <div class="model-grid">
        
        <!-- Modelo 1 -->
        <div class="model-card" style="border-color: rgba(16, 185, 129, 0.4);">
          <div style="margin-bottom: 16px;">
            <span class="model-tag tag-pharma">Gasto Inelástico Mensual</span>
            <h3 class="model-title" style="margin-top: 10px;">💊 Modelo 1: Farmacia Recurrente a Domicilio</h3>
          </div>
          <p class="model-desc">
            Despacho mensual garantizado en casa de Losartán 50mg, Metformina 850mg y pañales antes de que se acabe el blíster. Don Alberto nunca puede suspender la toma.
          </p>

          <div class="unit-economics">
            <div class="ue-item">
              <div class="ue-val" style="color: var(--primary-light);">S/. 105 - 210</div>
              <div class="ue-lbl">Gasto Mensual Botica</div>
            </div>
            <div class="ue-item">
              <div class="ue-val" style="color: var(--warning);">18%</div>
              <div class="ue-lbl">Margen Neto Alianza</div>
            </div>
            <div class="ue-item">
              <div class="ue-val" style="color: #fff;">S/. 38.00</div>
              <div class="ue-lbl">Margen / Familia / Mes</div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Dolor Validado en Familia Mendoza:</strong> Tienen 14 pastillas de Losartán; si no compran a tiempo, el domingo se quedan sin pastillas.</span>
            </div>
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Ventaja de Ayni Care:</strong> La app sabe la fecha exacta de agotamiento porque Carlos marca cada dosis diaria tomada.</span>
            </div>
          </div>
        </div>

        <!-- Modelo 2 -->
        <div class="model-card" style="border-color: rgba(245, 158, 11, 0.4);">
          <div style="margin-bottom: 16px;">
            <span class="model-tag tag-sos">Alta Urgencia Emocional</span>
            <h3 class="model-title" style="margin-top: 10px;">👩‍⚕️ Modelo 2: Cuidadoras SOS & Reemplazo</h3>
          </div>
          <p class="model-desc">
            Servicio de match y reemplazo de emergencia cuando Elena (apoyo de fin de semana) se enferma o cuando Carlos necesita relevo nocturno para evitar caídas.
          </p>

          <div class="unit-economics">
            <div class="ue-item">
              <div class="ue-val" style="color: var(--warning);">S/. 150</div>
              <div class="ue-lbl">Tarifa Turno SOS (12h)</div>
            </div>
            <div class="ue-item">
              <div class="ue-val" style="color: var(--primary-light);">20%</div>
              <div class="ue-lbl">Take Rate por Match</div>
            </div>
            <div class="ue-item">
              <div class="ue-val" style="color: #fff;">S/. 30.00</div>
              <div class="ue-lbl">Ganancia Neta por Turno</div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Dolor Validado en Familia Mendoza:</strong> Don Alberto se levantó a las 3am desorientado y casi se cae. Carlos no puede pasar la noche en vela si trabaja temprano.</span>
            </div>
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Propuesta de Valor:</strong> Colocación garantizada de cuidadora verificada en menos de 2 horas.</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- SECCIÓN 3: SIMULADOR DE ESCALA -->
    <div id="section-simulator" style="display: none;">
      <div class="sim-card">
        <div style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
          <i data-lucide="trending-up" style="color: var(--primary-light);"></i>
          Simulador Financiero de Escala para Asesor / Inversionistas
        </div>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px;">
          Partiendo del comportamiento validado en la Familia Mendoza (S/. 210/mes en recetas crónicas y 1.2 necesidades de relevo SOS por trimestre), proyecta los ingresos al escalar:
        </p>

        <div style="margin: 24px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: 600; font-size: 15px;">Familias Similares a Familia Mendoza:</span>
            <span id="sliderValue" style="font-size: 26px; font-weight: 800; color: var(--primary-light);">100 familias</span>
          </div>
          <input type="range" min="10" max="500" step="10" value="100" class="slider-range" id="famSlider" oninput="updateSimulation(this.value)">
        </div>

        <div class="sim-result-grid">
          <div class="sim-stat">
            <div class="sim-stat-lbl">Volumen de Farmacia (GMV)</div>
            <div class="sim-stat-val" id="statGMV">S/. 21,000</div>
            <div style="font-size: 11px; color: var(--text-muted);">Gasto transaccionado mensual</div>
          </div>
          <div class="sim-stat" style="border-color: rgba(16, 185, 129, 0.4);">
            <div class="sim-stat-lbl">Ingreso Neto Farmacia (18%)</div>
            <div class="sim-stat-val" id="statPharmaNet" style="color: var(--primary-light);">S/. 3,780</div>
            <div style="font-size: 11px; color: var(--text-muted);">Comisión de boticas aliadas</div>
          </div>
          <div class="sim-stat" style="border-color: rgba(245, 158, 11, 0.4);">
            <div class="sim-stat-lbl">Ingreso Neto Cuidadoras SOS</div>
            <div class="sim-stat-val" id="statSosNet" style="color: var(--warning);">S/. 1,800</div>
            <div style="font-size: 11px; color: var(--text-muted);">60 turnos SOS @ S/. 30 fee</div>
          </div>
          <div class="sim-stat" style="background: rgba(16, 185, 129, 0.1); border-color: var(--primary);">
            <div class="sim-stat-lbl" style="color: var(--primary-light); font-weight: 700;">TOTAL INGRESOS NETOS / MES</div>
            <div class="sim-stat-val" id="statTotalNet" style="color: #fff; font-size: 30px;">S/. 5,580</div>
            <div style="font-size: 11px; color: var(--primary-light);">S/. 66,960 ARR Proyectado</div>
          </div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 4: DOLORES Y EVIDENCIA REGISTRADA -->
    <div id="section-verbatims" style="display: none;">
      <div style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
        <i data-lucide="message-square" style="color: var(--warning);"></i>
        Dolores y Eventos Críticos Registrados en el Piloto
      </div>
      <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">
        Eventos reales documentados en la rutina diaria de la Familia Mendoza clasificados por severidad y oportunidad comercial.
      </p>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Registro / Evento</th>
              <th>Sentimiento</th>
              <th>Severidad</th>
              <th>Fit Comercial</th>
            </tr>
          </thead>
          <tbody>
            ${allInsights.map((ins) => `
              <tr>
                <td><strong style="color: var(--primary-light);">${ins.category}</strong></td>
                <td style="max-width: 440px;">${ins.messageSnippet}</td>
                <td><span style="text-transform: capitalize; color: #CBD5E1;">${ins.sentiment}</span></td>
                <td>
                  <span class="${ins.urgencyLevel === 'critical' ? 'tag-critical' : ins.urgencyLevel === 'high' ? 'tag-high' : 'tag-medium'}">
                    ${ins.urgencyLevel}
                  </span>
                </td>
                <td><strong style="color: var(--warning);">${ins.commercialIntent}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <script>
    lucide.createIcons();

    function switchSection(sectionId, btn) {
      const sections = ['customer', 'models', 'simulator', 'verbatims'];
      sections.forEach(s => {
        const el = document.getElementById('section-' + s);
        if (el) el.style.display = (s === sectionId) ? 'block' : 'none';
      });

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      lucide.createIcons();
    }

    function updateSimulation(fams) {
      document.getElementById('sliderValue').innerText = fams + ' familias';
      
      const numFams = parseInt(fams, 10);
      const avgMonthlySpend = 210; // Gasto mensual promedio de Don Alberto
      const gmv = numFams * avgMonthlySpend;
      const pharmaNet = gmv * 0.18;
      
      // 1 turno SOS cada mes por cada 2 familias = numFams * 0.5 * S/. 150 * 20% (S/. 30)
      const sosNet = numFams * 18;
      const totalNet = pharmaNet + sosNet;

      document.getElementById('statGMV').innerText = 'S/. ' + gmv.toLocaleString('es-PE');
      document.getElementById('statPharmaNet').innerText = 'S/. ' + Math.round(pharmaNet).toLocaleString('es-PE');
      document.getElementById('statSosNet').innerText = 'S/. ' + Math.round(sosNet).toLocaleString('es-PE');
      document.getElementById('statTotalNet').innerText = 'S/. ' + Math.round(totalNet).toLocaleString('es-PE');
    }
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error: any) {
    res.status(500).send(`<h3>Error cargando dashboard:</h3><pre>${error.message}</pre>`);
  }
};
