export type EmpresaTipo = 'Juan Construye' | 'Bosch & Cia';

// Prefijos numéricos de Remitos
export const JUAN_CONSTRUYE_REMITO_PREFIXES = ['181', '417', '135', '136', '170', '151'] as const;
export const BOSCH_CIA_REMITO_PREFIXES = ['950', '960', '301', '304', '302', '171', '751', '753', '75'] as const;

// Prefijos numéricos de Facturas
export const JUAN_CONSTRUYE_FACTURA_PREFIXES = ['131', '132', '133', '135', '136', '130', '170'] as const;
export const BOSCH_CIA_FACTURA_PREFIXES = ['301', '302', '304', '950', '960', '101', '104', '171'] as const;

// Prefijos combinados para compatibilidad
export const JUAN_CONSTRUYE_PREFIXES = [...JUAN_CONSTRUYE_REMITO_PREFIXES, ...JUAN_CONSTRUYE_FACTURA_PREFIXES];
export const BOSCH_CIA_PREFIXES = [...BOSCH_CIA_REMITO_PREFIXES, ...BOSCH_CIA_FACTURA_PREFIXES];

export interface EmpresaDetectionResult {
  empresa?: EmpresaTipo;
  matchedPrefix?: string;
  sourceField?: string;
}

/**
 * Analiza el remito, factura y datos adicionales para determinar a cuál empresa pertenece el contacto:
 * - Juan Construye:
 *   * Remitos: 181, 417, 135, 136, 170, 151
 *   * Facturas: 131, 132, 133, 135, 136, 130, 170
 * - Bosch & Cia:
 *   * Remitos: 950, 960, 301, 304, 302, 171, 75 (751, 753)
 *   * Facturas: 301, 302, 304, 950, 960, 101, 104, 171
 */
export function detectEmpresaFromRemito(
  remito?: string | number,
  datosExtra?: Record<string, string>
): EmpresaDetectionResult {
  // 0. Si existe una columna de texto explícita de Empresa o Compañía
  if (datosExtra) {
    for (const [key, rawVal] of Object.entries(datosExtra)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('empresa') || lowerKey.includes('compan') || lowerKey.includes('razon')) {
        const strVal = String(rawVal || '').toLowerCase();
        if (strVal.includes('juan') || strVal.includes('construye')) {
          return { empresa: 'Juan Construye', sourceField: key };
        }
        if (strVal.includes('bosch') || strVal.includes('cia')) {
          return { empresa: 'Bosch & Cia', sourceField: key };
        }
      }
    }
  }

  const checkValue = (val?: string | number, fieldName = 'remito', isFactura = false): EmpresaDetectionResult | undefined => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    // Extraer solo los números
    const digits = str.replace(/\D/g, '');
    if (digits.length >= 2) {
      const p2 = digits.substring(0, 2);
      const p3 = digits.substring(0, 3);

      // Si es un campo de Factura
      if (isFactura) {
        if (JUAN_CONSTRUYE_FACTURA_PREFIXES.some((p) => digits.startsWith(p))) {
          return { empresa: 'Juan Construye', matchedPrefix: p3 || p2, sourceField: fieldName };
        }
        if (BOSCH_CIA_FACTURA_PREFIXES.some((p) => digits.startsWith(p))) {
          return { empresa: 'Bosch & Cia', matchedPrefix: p3 || p2, sourceField: fieldName };
        }
      }

      // Verificación por prefijos de Remito
      if (JUAN_CONSTRUYE_REMITO_PREFIXES.some((p) => digits.startsWith(p))) {
        return { empresa: 'Juan Construye', matchedPrefix: p3 || p2, sourceField: fieldName };
      }
      if (BOSCH_CIA_REMITO_PREFIXES.some((p) => digits.startsWith(p))) {
        return { empresa: 'Bosch & Cia', matchedPrefix: p3 || p2, sourceField: fieldName };
      }

      // Si no coincidió y no se forzó factura, intentar también prefijos de factura como soporte
      if (JUAN_CONSTRUYE_FACTURA_PREFIXES.some((p) => digits.startsWith(p))) {
        return { empresa: 'Juan Construye', matchedPrefix: p3 || p2, sourceField: fieldName };
      }
      if (BOSCH_CIA_FACTURA_PREFIXES.some((p) => digits.startsWith(p))) {
        return { empresa: 'Bosch & Cia', matchedPrefix: p3 || p2, sourceField: fieldName };
      }
    }
    return undefined;
  };

  // 1. Probar con el remito/pedido principal
  const resMain = checkValue(remito, 'remito/pedido');
  if (resMain) return resMain;

  // 2. Probar con columnas de datosExtra que contengan "remito"
  if (datosExtra) {
    for (const [key, val] of Object.entries(datosExtra)) {
      if (/remito/i.test(key)) {
        const res = checkValue(val, key, false);
        if (res) return res;
      }
    }

    // 3. Probar con columnas de factura
    for (const [key, val] of Object.entries(datosExtra)) {
      if (/factura/i.test(key)) {
        const res = checkValue(val, key, true);
        if (res) return res;
      }
    }

    // 4. Último intento en cualquier otra columna con "nro", "orden" o "comprobante"
    for (const [key, val] of Object.entries(datosExtra)) {
      if (/nro|orden|guia|comprobante/i.test(key)) {
        const res = checkValue(val, key, false);
        if (res) return res;
      }
    }
  }

  return { empresa: undefined };
}
