import Papa from 'papaparse';
import { ColumnMapping, Contact } from '../types';
import { sanitizeAndFormatPhone } from './phoneFormatter';

export interface ParseCSVResult {
  headers: string[];
  contacts: Contact[];
  detectedMapping: ColumnMapping;
  errors: string[];
  rawRows: Record<string, string>[];
}

/**
 * Convierte enlaces comunes de Google Sheets al formato de exportación CSV público
 */
export function normalizeGoogleSheetUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  if (!trimmed) return '';

  // Si ya es un enlace de exportación CSV o pub?output=csv, dejarlo
  if (trimmed.includes('format=csv') || trimmed.includes('output=csv')) {
    return trimmed;
  }

  // Detectar URL estándar de Google Sheets: https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
  const sheetIdMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetIdMatch && sheetIdMatch[1]) {
    const sheetId = sheetIdMatch[1];
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMatch[1]}`;
    }
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }

  return trimmed;
}

/**
 * Autodetecta las mejores columnas para Nombre, Teléfono y Pedido
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    nombreCol: '',
    telefonoCol: '',
    pedidoCol: '',
  };

  const clean = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Candidatos para Nombre
  const nameKeywords = ['nombre', 'name', 'cliente', 'customer', 'destinatario', 'persona', 'comprador'];
  for (const h of headers) {
    const ch = clean(h);
    if (nameKeywords.some((kw) => ch.includes(kw))) {
      mapping.nombreCol = h;
      break;
    }
  }
  if (!mapping.nombreCol && headers.length > 0) {
    mapping.nombreCol = headers[0]; // fallback primera columna
  }

  // Candidatos para Teléfono / WhatsApp
  const phoneKeywords = ['telefono', 'celular', 'whatsapp', 'phone', 'mobile', 'movil', 'wa', 'tel', 'contacto'];
  for (const h of headers) {
    const ch = clean(h);
    if (phoneKeywords.some((kw) => ch.includes(kw))) {
      mapping.telefonoCol = h;
      break;
    }
  }
  if (!mapping.telefonoCol && headers.length > 1) {
    mapping.telefonoCol = headers[1]; // fallback segunda columna
  }

  // Candidatos para Pedido / Orden
  const orderKeywords = ['pedido', 'orden', 'order', 'nro_pedido', 'id_pedido', 'ticket', 'producto', 'item', 'paquete', 'detalle'];
  for (const h of headers) {
    const ch = clean(h);
    if (orderKeywords.some((kw) => ch.includes(kw))) {
      mapping.pedidoCol = h;
      break;
    }
  }
  if (!mapping.pedidoCol && headers.length > 2) {
    mapping.pedidoCol = headers[2]; // fallback tercera columna
  }

  return mapping;
}

/**
 * Procesa texto CSV y devuelve contactos formateados y columnas detectadas
 */
export function parseCSVData(
  csvText: string,
  defaultCountryCode = 'auto',
  overrideMapping?: Partial<ColumnMapping>
): ParseCSVResult {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.slice(0, 3).forEach((err) => errors.push(`Línea ${err.row}: ${err.message}`));
  }

  const rawRows = parsed.data || [];
  const headers = parsed.meta.fields ? parsed.meta.fields.filter(Boolean) : [];

  if (headers.length === 0) {
    return {
      headers: [],
      contacts: [],
      detectedMapping: { nombreCol: '', telefonoCol: '', pedidoCol: '' },
      errors: ['No se detectaron columnas en el archivo CSV.'],
      rawRows: [],
    };
  }

  const detectedMapping = {
    ...autoDetectColumns(headers),
    ...overrideMapping,
  };

  const contacts: Contact[] = rawRows.map((row, index) => {
    const nombre = detectedMapping.nombreCol ? row[detectedMapping.nombreCol] || '' : '';
    const rawTelefono = detectedMapping.telefonoCol ? row[detectedMapping.telefonoCol] || '' : '';
    const pedido = detectedMapping.pedidoCol ? row[detectedMapping.pedidoCol] || '' : '';

    const phoneResult = sanitizeAndFormatPhone(rawTelefono, defaultCountryCode);

    // Guardar columnas extras para usarlas en plantillas
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (
        k !== detectedMapping.nombreCol &&
        k !== detectedMapping.telefonoCol &&
        k !== detectedMapping.pedidoCol
      ) {
        extra[k] = String(v || '');
      }
    }

    return {
      id: `contact-${Date.now()}-${index}`,
      nombre: String(nombre).trim(),
      telefono: String(rawTelefono).trim(),
      telefonoFormateado: phoneResult.formatted,
      telefonoValido: phoneResult.isValid,
      telefonoError: phoneResult.error,
      pedido: String(pedido).trim(),
      estado: 'Pendiente',
      paisDetectado: phoneResult.country,
      datosExtra: extra,
    };
  });

  return {
    headers,
    contacts,
    detectedMapping,
    errors,
    rawRows,
  };
}
