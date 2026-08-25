export const formatTextForWhatsApp = (text: string): string => {
  if (!text) return '';

  return text
    // 1. Convertir negritas markdown (**texto**) a negritas WhatsApp (*texto*)
    .replace(/\*\*([^*\n]+)\*\*/g, '*$1*')
    // 2. Convertir encabezados markdown (### Título) a negrita WhatsApp (*Título*)
    .replace(/^#{1,6}\s*(.+)$/gm, '*$1*')
    // 3. Convertir viñetas markdown (* o -) al inicio de línea a viñeta limpia (•)
    .replace(/^([ \t]*)[*\-][ \t]+/gm, '$1• ')
    // 4. Limpiar combinaciones raras generadas por markdown mixto (ej. • * o * •)
    .replace(/•\s*\*/g, '• *')
    // 5. Eliminar dobles asteriscos residuales
    .replace(/\*\*/g, '')
    .trim();
};

const sample = `Hola, Christian. ¡Claro que sí! Te cuento lo que tenemos programado para el abuelo Lucho hoy, martes 25 de agosto:

**Medicinas para hoy:**
* **Omeprazol 20mg** (1 cápsula) - Programado a las **7:30 AM** (pendiente de confirmar).
* **Losartán 50mg** (1 comprimido) - Programado a las **8:00 AM** (pendiente) y le toca otra vez a las **8:00 PM**.
* **Metformina 850mg** (1 comprimido) - Le toca a la **1:00 PM** (con el almuerzo).
* **Atorvastatina 20mg** (1 comprimido) - Le toca a las **9:00 PM**.
* Nota: El **Paracetamol 500mg** figura como tomado/completado.

**Tareas y Actividades:**
* No hay tareas de cuidado (como baños o paseos) ni citas médicas registradas para hoy.

¿Me confirmas si ya le diste sus pastillas de la mañana para registrarlas de una vez?`;

console.log('--- PERFECTION TEST ---');
console.log(formatTextForWhatsApp(sample));
