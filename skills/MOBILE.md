# Ayni Care — Skill Mobile

## Stack exacto
- React Native + Expo SDK 51+ (TypeScript)
- React Navigation v6 (Stack + Tab navigator)
- Zustand (estado global del cliente)
- React Query / @tanstack/react-query v5 (fetching, caché, mutaciones)
- NativeWind v4 (clases Tailwind en React Native)
- Expo Notifications (push notifications)
- Expo SecureStore (guardar tokens de forma segura)
- date-fns (manejo de fechas, ya instalado)

## Estructura de carpetas (apps/mobile/src/)

```
screens/
├── auth/
│   ├── LoginScreen.tsx
│   └── OTPScreen.tsx
├── home/
│   └── HomeScreen.tsx          # Resumen del día
├── activities/
│   ├── ActivitiesScreen.tsx    # Lista de actividades / checklist
│   └── ActivityDetailScreen.tsx
├── medications/
│   ├── MedicationsScreen.tsx
│   └── AddMedicationScreen.tsx
├── appointments/
│   ├── AppointmentsScreen.tsx
│   └── AddAppointmentScreen.tsx
├── expenses/
│   ├── ExpensesScreen.tsx
│   └── AddExpenseScreen.tsx
├── notes/
│   └── NotesScreen.tsx
└── family/
    └── FamilyScreen.tsx        # Miembros y asignación de responsabilidades

components/
├── common/
│   ├── Button.tsx              # Botón reutilizable (mínimo 48px altura)
│   ├── Input.tsx               # Input reutilizable
│   ├── Card.tsx                # Card base
│   ├── EmptyState.tsx          # Estado vacío genérico
│   └── LoadingSpinner.tsx
├── activities/
│   └── ActivityCard.tsx
├── medications/
│   └── MedCard.tsx
└── ...

stores/
├── authStore.ts                # Usuario autenticado, familyId, role
├── familyStore.ts              # Datos de la familia y adulto mayor
└── uiStore.ts                  # Estado UI (modales abiertos, etc.)

hooks/
├── useActivities.ts            # React Query hooks para actividades
├── useMedications.ts
├── useAppointments.ts
├── useExpenses.ts
├── useNotes.ts
└── useRealtime.ts              # Suscripción a eventos realtime de Supabase

services/
└── api.ts                      # Cliente axios/fetch con baseURL + interceptor de auth

navigation/
├── AppNavigator.tsx            # Root navigator (auth vs app)
├── TabNavigator.tsx            # Bottom tabs
└── types.ts                    # Tipos de RootStackParamList
```

## Navegación — Estructura de tabs

```
Tab Navigator (Bottom)
├── 🏠 Inicio          → HomeScreen (resumen del día)
├── ✅ Actividades     → ActivitiesScreen (checklist)
├── 💊 Medicamentos    → MedicationsScreen
├── 📅 Agenda          → AppointmentsScreen
└── 👥 Familia         → FamilyScreen (miembros, gastos, notas)
```

## Convenciones de código

### Componentes
```tsx
// Siempre functional components con TypeScript props tipadas
// Nombre del archivo = PascalCase (ActivityCard.tsx)

interface ActivityCardProps {
  activity: Activity;
  onComplete: (id: string) => void;
}

export const ActivityCard = ({ activity, onComplete }: ActivityCardProps) => {
  return (
    <Pressable
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
      onPress={() => onComplete(activity.id)}
    >
      <Text className="text-base font-medium text-gray-900">{activity.title}</Text>
    </Pressable>
  );
};
```

### React Query hooks — Patrón estándar
```typescript
// hooks/useActivities.ts
export const useActivities = () => {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => api.get('/activities').then(r => r.data.data),
    staleTime: 1000 * 60, // 1 minuto
  });
};

export const useCompleteActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/activities/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};
```

### Zustand store — Patrón estándar
```typescript
// stores/authStore.ts
interface AuthStore {
  user: User | null;
  familyId: string | null;
  role: MemberRole | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  familyId: null,
  role: null,
  setUser: (user) => set({ user, familyId: user.familyId, role: user.role }),
  logout: () => set({ user: null, familyId: null, role: null }),
}));
```

## Reglas de diseño y accesibilidad

```
OBLIGATORIO:
- Botones y elementos táctiles: mínimo 48x48px (usar minHeight: 48 o h-12 en NativeWind)
- Texto principal: mínimo 16px (text-base en NativeWind)
- Texto secundario: mínimo 14px (text-sm)
- Usar Pressable sobre TouchableOpacity (mejor feedback visual)
- Todo texto de UI en español

COLORES (paleta Ayni Care):
- Verde principal: #2D6A4F (familiaridad, naturaleza, cuidado)
- Verde claro: #95D5B2 (accents, iconos)
- Fondo: #F8FAF8
- Texto principal: #1A2B1A
- Texto secundario: #6B7C6B
- Error: #E63946
- Éxito: #52B788

ÍCONOS: Usar @expo/vector-icons (Ionicons o MaterialCommunityIcons)
```

## Manejo de estados de pantalla

Toda screen que fetcha datos debe manejar 3 estados:
```tsx
const { data, isLoading, error } = useActivities();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorState onRetry={refetch} />;
if (!data?.length) return <EmptyState message="No hay actividades hoy" />;

return <FlatList data={data} ... />;
```

## Offline tolerance
- React Query cachea automáticamente → si no hay red, muestra data anterior
- NO mostrar pantallas en blanco si no hay conexión
- Mostrar un banner sutil de "Sin conexión — mostrando datos guardados"

## Reglas que NUNCA romper en mobile
- Nunca guardar tokens en AsyncStorage (usar Expo SecureStore)
- Nunca hacer fetch directo, siempre usar el cliente `api.ts` que ya tiene el header de auth
- Nunca hardcodear la URL del backend (usar EXPO_PUBLIC_API_URL)
- Siempre manejar los 3 estados: loading / error / data
- Nunca mutar el estado de React Query directamente, usar `invalidateQueries` en `onSuccess`
