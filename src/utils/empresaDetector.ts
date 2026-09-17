export type EmpresaTipo = 'Juan Construye' | 'Bosch & Cia';

export const JUAN_CONSTRUYE_PREFIXES = ['181', '417', '135', '136'] as const;
export const BOSCH_CIA_PREFIXES = ['950', '960', '301', '304', '302'] as const;

export interface EmpresaDetectionResult {
  empresa?: EmpresaTipo;
  matchedPrefix?: string;
  sourceField?: string;
}

/**
 * Analiza los primeros tres números del remito (y/o factura) para determinar a cuál empresa le pertenece:
 * - Juan Construye: 181, 417, 135, 136
 * - Bosch & Cia: 950, 960, 301, 304, 302
 */
export function detectEmpresaFromRemito(
  remito?: string | number,
  datosExtra?: Record<string, string>
): EmpresaDetectionResult {
  const checkValue = (val?: string | number, fieldName = 'remito'): EmpresaDetectionResult | undefined => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    // Extraer solo los números
    const digits = str.replace(/\D/g, '');
    if (digits.length >= 3) {
      const p3 = digits.substring(0, 3);
      if (JUAN_CONSTRUYE_PREFIXES.includes(p3 as any)) {
        return { empresa: 'Juan Construye', matchedPrefix: p3, sourceField: fieldName };
      }
      if (BOSCH_CIA_PREFIXES.includes(p3 as any)) {
        return { empresa: 'Bosch & Cia', matchedPrefix: p3, sourceField: fieldName };
      }
    }
    return undefined;
  };

  // 1. Probar con el remito/pedido principal
  const resMain = checkValue(remito, 'remito/pedido');
  if (resMain) return resMain;

  // 2. Si no dio coincidencia, buscar en columnas de datosExtra que contengan "remito"
  if (datosExtra) {
    for (const [key, val] of Object.entries(datosExtra)) {
      if (/remito/i.test(key)) {
        const res = checkValue(val, key);
        if (res) return res;
      }
    }

    // 3. Probar en columnas de factura
    for (const [key, val] of Object.entries(datosExtra)) {
      if (/factura/i.test(key)) {
        const res = checkValue(val, key);
        if (res) return res;
      }
    }

    // 4. Último intento en cualquier otra columna con "nro", "orden" o "comprobante"
    for (const [key, val] of Object.entries(datosExtra)) {
      if (/nro|orden|guia|comprobante/i.test(key)) {
        const res = checkValue(val, key);
        if (res) return res;
      }
    }
  }

  return { empresa: undefined };
}
