# Ayni Care — Skill DevOps

## Estrategia de branches

```
main         ← producción (solo merges desde develop, nunca commits directos)
develop      ← integración (aquí se mergean los features terminados)
feature/*    ← una por feature (feature/medications, feature/expenses, etc.)
fix/*        ← correcciones de bugs (fix/login-otp-timeout)
```

### Reglas
- Nunca hacer push directo a `main` ni a `develop`
- Toda feature se trabaja en su branch y se mergea via PR
- PRs a `develop` requieren que los tests pasen (CI)
- PRs a `main` requieren review de al menos 1 persona

### Flujo
```
1. git checkout develop
2. git pull origin develop
3. git checkout -b feature/nombre-del-feature
4. ... desarrollo ...
5. git push origin feature/nombre-del-feature
6. Crear PR → develop
7. CI corre tests → review → merge
8. Cuando develop está estable → PR a main → deploy
```

---

## Convenciones de Git

### Formato de commits (Conventional Commits)
```
tipo(dominio): descripción breve en español

Tipos válidos:
  feat     → nueva funcionalidad
  fix      → corrección de bug
  refactor → mejora interna sin cambio de comportamiento
  docs     → solo documentación
  test     → agregar o corregir tests
  chore    → mantenimiento (deps, config, CI)

Dominios válidos:
  auth, family, activities, medications, appointments, expenses, notes
  mobile, backend, shared, infra
```

### Ejemplos
```bash
feat(medications): agregar endpoint POST /api/medications
fix(auth): corregir timeout en verificación OTP
refactor(backend): extraer lógica de broadcast a servicio
test(activities): agregar tests de autorización por rol
docs(skills): agregar skill de seguridad
chore(infra): configurar GitHub Actions para CI
```

### Reglas de commits
- Mensajes en español (consistente con el resto del proyecto)
- Descripción breve (máximo 72 caracteres en la primera línea)
- Si necesita más detalle, agregar cuerpo separado por línea vacía
- Un commit = un cambio lógico (no mezclar features)

---

## GitHub Actions — CI

### Workflow para PRs
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [develop, main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm test

  mobile-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

### Lo que bloquea un merge
- Tests fallando
- Errores de lint (TypeScript estricto)
- `any` en el código

---

## Deploy del backend

### Plataforma: Railway (recomendado) o Render

### Configuración en Railway
```
1. Conectar repo de GitHub
2. Seleccionar branch: main
3. Root directory: apps/backend
4. Build command: npm ci && npx prisma generate && npm run build
5. Start command: npm start
6. Agregar variables de entorno (ver sección abajo)
```

### Configuración en Render
```
1. New Web Service → conectar repo
2. Root directory: apps/backend
3. Build command: npm ci && npx prisma generate && npm run build
4. Start command: node dist/index.js
5. Environment: Node
6. Agregar variables de entorno
```

---

## Deploy del mobile

### Expo (EAS Build)
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar el proyecto
eas build:configure

# Build para preview (testing interno)
eas build --platform all --profile preview

# Build para producción (submit a stores)
eas build --platform all --profile production
eas submit --platform all
```

### Perfiles de build (eas.json)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {}
  }
}
```

---

## Variables de entorno por ambiente

### Backend

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `NODE_ENV` | development | staging | production |
| `PORT` | 3000 | 3000 | (asignado por Railway) |
| `DATABASE_URL` | Local o Supabase dev | Supabase staging | Supabase production |
| `SUPABASE_URL` | Proyecto dev | Proyecto staging | Proyecto production |
| `SUPABASE_ANON_KEY` | Key dev | Key staging | Key production |
| `SUPABASE_SERVICE_ROLE_KEY` | Key dev | Key staging | Key production |
| `RESEND_API_KEY` | Test key | Test key | Production key |
| `FROM_EMAIL` | test@aynicare.com | test@aynicare.com | hola@aynicare.com |
| `JWT_SECRET` | dev-secret-32chars | staging-secret | production-secret-64chars |

### Mobile

| Variable | Dev | Production |
|----------|-----|------------|
| `EXPO_PUBLIC_API_URL` | http://localhost:3000 | https://api.aynicare.com |
| `EXPO_PUBLIC_SUPABASE_URL` | Proyecto dev | Proyecto production |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Key dev | Key production |

### Reglas de env vars
- NUNCA commitear archivos `.env` (están en `.gitignore`)
- Mantener `.env.example` actualizado con todas las keys necesarias (sin valores reales)
- En producción: configurar las variables directamente en Railway/Render
- `SERVICE_ROLE_KEY` solo vive en el backend, NUNCA en el mobile

---

## Checklist pre-deploy a producción

- [ ] Todos los tests pasan en CI
- [ ] No hay `console.log` olvidados (solo logger en producción)
- [ ] Variables de entorno de producción configuradas en Railway/Render
- [ ] `NODE_ENV=production` seteado
- [ ] Migraciones de Prisma aplicadas (`prisma migrate deploy`)
- [ ] Rate limiting activo
- [ ] CORS configurado solo para dominios permitidos
- [ ] Seed de datos de prueba NO se ejecuta en producción
- [ ] SSL/HTTPS habilitado (Railway lo da automáticamente)
- [ ] Checklist de seguridad de `skills/SECURITY.md` revisada
