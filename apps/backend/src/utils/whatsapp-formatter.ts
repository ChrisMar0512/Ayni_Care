/**
 * Convierte el formato markdown de Gemini/IA a la sintaxis limpia y nativa de WhatsApp
 * (Elimina dobles asteriscos, convierte viñetas a • y titulares a *negrita*)
 */
export const formatTextForWhatsApp = (text: string): string => {
  if (!text) return '';

  return text
    // 1. Convertir negritas markdown (**texto**) a negritas de WhatsApp (*texto*)
    .replace(/\*\*([^*\n]+)\*\*/g, '*$1*')
    // 2. Convertir encabezados markdown (### Título) a negritas de WhatsApp (*Título*)
    .replace(/^#{1,6}\s*(.+)$/gm, '*$1*')
    // 3. Convertir viñetas markdown (* o -) al inicio de línea a viñeta limpia (•)
    .replace(/^([ \t]*)[*\-][ \t]+/gm, '$1• ')
    // 4. Limpiar combinaciones como *• o • *
    .replace(/•\s*\*/g, '• *')
    // 5. Eliminar dobles asteriscos residuales
    .replace(/\*\*/g, '')
    .trim();
};
