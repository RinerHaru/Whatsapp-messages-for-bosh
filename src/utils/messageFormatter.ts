import { Contact, TemplateConfig } from '../types';

export const DEFAULT_TEMPLATE =
  '¡Hola {nombre}! 👋 Te avisamos que tu pedido {pedido} ya está listo para ser retirado. Nuestro horario de atención es de {horario}. ¡Te esperamos en {tienda}!';

export function formatMessage(
  template: string,
  contact: Contact,
  config: Partial<TemplateConfig> = {}
): string {
  let message = template;

  const replacements: Record<string, string> = {
    '{nombre}': contact.nombre || 'estimado/a cliente',
    '{name}': contact.nombre || 'estimado/a cliente',
    '{cliente}': contact.nombre || 'estimado/a cliente',
    '{pedido}': contact.pedido || '#000',
    '{order}': contact.pedido || '#000',
    '{horario}': config.horario || 'Lunes a Viernes de 09:00 a 18:00',
    '{tienda}': config.tienda || 'nuestro local',
    '{telefono}': contact.telefono || '',
  };

  // Reemplazos de datos adicionales del CSV si existen
  if (contact.datosExtra) {
    for (const [key, value] of Object.entries(contact.datosExtra)) {
      replacements[`{${key}}`] = value || '';
      replacements[`{${key.toLowerCase()}}`] = value || '';
    }
  }

  for (const [placeholder, val] of Object.entries(replacements)) {
    // Reemplazo insensible a mayúsculas y global
    const regex = new RegExp(escapeRegExp(placeholder), 'gi');
    message = message.replace(regex, val);
  }

  return message;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
