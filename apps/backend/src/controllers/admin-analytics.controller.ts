import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export interface RegisteredFamilyItem {
  id: string;
  familyName: string;
  createdAt: string;
  primaryCaregiverName: string;
  primaryCaregiverRole: string;
  elderlyName: string;
  elderlyAge: number | null;
  conditions: string[];
  membersList: { name: string; role: string }[];
  medicationsList: string[];
  totalExpenses: number;
  expensesList: { title: string; amount: number }[];
  hasExternalCaregiver: boolean;
}

async function fetchDiscoveryData() {
  try {
    const [
      rawFamilies,
      totalElderlyCount,
      totalMedsCount,
      expenseAgg,
      realInsights,
      pharmaCount,
      agencyCount,
    ] = await Promise.all([
      prisma.family.findMany({
        include: {
          elderly: true,
          members: true,
          medications: true,
          expenses: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).catch(() => []),
      prisma.elderlyPerson.count().catch(() => 0),
      prisma.medication.count().catch(() => 0),
      prisma.expense.aggregate({
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: null } })),
      prisma.conversationInsight.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).catch(() => []),
      prisma.conversationInsight.count({
        where: { commercialIntent: 'pharma_subscription' },
      }).catch(() => 0),
      prisma.conversationInsight.count({
        where: { commercialIntent: 'caregiver_hire' },
      }).catch(() => 0),
    ]);

    const totalExpense = expenseAgg._sum.amount ? Number(expenseAgg._sum.amount) : 0;

    const familiesList: RegisteredFamilyItem[] = rawFamilies.map((fam) => {
      const caregiver = fam.members.find((m) => m.role === 'primary_caregiver') || fam.members[0];
      const famTotalExpense = fam.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const membersList = fam.members.map((m) => ({
        name: m.name,
        role:
          m.role === 'primary_caregiver'
            ? 'Cuidador Principal'
            : m.role === 'remote_family'
            ? 'Familiar a Distancia'
            : m.role === 'weekend_helper'
            ? 'Apoyo Fin de Semana'
            : m.role === 'paid_caregiver'
            ? 'Cuidadora Contratada'
            : m.role,
      }));
      const medicationsList = fam.medications.map((med) => `${med.name} ${med.dosage || ''}`.trim());
      const age = fam.elderly?.birthDate
        ? Math.floor((Date.now() - new Date(fam.elderly.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;

      return {
        id: fam.id,
        familyName: fam.name,
        createdAt: new Date(fam.createdAt).toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        primaryCaregiverName: caregiver?.name || 'No asignado',
        primaryCaregiverRole: caregiver ? caregiver.role.replace('_', ' ') : 'Cuidador',
        elderlyName: fam.elderly?.name || 'Adulto mayor no registrado',
        elderlyAge: age,
        conditions: fam.elderly?.conditions || [],
        membersList,
        medicationsList,
        totalExpenses: famTotalExpense,
        expensesList: fam.expenses.slice(0, 4).map((e) => ({
          title: e.title,
          amount: Number(e.amount),
        })),
        hasExternalCaregiver: fam.members.some((m) => m.role === 'paid_caregiver'),
      };
    });

    return {
      familiesList,
      activeFamiliesCount: rawFamilies.length,
      totalElderlyCount,
      totalMedsCount,
      totalExpense,
      realInsights,
      pharmaCount,
      agencyCount,
    };
  } catch (err) {
    return {
      familiesList: [],
      activeFamiliesCount: 0,
      totalElderlyCount: 0,
      totalMedsCount: 0,
      totalExpense: 0,
      realInsights: [],
      pharmaCount: 0,
      agencyCount: 0,
    };
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
 * 2. Vista HTML interactiva del Dashboard de Insights para Fundadores
 */
export const renderInsightsDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const {
      familiesList,
      activeFamiliesCount,
      totalElderlyCount,
      totalMedsCount,
      totalExpense,
      realInsights,
      pharmaCount,
      agencyCount,
    } = await fetchDiscoveryData();

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ayni Care — Validación Comercial & Panel de Insights</title>
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
      --purple: #8B5CF6;
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

    /* Top KPIs */
    .grid-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px;
      transition: all 0.2s ease;
    }
    .kpi-card:hover {
      border-color: var(--border-accent);
      transform: translateY(-2px);
    }
    .kpi-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kpi-number {
      font-size: 32px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
      font-family: 'Outfit', sans-serif;
    }
    .kpi-meta {
      font-size: 12px;
      color: var(--primary-light);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Tabs */
    .tab-bar {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      margin-bottom: 28px;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      white-space: nowrap;
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

    /* Family Cards */
    .family-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 36px;
    }
    .family-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 26px;
      transition: border-color 0.2s;
    }
    .family-card:hover {
      border-color: rgba(52, 211, 153, 0.4);
    }
    .family-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .family-name {
      font-size: 22px;
      font-weight: 800;
      color: #FFFFFF;
    }
    .family-date {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .family-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--primary-light);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .patient-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .detail-item {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .detail-label {
      font-size: 11.5px;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .detail-value {
      font-size: 14.5px;
      font-weight: 700;
      color: #fff;
    }
    .condition-pill {
      display: inline-block;
      background: rgba(99, 102, 241, 0.15);
      color: #A5B4FC;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      margin-right: 5px;
      margin-top: 4px;
    }
    .med-pill {
      display: inline-block;
      background: rgba(16, 185, 129, 0.12);
      color: var(--primary-light);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      margin-right: 5px;
      margin-top: 4px;
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
    .tag-agency {
      background: rgba(139, 92, 246, 0.15);
      color: #C4B5FD;
      border: 1px solid rgba(139, 92, 246, 0.3);
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
    .tag-low { background: rgba(148, 163, 184, 0.2); color: #94A3B8; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    
    .empty-state {
      background: var(--card-bg);
      border: 1px dashed var(--border);
      border-radius: 18px;
      padding: 48px 24px;
      text-align: center;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <!-- Top Navigation -->
  <nav class="top-nav">
    <div class="brand">
      <div class="brand-logo">🌿</div>
      <div>
        <div class="brand-title">Ayni Care</div>
        <div style="font-size: 11px; color: var(--text-muted);">Tesis de Negocio & Validación</div>
      </div>
      <div class="badge-live" style="margin-left: 10px;">Base de Datos Conectada</div>
    </div>
    <div class="nav-actions">
      <a href="/admin/export-csv?token=aynicare-admin-2026" class="btn-nav" style="border-color: rgba(52, 211, 153, 0.5); color: var(--primary-light);">
        <i data-lucide="download" style="width: 15px; height: 15px;"></i>
        Exportar CSV
      </a>
      <a href="/admin?token=aynicare-admin-2026" class="btn-nav">
        <i data-lucide="layout-grid" style="width: 15px; height: 15px;"></i>
        Panel Operativo
      </a>
      <a href="/health" target="_blank" class="btn-nav">
        <i data-lucide="activity" style="width: 15px; height: 15px;"></i>
        API Status
      </a>
    </div>
  </nav>

  <div class="container">

    <!-- Executive Hero -->
    <div class="hero-banner">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <span class="badge-live" style="margin-bottom: 12px;">Validación Comercial en Vivo 2026</span>
          <h1 class="hero-title">Monetización & Demanda en Cuidado Geriátrico</h1>
          <p class="hero-subtitle">
            Métricas reales y dinámicas consolidadas de la base de datos de Ayni Care: Familias inscritas, telemetría de demanda comercial activa (Farmacia vs. Agencias) y registro clasificado de dolores de los usuarios.
          </p>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 14px 20px; border-radius: 12px; border: 1px solid var(--border);">
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Gastos Registrados en Plataforma</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--primary-light);">S/. ${totalExpense.toFixed(2)}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Farmacia + Pañales + Cuidado</div>
        </div>
      </div>
    </div>

    <!-- Top KPIs Reales de BD -->
    <div class="grid-kpis">
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="users" style="width: 16px; height: 16px;"></i> Familias Registradas</div>
        <div class="kpi-number">${activeFamiliesCount}</div>
        <div class="kpi-meta"><i data-lucide="check-circle" style="width: 13px; height: 13px;"></i> Grupos familiares activos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="heart" style="width: 16px; height: 16px;"></i> Adultos Mayores Atendidos</div>
        <div class="kpi-number">${totalElderlyCount}</div>
        <div class="kpi-meta"><i data-lucide="shield" style="width: 13px; height: 13px;"></i> Pacientes con ficha geriátrica</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="pill" style="width: 16px; height: 16px;"></i> Medicamentos Monitoreados</div>
        <div class="kpi-number">${totalMedsCount}</div>
        <div class="kpi-meta"><i data-lucide="calendar" style="width: 13px; height: 13px;"></i> Tratamientos diarios con dosis</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="receipt" style="width: 16px; height: 16px;"></i> Gastos Compartidos Registrados</div>
        <div class="kpi-number">S/. ${totalExpense.toFixed(0)}</div>
        <div class="kpi-meta"><i data-lucide="trending-up" style="width: 13px; height: 13px;"></i> Volumen reportado por usuarios</div>
      </div>
    </div>

    <!-- Filtro de Vistas (3 Secciones Claras) -->
    <div class="tab-bar">
      <button class="tab-btn active" onclick="switchSection('families', this)">
        <i data-lucide="users" style="width: 15px; height: 15px;"></i> 1. Familias Registradas (${activeFamiliesCount})
      </button>
      <button class="tab-btn" onclick="switchSection('models', this)">
        <i data-lucide="target" style="width: 15px; height: 15px;"></i> 2. Validación Comercial: Farmacia vs. Agencias
      </button>
      <button class="tab-btn" onclick="switchSection('verbatims', this)">
        <i data-lucide="message-square" style="width: 15px; height: 15px;"></i> 3. Dolores e Intenciones Detectadas (${realInsights.length})
      </button>
    </div>

    <!-- SECCIÓN 1: DIRECTORIO DINÁMICO DE FAMILIAS REGISTRADAS -->
    <div id="section-families">
      ${
        familiesList.length === 0
          ? `
        <div class="empty-state">
          <i data-lucide="users" style="width: 48px; height: 48px; margin-bottom: 12px; color: var(--text-muted);"></i>
          <h3 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">No hay familias registradas todavía</h3>
          <p style="font-size: 14px;">Las familias que se creen en la app móvil aparecerán aquí con sus miembros, paciente y medicamentos.</p>
        </div>
      `
          : `
        <div class="family-list">
          ${familiesList
            .map(
              (fam) => `
            <div class="family-card">
              <div class="family-card-header">
                <div>
                  <div class="family-name">${fam.familyName}</div>
                  <div class="family-date">Registrada el ${fam.createdAt} • ID: ${fam.id}</div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  ${
                    fam.hasExternalCaregiver
                      ? `<span class="family-badge" style="background: rgba(139, 92, 246, 0.15); color: #C4B5FD; border-color: rgba(139, 92, 246, 0.3);">Tiene Cuidadora Contratada</span>`
                      : ''
                  }
                  <span class="family-badge">Familia Activa</span>
                </div>
              </div>

              <div class="patient-details-grid">
                <!-- Adulto Mayor -->
                <div class="detail-item">
                  <div class="detail-label"><i data-lucide="heart" style="width: 13px; height: 13px; display: inline;"></i> Adulto Mayor</div>
                  <div class="detail-value">${fam.elderlyName} ${fam.elderlyAge ? `(${fam.elderlyAge} años)` : ''}</div>
                  <div style="margin-top: 8px;">
                    ${
                      fam.conditions.length > 0
                        ? fam.conditions.map((c) => `<span class="condition-pill">${c}</span>`).join('')
                        : '<span style="font-size: 12px; color: var(--text-muted);">Sin condiciones clínicas registradas</span>'
                    }
                  </div>
                </div>

                <!-- Red de Cuidado -->
                <div class="detail-item">
                  <div class="detail-label"><i data-lucide="users" style="width: 13px; height: 13px; display: inline;"></i> Red de Cuidado (${fam.membersList.length} miembros)</div>
                  <div class="detail-value">${fam.primaryCaregiverName}</div>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; line-height: 1.5;">
                    ${fam.membersList.map((m) => `• ${m.name} (${m.role})`).join('<br>')}
                  </div>
                </div>

                <!-- Medicamentos -->
                <div class="detail-item">
                  <div class="detail-label"><i data-lucide="pill" style="width: 13px; height: 13px; display: inline;"></i> Medicamentos Activos (${fam.medicationsList.length})</div>
                  <div style="margin-top: 6px;">
                    ${
                      fam.medicationsList.length > 0
                        ? fam.medicationsList.map((m) => `<span class="med-pill">${m}</span>`).join('')
                        : '<span style="font-size: 12px; color: var(--text-muted);">No tiene medicamentos activos</span>'
                    }
                  </div>
                </div>

                <!-- Gastos Reportados -->
                <div class="detail-item">
                  <div class="detail-label"><i data-lucide="receipt" style="width: 13px; height: 13px; display: inline;"></i> Gastos Reportados en App</div>
                  <div class="detail-value" style="color: var(--primary-light);">S/. ${fam.totalExpenses.toFixed(2)}</div>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; line-height: 1.4;">
                    ${
                      fam.expensesList.length > 0
                        ? fam.expensesList.map((e) => `• ${e.title}: S/. ${e.amount.toFixed(2)}`).join('<br>')
                        : 'Sin gastos registrados en la bitácora'
                    }
                  </div>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
      }
    </div>

    <!-- SECCIÓN 2: VALIDACIÓN DE LOS 2 MODELOS DE NEGOCIO -->
    <div id="section-models" style="display: none;">
      
      <!-- TERMÓMETRO EN VIVO: VALIDACIÓN DE DEMANDA REAL -->
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 18px; padding: 26px; margin-bottom: 28px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge-live" style="background: rgba(16, 185, 129, 0.15); color: #34D399; font-size: 11px;">Telemetría Activa en App</span>
              <span style="font-size: 12px; color: var(--text-muted);">• Conteo directo desde Supabase</span>
            </div>
            <h2 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin-top: 6px;">
              🔥 Termómetro de Demanda Real (Pruebas de Conversión en App)
            </h2>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border);">
            Intenciones capturadas vía botón reposición farmacia & solicitud agencia
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;">
          <!-- Card Farmacia Telemetría -->
          <div style="background: rgba(18, 26, 22, 0.9); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 16px; padding: 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 700; color: #34D399; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="package" style="width: 20px; height: 20px;"></i>
                Farmacia Recurrente a Domicilio
              </span>
              <span style="font-size: 32px; font-weight: 800; color: #FFFFFF; font-family: 'Outfit', sans-serif;">${pharmaCount}</span>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.45; margin-bottom: 12px;">
              Familias que solicitaron cotización de reposición automática a domicilio al ver alerta de pastillas por acabarse o desde el banner mensual.
            </p>
            <div style="font-size: 12px; font-weight: 600; color: #34D399; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Necesidad inelástica y recurrente cada 30 días
            </div>
          </div>

          <!-- Card Agencias Telemetría -->
          <div style="background: rgba(26, 18, 38, 0.9); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 16px; padding: 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 700; color: #C4B5FD; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="shield-check" style="width: 20px; height: 20px;"></i>
                Agencias de Cuidadores
              </span>
              <span style="font-size: 32px; font-weight: 800; color: #FFFFFF; font-family: 'Outfit', sans-serif;">${agencyCount}</span>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.45; margin-bottom: 12px;">
              Familias que solicitaron cotizaciones formales especificando el tipo de turno requerido (12h noche, 12h día, cama adentro) y su nivel de urgencia.
            </p>
            <div style="font-size: 12px; font-weight: 600; color: #C4B5FD; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Alto ticket por colocación (S/. 250+) + SaaS mensual (S/. 35)
            </div>
          </div>
        </div>
      </div>

      <div class="model-grid">
        
        <!-- Modelo 1 -->
        <div class="model-card" style="border-color: rgba(16, 185, 129, 0.4);">
          <div style="margin-bottom: 16px;">
            <span class="model-tag tag-pharma">Gasto Inelástico Mensual</span>
            <h3 class="model-title" style="margin-top: 10px;">💊 Modelo 1: Farmacia Recurrente a Domicilio</h3>
          </div>
          <p class="model-desc">
            Despacho mensual automático en casa de recetas crónicas permanentes (antihipertensivos, diabetes, protectores gástricos) y pañales para adultos.
          </p>

          <div class="unit-economics">
            <div class="ue-item">
              <div class="ue-val" style="color: var(--primary-light);">S/. 120 - 250</div>
              <div class="ue-lbl">Ticket Promedio Mensual</div>
            </div>
            <div class="ue-item">
              <div class="ue-val" style="color: var(--warning);">15% - 18%</div>
              <div class="ue-lbl">Margen Alianza Botica</div>
            </div>
            <div class="ue-item">
              <div class="ue-val" style="color: #fff;">S/. 25 - 45</div>
              <div class="ue-lbl">Margen Neto / Familia / Mes</div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Mecánica del Dolor:</strong> El adulto mayor no puede suspender su tratamiento. El familiar sufre por olvido de compra o desabastecimiento.</span>
            </div>
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Ventaja de Ayni Care:</strong> La app sabe la fecha exacta de agotamiento porque el cuidador registra cada dosis diaria administrada en tiempo real.</span>
            </div>
          </div>
        </div>

        <!-- Modelo 2 -->
        <div class="model-card" style="border-color: rgba(139, 92, 246, 0.4);">
          <div style="margin-bottom: 16px;">
            <span class="model-tag tag-agency">B2B2C / Colocación & SaaS</span>
            <h3 class="model-title" style="margin-top: 10px;">🏢 Modelo 2: Agencias de Cuidadores Geriátricos</h3>
          </div>
          <p class="model-desc">
            Canal de derivación calificada para turnos formales (12h día, 12h noche, cama adentro S/. 1,800 - S/. 3,200/mes) + software B2B de supervisión de asistencia y cumplimiento de dosis con rol <code>paid_caregiver</code>.
          </p>

          <div class="unit-economics">
            <div class="ue-item">
              <div class="ue-val" style="color: #C4B5FD;">S/. 1,800 - 3,200</div>
              <div class="ue-lbl">Costo Servicio Agencia</div>
            </div>
            <div class="ue-item">
              <div class="ue-val" style="color: var(--primary-light);">S/. 250 - 350</div>
              <div class="ue-lbl">Fee de Colocación</div>
            </div>
            <div class="ue-item">
              <div class="ue-val" style="color: #fff;">S/. 35 / mes</div>
              <div class="ue-lbl">SaaS Supervisión B2B</div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Dolor de las Familias:</strong> Necesidad de personal formal verificado y con reemplazo garantizado si la cuidadora habitual falta o tiene emergencias.</span>
            </div>
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Dolor de las Agencias:</strong> Adquirir clientes calificados sin gastar fortunas en publicidad y auditar si su personal cumple con el plan de medicación en casa.</span>
            </div>
            <div class="validation-bullet">
              <i data-lucide="check-circle-2"></i>
              <span><strong>Rol Ya Desarrollado en App:</strong> El rol <code>paid_caregiver</code> permite a la cuidadora marcar dosis y notas sin ver finanzas ni gastos familiares privados.</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- SECCIÓN 3: DOLORES CRÍTICOS E INTENCIONES DETECTADAS -->
    <div id="section-verbatims" style="display: none;">
      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
          <i data-lucide="cpu" style="color: var(--primary-light);"></i>
          ¿Cómo se capturan y clasifican estos dolores?
        </div>
        <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6;">
          Esta tabla se alimenta automáticamente a través de dos fuentes en tiempo real:
          <br>
          <strong>1. Telemetría de Botones en App:</strong> Cada vez que un usuario solicita reposición de farmacia o cotización de agencia desde su celular.
          <br>
          <strong>2. Asistente con Inteligencia Artificial (Gemini):</strong> Cuando los familiares escriben en el chat o graban notas de voz sobre problemas (desabastecimiento, inasistencia de cuidadoras, reclamos de gastos), la IA detecta en segundo plano el sentimiento, nivel de urgencia y la oportunidad comercial correspondiente.
        </p>
      </div>

      ${
        realInsights.length === 0
          ? `
        <div class="empty-state">
          <i data-lucide="message-square" style="width: 44px; height: 44px; margin-bottom: 12px; color: var(--text-muted);"></i>
          <h3 style="font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 6px;">No hay dolores ni solicitudes registradas aún</h3>
          <p style="font-size: 13.5px;">Cuando las familias interactúen con los botones de la app o conversen con el asistente, aparecerán aquí clasificadas automáticamente.</p>
        </div>
      `
          : `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Categoría</th>
                <th>Registro / Mensaje Detectado</th>
                <th>Sentimiento</th>
                <th>Urgencia</th>
                <th>Intención Comercial</th>
              </tr>
            </thead>
            <tbody>
              ${realInsights
                .map(
                  (ins) => `
                <tr>
                  <td style="font-size: 12px; color: var(--text-muted); white-space: nowrap;">
                    ${new Date(ins.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <span style="font-weight: 700; color: ${
                      ins.category === 'medication'
                        ? 'var(--primary-light)'
                        : ins.category === 'caregiver_friction'
                        ? '#C4B5FD'
                        : ins.category === 'expense'
                        ? 'var(--warning)'
                        : '#94A3B8'
                    };">
                      ${ins.category}
                    </span>
                  </td>
                  <td style="max-width: 440px;">
                    <div style="font-weight: 600; color: #FFFFFF; margin-bottom: 3px;">
                      ${ins.painPointSummary || ins.messageSnippet}
                    </div>
                    ${
                      ins.painPointSummary && ins.messageSnippet !== ins.painPointSummary
                        ? `<div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">"${ins.messageSnippet}"</div>`
                        : ''
                    }
                  </td>
                  <td>
                    <span style="text-transform: capitalize; color: #CBD5E1; font-size: 12.5px;">${ins.sentiment}</span>
                  </td>
                  <td>
                    <span class="${
                      ins.urgencyLevel === 'critical'
                        ? 'tag-critical'
                        : ins.urgencyLevel === 'high'
                        ? 'tag-high'
                        : ins.urgencyLevel === 'medium'
                        ? 'tag-medium'
                        : 'tag-low'
                    }">
                      ${ins.urgencyLevel}
                    </span>
                  </td>
                  <td>
                    <strong style="color: ${
                      ins.commercialIntent === 'pharma_subscription'
                        ? 'var(--primary-light)'
                        : ins.commercialIntent === 'caregiver_hire'
                        ? '#C4B5FD'
                        : 'var(--warning)'
                    };">
                      ${ins.commercialIntent || 'N/A'}
                    </strong>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      }
    </div>

  </div>

  <script>
    lucide.createIcons();

    function switchSection(sectionId, btn) {
      const sections = ['families', 'models', 'verbatims'];
      sections.forEach(s => {
        const el = document.getElementById('section-' + s);
        if (el) el.style.display = (s === sectionId) ? 'block' : 'none';
      });

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      lucide.createIcons();
    }
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error: any) {
    res.status(500).send(`<h3>Error cargando dashboard:</h3><pre>${error.message}</pre>`);
  }
};
