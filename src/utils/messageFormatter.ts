import { Contact, TemplateConfig } from '../types';

export const DEFAULT_TEMPLATE =
  '¡Hola {nombre}! 👋 Te avisamos que tu pedido {pedido} ya está listo para ser despachado/retirado. ¡Te esperamos en {tienda}!';

/**
 * Reemplaza variables en la plantilla de mensaje de WhatsApp.
 * Garantiza que las variables estándar ({nombre}, {pedido}, {telefono})
 * NUNCA sean sobreescritas por columnas de la planilla que compartan nombres similares.
 */
export function formatMessage(
  template: string,
  contact: Contact,
  config: Partial<TemplateConfig> = {}
): string {
  let message = template;

  const clean = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 1. Reemplazos de columnas dinámicas del CSV (datosExtra)
  if (contact.datosExtra) {
    const extraReplacements: Record<string, string> = {};

    for (const [key, rawValue] of Object.entries(contact.datosExtra)) {
      const value = rawValue || '';
      const lowerKey = key.toLowerCase().trim();
      const cleanKey = clean(key);

      // Reemplazo con el nombre exacto de la columna entre llaves
      extraReplacements[`{${key}}`] = value;

      // Reemplazo con versión limpia con guiones bajos (ej. {nro_de_remito})
      const snakeKey = cleanKey.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (snakeKey) {
        extraReplacements[`{${snakeKey}}`] = value;
      }

      // Alias inteligentes para columnas frecuentes de logística/facturación
      if (cleanKey.includes('remito')) {
        extraReplacements['{remito}'] = value;
        extraReplacements['{nro_remito}'] = value;
      }
      if (cleanKey.includes('factura')) {
        extraReplacements['{factura}'] = value;
        extraReplacements['{nro_factura}'] = value;
      }
      if (cleanKey.includes('fecha')) {
        extraReplacements['{fecha}'] = value;
        extraReplacements['{fecha_entrega}'] = value;
      }
      if (cleanKey.includes('dir') || cleanKey.includes('direccion')) {
        extraReplacements['{direccion}'] = value;
        extraReplacements['{dir}'] = value;
      }
      if (cleanKey.includes('vendedor')) {
        extraReplacements['{vendedor}'] = value;
      }

      // Si una columna se llama literalmente "Nombre" pero no es la columna mapeada del cliente,
      // la ofrecemos como {columna_nombre} o {detalle_envio} para no sobreescribir {nombre}
      if (lowerKey === 'nombre' || lowerKey === 'name') {
        extraReplacements['{columna_nombre}'] = value;
        extraReplacements['{detalle_linea}'] = value;
        extraReplacements['{tipo_envio}'] = value;
      }
    }

    // Aplicar reemplazos dinámicos que no colisionen con las palabras reservadas clave
    const reservedKeys = ['{nombre}', '{name}', '{cliente}', '{pedido}', '{order}', '{empresa}', '{telefono}', '{phone}', '{celular}', '{tienda}', '{horario}'];
    for (const [placeholder, val] of Object.entries(extraReplacements)) {
      if (!reservedKeys.includes(placeholder.toLowerCase())) {
        const regex = new RegExp(escapeRegExp(placeholder), 'gi');
        message = message.replace(regex, val);
      }
    }
  }

  // 2. Variables principales protegidas con MÁXIMA PRIORIDAD
  // Estas NUNCA pueden ser desconfiguradas por una columna secundaria
  const coreReplacements: Record<string, string> = {
    '{nombre}': contact.nombre || 'estimado/a cliente',
    '{name}': contact.nombre || 'estimado/a cliente',
    '{cliente}': contact.nombre || 'estimado/a cliente',
    '{pedido}': contact.pedido || '#000',
    '{order}': contact.pedido || '#000',
    '{empresa}': contact.empresa || config.tienda || 'nuestra empresa',
    '{horario}': config.horario || 'Lunes a Viernes de 09:00 a 18:00',
    '{tienda}': config.tienda || 'nuestro local',
    '{telefono}': contact.telefono || '',
    '{phone}': contact.telefono || '',
    '{celular}': contact.telefono || '',
  };

  for (const [placeholder, val] of Object.entries(coreReplacements)) {
    const regex = new RegExp(escapeRegExp(placeholder), 'gi');
    message = message.replace(regex, val);
  }

  return message;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
