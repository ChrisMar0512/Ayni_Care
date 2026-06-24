export const adminDashboardHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ayni Care | Dashboard de Administración</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            ayniGreen: {
              light: '#95D5B2',
              DEFAULT: '#2D6A4F',
              dark: '#1A4332',
              soft: '#F0F7F4'
            },
            ayniDark: '#1A2B1A',
            ayniBg: '#F8FAF8'
          },
          fontFamily: {
            sans: ['Outfit', 'sans-serif'],
          }
        }
      }
    }
  </script>
  
  <style>
    body {
      font-family: 'Outfit', sans-serif;
      background-color: #F8FAF8;
      color: #1A2B1A;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #CBD5E1;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94A3B8;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }
    .tab-active {
      border-color: #2D6A4F;
      color: #2D6A4F;
      background-color: #F0F7F4;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased">

  <!-- LOADING OVERLAY -->
  <div id="loading" class="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center transition-all duration-300">
    <div class="relative w-20 h-20">
      <div class="absolute inset-0 rounded-full border-4 border-slate-100"></div>
      <div class="absolute inset-0 rounded-full border-4 border-t-ayniGreen animate-spin"></div>
    </div>
    <h2 class="mt-6 text-xl font-semibold text-ayniDark animate-pulse">Cargando Ayni Care Dashboard...</h2>
  </div>

  <!-- NAVIGATION HEADER -->
  <header class="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="bg-ayniGreen p-2.5 rounded-xl shadow-md shadow-ayniGreen/20 flex items-center justify-center">
          <i data-lucide="heart" class="w-6 h-6 text-white animate-pulse"></i>
        </div>
        <div>
          <span class="text-xl font-bold tracking-tight text-ayniDark flex items-center">
            Ayni Care <span class="ml-2 text-xs font-semibold px-2 py-0.5 bg-ayniGreen/10 text-ayniGreen rounded-full">Admin</span>
          </span>
          <p class="text-[10px] text-slate-400">Panel de Control de Calidad</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
        <!-- SERVER STATUS INDICATOR -->
        <div class="flex items-center bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-100">
          <span class="relative flex h-2.5 w-2.5 mr-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          Servidor Activo
        </div>
        
        <!-- API URL -->
        <span class="text-xs text-slate-400 hidden sm:inline" id="apiUrlDisplay">API: http://localhost:3000</span>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-8">
    
    <!-- ERROR NOTIFICATION -->
    <div id="errorAlert" class="hidden bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl shadow-sm animate-bounce">
      <div class="flex">
        <div class="flex-shrink-0">
          <i data-lucide="alert-circle" class="h-5 w-5 text-rose-500"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm text-rose-800 font-medium" id="errorMessage"></p>
        </div>
      </div>
    </div>

    <!-- SUMMARY CARDS GRID -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      
      <!-- Users Card -->
      <div class="glass-card rounded-2xl p-6 shadow-sm flex items-center justify-between hover:translate-y-[-4px] transition-transform duration-300">
        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-400">Cuidadores Totales</p>
          <h3 class="text-3xl font-bold text-ayniDark" id="kpiUsers">0</h3>
          <p class="text-xs text-emerald-600 font-medium flex items-center">
            <i data-lucide="trending-up" class="w-3 h-3 mr-1"></i>
            Registrados en el sistema
          </p>
        </div>
        <div class="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
          <i data-lucide="users" class="w-8 h-8"></i>
        </div>
      </div>

      <!-- Families Card -->
      <div class="glass-card rounded-2xl p-6 shadow-sm flex items-center justify-between hover:translate-y-[-4px] transition-transform duration-300">
        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-400">Familias Activas</p>
          <h3 class="text-3xl font-bold text-ayniDark" id="kpiFamilies">0</h3>
          <p class="text-xs text-sky-600 font-medium flex items-center">
            <i data-lucide="home" class="w-3 h-3 mr-1"></i>
            Grupos coordinados
          </p>
        </div>
        <div class="bg-sky-50 p-4 rounded-2xl text-sky-600">
          <i data-lucide="home" class="w-8 h-8"></i>
        </div>
      </div>

      <!-- Elderly Card -->
      <div class="glass-card rounded-2xl p-6 shadow-sm flex items-center justify-between hover:translate-y-[-4px] transition-transform duration-300">
        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-400">Adultos Mayores</p>
          <h3 class="text-3xl font-bold text-ayniDark" id="kpiElderly">0</h3>
          <p class="text-xs text-indigo-600 font-medium flex items-center">
            <i data-lucide="heart-handshake" class="w-3 h-3 mr-1"></i>
            Recibiendo cuidados
          </p>
        </div>
        <div class="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
          <i data-lucide="heart" class="w-8 h-8"></i>
        </div>
      </div>

      <!-- Operations Card -->
      <div class="glass-card rounded-2xl p-6 shadow-sm flex items-center justify-between hover:translate-y-[-4px] transition-transform duration-300">
        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-400">Logs de Actividad</p>
          <h3 class="text-3xl font-bold text-ayniDark" id="kpiLogs">0</h3>
          <p class="text-xs text-amber-600 font-medium flex items-center">
            <i data-lucide="activity" class="w-3 h-3 mr-1"></i>
            Acciones registradas
          </p>
        </div>
        <div class="bg-amber-50 p-4 rounded-2xl text-amber-600">
          <i data-lucide="activity" class="w-8 h-8"></i>
        </div>
      </div>

    </div>

    <!-- TABS NAVIGATION -->
    <div class="border-b border-slate-200">
      <nav class="flex space-x-8" aria-label="Tabs">
        <button onclick="switchTab('analytics')" id="tabBtn-analytics" class="tab-active py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200 rounded-t-xl">
          <i data-lucide="line-chart" class="w-4 h-4"></i>
          <span>Resumen y Analítica</span>
        </button>
        <button onclick="switchTab('users')" id="tabBtn-users" class="py-4 px-4 border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium text-sm flex items-center space-x-2 transition-all duration-200 rounded-t-xl">
          <i data-lucide="users" class="w-4 h-4"></i>
          <span>Directorio de Usuarios</span>
        </button>
        <button onclick="switchTab('families')" id="tabBtn-families" class="py-4 px-4 border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium text-sm flex items-center space-x-2 transition-all duration-200 rounded-t-xl">
          <i data-lucide="home" class="w-4 h-4"></i>
          <span>Familias & Cuidado</span>
        </button>
      </nav>
    </div>

    <!-- VIEW 1: ANALYTICS & FEED -->
    <div id="view-analytics" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Charts Block -->
      <div class="lg:col-span-2 space-y-8">
        
        <!-- Timeline Chart Card -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-bold text-ayniDark text-lg flex items-center">
              <i data-lucide="trending-up" class="w-5 h-5 mr-2 text-ayniGreen"></i>
              Uso de la Plataforma (Últimos 14 días)
            </h4>
            <span class="text-xs text-slate-400">Total de eventos completados por día</span>
          </div>
          <div class="h-80 relative">
            <canvas id="timelineChart"></canvas>
          </div>
        </div>

        <!-- Role distribution & specific stats card -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Role Distribution Pie -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
            <h4 class="font-bold text-ayniDark text-base flex items-center mb-4">
              <i data-lucide="pie-chart" class="w-5 h-5 mr-2 text-indigo-600"></i>
              Roles de Cuidadores
            </h4>
            <div class="h-60 relative flex-grow flex items-center justify-center">
              <canvas id="rolesChart"></canvas>
            </div>
          </div>

          <!-- Secondary stats details -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h4 class="font-bold text-ayniDark text-base flex items-center">
              <i data-lucide="database" class="w-5 h-5 mr-2 text-amber-600"></i>
              Desglose de Base de Datos
            </h4>
            <div class="divide-y divide-slate-100 text-sm">
              <div class="py-3 flex justify-between">
                <span class="text-slate-500">Medicamentos Configurados</span>
                <span class="font-bold text-slate-800" id="statMeds">0</span>
              </div>
              <div class="py-3 flex justify-between">
                <span class="text-slate-500">Tomas de Medicación</span>
                <span class="font-bold text-slate-800" id="statMedLogs">0</span>
              </div>
              <div class="py-3 flex justify-between">
                <span class="text-slate-500">Actividades Totales</span>
                <span class="font-bold text-slate-800" id="statAct">0</span>
              </div>
              <div class="py-3 flex justify-between">
                <span class="text-slate-500">Tareas Completadas</span>
                <span class="font-bold text-slate-800" id="statActLogs">0</span>
              </div>
              <div class="py-3 flex justify-between">
                <span class="text-slate-500">Notas de Turno</span>
                <span class="font-bold text-slate-800" id="statNotes">0</span>
              </div>
              <div class="py-3 flex justify-between">
                <span class="text-slate-500">Gastos Compartidos</span>
                <span class="font-bold text-slate-800" id="statExpenses">0</span>
              </div>
              <div class="py-3 flex justify-between">
                <span class="text-slate-500">Citas Médicas Agendadas</span>
                <span class="font-bold text-slate-800" id="statAppts">0</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- Live Activity Feed Block -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-14rem)] sticky top-24">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h4 class="font-bold text-ayniDark text-lg flex items-center">
            <i data-lucide="zap" class="w-5 h-5 mr-2 text-amber-500 animate-pulse"></i>
            Actividad Reciente
          </h4>
          <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">En Vivo</span>
        </div>
        
        <div class="flex-grow overflow-y-auto custom-scrollbar pr-1 space-y-4" id="activityFeed">
          <!-- Feed items will be injected here -->
          <div class="text-center py-8 text-slate-400 text-sm">Cargando feed de actividad...</div>
        </div>
      </div>

    </div>

    <!-- VIEW 2: USER DIRECTORY -->
    <div id="view-users" class="hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
      
      <!-- User Directory Search & Filters -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 class="font-bold text-ayniDark text-lg">Directorio de Cuidadores</h4>
          <p class="text-xs text-slate-400">Listado de personas registradas en las redes familiares de Ayni Care</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3.5"></i>
            <input type="text" id="searchUser" oninput="filterUsers()" placeholder="Buscar usuario (nombre, correo)..." class="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ayniGreen focus:border-transparent w-full sm:w-64">
          </div>
          <select id="filterRole" onchange="filterUsers()" class="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ayniGreen text-slate-600">
            <option value="">Todos los Roles</option>
            <option value="primary_caregiver">Cuidador Principal</option>
            <option value="remote_family">Familiar Remoto</option>
            <option value="weekend_helper">Ayudante de Fin de Semana</option>
            <option value="paid_caregiver">Cuidador Pagado</option>
          </select>
        </div>
      </div>

      <!-- User Directory Table -->
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th class="py-3 px-4">Nombre / Email</th>
              <th class="py-3 px-4">Teléfono</th>
              <th class="py-3 px-4">Rol</th>
              <th class="py-3 px-4">Familia / Adulto Mayor</th>
              <th class="py-3 px-4">Fecha de Registro</th>
              <th class="py-3 px-4 text-center">Score de Actividad</th>
              <th class="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody id="usersTableBody" class="divide-y divide-slate-50 text-sm text-slate-700">
            <!-- Dynamic rows will be injected here -->
          </tbody>
        </table>
      </div>

    </div>

    <!-- VIEW 3: FAMILIES & CARE -->
    <div id="view-families" class="hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
      
      <!-- Family Directory Search -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 class="font-bold text-ayniDark text-lg">Familias y Redes de Cuidado</h4>
          <p class="text-xs text-slate-400">Grupos familiares coordinando el cuidado de adultos mayores</p>
        </div>
        <div class="relative">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3.5"></i>
          <input type="text" id="searchFamily" oninput="filterFamilies()" placeholder="Buscar por familia o paciente..." class="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ayniGreen focus:border-transparent w-full sm:w-64">
        </div>
      </div>

      <!-- Family Directory Table -->
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th class="py-3 px-4">Familia</th>
              <th class="py-3 px-4">Adulto Mayor</th>
              <th class="py-3 px-4">Condiciones Médicas</th>
              <th class="py-3 px-4 text-center">Miembros</th>
              <th class="py-3 px-4 text-center">Medicamentos</th>
              <th class="py-3 px-4 text-center">Actividades</th>
              <th class="py-3 px-4 text-center">Citas</th>
              <th class="py-3 px-4 text-center">Gastos</th>
              <th class="py-3 px-4 text-center">Notas</th>
              <th class="py-3 px-4">Creada el</th>
            </tr>
          </thead>
          <tbody id="familiesTableBody" class="divide-y divide-slate-50 text-sm text-slate-700">
            <!-- Dynamic rows will be injected here -->
          </tbody>
        </table>
      </div>

    </div>

  </main>

  <!-- FOOTER -->
  <footer class="bg-white border-t border-slate-100 py-6 mt-8 flex-shrink-0">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
      <p>&copy; 2026 Ayni Care. Panel de Administración de pruebas internas.</p>
      <p class="mt-2 sm:mt-0 flex items-center">
        Hecho con <i data-lucide="heart" class="w-3.5 h-3.5 mx-1 text-red-500 fill-current"></i> para familias de Latinoamérica
      </p>
    </div>
  </footer>

  <!-- SCRIPT LOGIC -->
  <script>
    // Global data references
    let apiData = null;
    let timelineChartRef = null;
    let rolesChartRef = null;

    // Get security token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || '';

    // Humanize user roles helper
    const roleMapping = {
      'primary_caregiver': { name: 'Cuidador Principal', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      'remote_family': { name: 'Familiar Remoto', color: 'bg-sky-100 text-sky-800 border-sky-200' },
      'weekend_helper': { name: 'Ayudante FDS', color: 'bg-amber-100 text-amber-800 border-amber-200' },
      'paid_caregiver': { name: 'Cuidador Pagado', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
    };

    function getRoleLabel(role) {
      const config = roleMapping[role] || { name: role || 'Desconocido', color: 'bg-slate-100 text-slate-800 border-slate-200' };
      return \`<span class="px-2 py-0.5 rounded-full text-xs font-medium border \${config.color}">\${config.name}</span>\`;
    }

    // Relative date humanizer
    function getRelativeTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return 'Hace un momento';
      
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return \`Hace \${diffMins} min\`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return \`Hace \${diffHours} h\`;
      
      // Default formatted date
      return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    // Main initial fetch
    async function init() {
      try {
        const port = window.location.port || '3000';
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const apiBase = \`\${protocol}//\${hostname}\${port ? ':' + port : ''}\`;
        
        document.getElementById('apiUrlDisplay').textContent = \`API: \${apiBase}\`;

        const response = await fetch(\`\${apiBase}/admin/api/admin/stats?token=\${token}\`);
        const json = await response.json();

        if (!json.success) {
          throw new Error(json.error || 'No se pudieron cargar las estadísticas.');
        }

        apiData = json.data;
        
        // Load UI
        renderSummary(apiData.summary);
        renderCharts(apiData.timeline, apiData.roleDistribution);
        renderActivityFeed(apiData.recentActivity);
        renderUsersTable(apiData.users);
        renderFamiliesTable(apiData.families);

        // Hide loading
        const loader = document.getElementById('loading');
        loader.classList.add('opacity-0');
        setTimeout(() => loader.classList.add('hidden'), 300);

      } catch (err) {
        console.error(err);
        document.getElementById('errorMessage').textContent = err.message || 'Error de conexión con el backend.';
        document.getElementById('errorAlert').classList.remove('hidden');
        
        // Hide loading screen
        const loader = document.getElementById('loading');
        loader.classList.add('opacity-0');
        setTimeout(() => loader.classList.add('hidden'), 300);
      }
    }

    // Render KPI values
    function renderSummary(summary) {
      document.getElementById('kpiUsers').textContent = summary.totalUsers;
      document.getElementById('kpiFamilies').textContent = summary.totalFamilies;
      document.getElementById('kpiElderly').textContent = summary.totalElderly;
      // Activity counts represents total actions (activity logs + medication logs)
      const totalLogs = summary.totalActivityLogs + summary.totalMedLogs + summary.totalExpenses + summary.totalNotes;
      document.getElementById('kpiLogs').textContent = totalLogs;

      // Secondary details
      document.getElementById('statMeds').textContent = summary.totalMedications;
      document.getElementById('statMedLogs').textContent = summary.totalMedLogs;
      document.getElementById('statAct').textContent = summary.totalActivities;
      document.getElementById('statActLogs').textContent = summary.totalActivityLogs;
      document.getElementById('statNotes').textContent = summary.totalNotes;
      document.getElementById('statExpenses').textContent = summary.totalExpenses;
      document.getElementById('statAppts').textContent = summary.totalAppointments;
    }

    // Render Charts using ChartJS
    function renderCharts(timeline, roleDist) {
      // 1. Timeline Line Chart
      const timelineCtx = document.getElementById('timelineChart').getContext('2d');
      const dates = timeline.map(t => {
        const [y, m, d] = t.date.split('-');
        return \`\${d}/\${m}\`;
      });
      const activitiesData = timeline.map(t => t.activities);
      const medicationsData = timeline.map(t => t.medications);

      timelineChartRef = new Chart(timelineCtx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Actividades Completadas',
              data: activitiesData,
              borderColor: '#2D6A4F',
              backgroundColor: 'rgba(45, 106, 79, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              fill: true,
            },
            {
              label: 'Tomas de Medicamento',
              data: medicationsData,
              borderColor: '#6366F1',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              fill: true,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { family: 'Outfit', size: 12 }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      });

      // 2. Roles Doughnut Chart
      const rolesCtx = document.getElementById('rolesChart').getContext('2d');
      const roleKeys = Object.keys(roleDist);
      const roleLabels = roleKeys.map(k => roleMapping[k]?.name || k);
      const roleCounts = Object.values(roleDist);

      const colors = ['#2D6A4F', '#38BDF8', '#F59E0B', '#6366F1'];

      rolesChartRef = new Chart(rolesCtx, {
        type: 'doughnut',
        data: {
          labels: roleLabels,
          datasets: [{
            data: roleCounts,
            backgroundColor: colors.slice(0, roleKeys.length),
            borderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: 'Outfit', size: 11 },
                boxWidth: 12
              }
            }
          },
          cutout: '60%'
        }
      });
    }

    // Render Recent Activity timeline feed
    function renderActivityFeed(activities) {
      const feed = document.getElementById('activityFeed');
      feed.innerHTML = '';

      if (activities.length === 0) {
        feed.innerHTML = \`<div class="text-center py-12 text-slate-400 text-sm">No hay registros de actividad todavía.</div>\`;
        return;
      }

      activities.forEach((act, index) => {
        let typeIcon = 'activity';
        let colorClasses = 'bg-emerald-50 text-emerald-600';
        let borderClass = 'border-emerald-100';

        if (act.type === 'medication') {
          typeIcon = 'pill';
          colorClasses = act.title.includes('Omitió') ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600';
          borderClass = act.title.includes('Omitió') ? 'border-rose-100' : 'border-indigo-100';
        } else if (act.type === 'expense') {
          typeIcon = 'dollar-sign';
          colorClasses = 'bg-amber-50 text-amber-600';
          borderClass = 'border-amber-100';
        } else if (act.type === 'note') {
          typeIcon = 'file-text';
          colorClasses = 'bg-sky-50 text-sky-600';
          borderClass = 'border-sky-100';
        }

        const item = document.createElement('div');
        item.className = \`p-4 rounded-2xl bg-white border \${borderClass} flex items-start space-x-3 shadow-sm hover:shadow transition-shadow duration-200\`;
        item.innerHTML = \`
          <div class="p-2 rounded-xl \${colorClasses} flex-shrink-0">
            <i data-lucide="\${typeIcon}" class="w-4 h-4"></i>
          </div>
          <div class="flex-grow min-w-0">
            <p class="text-xs text-slate-400 flex items-center justify-between mb-1">
              <span class="font-semibold text-slate-700 hover:underline cursor-pointer">\${act.user}</span>
              <span>\${getRelativeTime(act.timestamp)}</span>
            </p>
            <h5 class="text-sm font-bold text-slate-800 truncate">\${act.title}</h5>
            <p class="text-xs text-slate-500 mt-1 italic">\${act.description}</p>
            <div class="flex items-center space-x-2 mt-2">
              <span class="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded border border-slate-100">\${act.family}</span>
              <span class="text-[10px] text-slate-400 capitalize">\${act.userRole.replace('_', ' ')}</span>
            </div>
          </div>
        \`;
        feed.appendChild(item);
      });

      lucide.createIcons();
    }

    // Render users list in the table
    function renderUsersTable(usersList) {
      const tbody = document.getElementById('usersTableBody');
      tbody.innerHTML = '';

      if (usersList.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="7" class="py-8 text-center text-slate-400">No se encontraron usuarios.</td></tr>\`;
        return;
      }

      usersList.forEach(user => {
        const dateStr = new Date(user.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors duration-150';
        tr.innerHTML = \`
          <td class="py-4 px-4">
            <div class="font-bold text-slate-800">\${user.name}</div>
            <div class="text-xs text-slate-400">\${user.email || 'Sin email'}</div>
          </td>
          <td class="py-4 px-4 text-xs font-mono text-slate-500">\${user.phone || '-'}</td>
          <td class="py-4 px-4">\${getRoleLabel(user.role)}</td>
          <td class="py-4 px-4">
            <div class="font-medium text-slate-700">\${user.familyName}</div>
            <div class="text-xs text-slate-400">Adulto: \&ldquo;\${user.elderlyName}\&rdquo;</div>
          </td>
          <td class="py-4 px-4 text-slate-500 text-xs">\${dateStr}</td>
          <td class="py-4 px-4 text-center">
            <span class="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">\${user.activityScore}</span>
          </td>
          <td class="py-4 px-4 text-center">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold \${user.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}">
              \${user.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    // Render families list in table
    function renderFamiliesTable(familiesList) {
      const tbody = document.getElementById('familiesTableBody');
      tbody.innerHTML = '';

      if (familiesList.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="10" class="py-8 text-center text-slate-400">No se encontraron familias.</td></tr>\`;
        return;
      }

      familiesList.forEach(fam => {
        const dateStr = new Date(fam.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        let conditionsPills = fam.elderlyConditions.map(c => 
          \`<span class="inline-block text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md mr-1 mb-1 font-medium">\${c}</span>\`
        ).join('');
        
        if (fam.elderlyConditions.length === 0) {
          conditionsPills = '<span class="text-xs text-slate-300">Ninguna registrada</span>';
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors duration-150';
        tr.innerHTML = \`
          <td class="py-4 px-4 font-bold text-slate-800">\${fam.name}</td>
          <td class="py-4 px-4 font-medium text-slate-700">\${fam.elderlyName}</td>
          <td class="py-4 px-4 max-w-xs">\${conditionsPills}</td>
          <td class="py-4 px-4 text-center font-semibold text-slate-700">\${fam.memberCount}</td>
          <td class="py-4 px-4 text-center text-slate-500">\${fam.medicationCount}</td>
          <td class="py-4 px-4 text-center text-slate-500">\${fam.activityCount}</td>
          <td class="py-4 px-4 text-center text-slate-500">\${fam.appointmentCount}</td>
          <td class="py-4 px-4 text-center text-slate-500">\${fam.expenseCount}</td>
          <td class="py-4 px-4 text-center text-slate-500">\${fam.noteCount}</td>
          <td class="py-4 px-4 text-xs text-slate-400 font-medium">\${dateStr}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    // Tab switcher
    function switchTab(tabId) {
      const views = ['analytics', 'users', 'families'];
      views.forEach(v => {
        const viewEl = document.getElementById(\`view-\${v}\`);
        const btnEl = document.getElementById(\`tabBtn-\${v}\`);
        if (v === tabId) {
          viewEl.classList.remove('hidden');
          btnEl.className = 'tab-active py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200 rounded-t-xl';
        } else {
          viewEl.classList.add('hidden');
          btnEl.className = 'py-4 px-4 border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium text-sm flex items-center space-x-2 transition-all duration-200 rounded-t-xl';
        }
      });
    }

    // Live search users
    function filterUsers() {
      if (!apiData) return;
      const query = document.getElementById('searchUser').value.toLowerCase().trim();
      const roleFilter = document.getElementById('filterRole').value;
      
      const filtered = apiData.users.filter(u => {
        const matchesQuery = u.name.toLowerCase().includes(query) || 
                             (u.email && u.email.toLowerCase().includes(query)) ||
                             u.familyName.toLowerCase().includes(query) ||
                             u.elderlyName.toLowerCase().includes(query);
        const matchesRole = !roleFilter || u.role === roleFilter;
        return matchesQuery && matchesRole;
      });
      
      renderUsersTable(filtered);
    }

    // Live search families
    function filterFamilies() {
      if (!apiData) return;
      const query = document.getElementById('searchFamily').value.toLowerCase().trim();
      
      const filtered = apiData.families.filter(f => {
        return f.name.toLowerCase().includes(query) || 
               f.elderlyName.toLowerCase().includes(query) ||
               f.elderlyConditions.some(c => c.toLowerCase().includes(query));
      });
      
      renderFamiliesTable(filtered);
    }

    // Auto load on start
    window.addEventListener('DOMContentLoaded', () => {
      init();
    });
  </script>
</body>
</html>
`;
