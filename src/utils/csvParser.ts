import Papa from 'papaparse';
import { ColumnMapping, Contact } from '../types';
import { sanitizeAndFormatPhone } from './phoneFormatter';
import { detectEmpresaFromRemito } from './empresaDetector';

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
 * Autodetecta las mejores columnas para Nombre, Teléfono y Pedido utilizando
 * un sistema de puntuación ponderado para hojas con muchas columnas y logística.
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const clean = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Función para puntuar candidatos a Nombre de Cliente
  const scoreName = (h: string): number => {
    const ch = clean(h);
    let score = 0;
    // Gran prioridad a columnas explícitas de cliente/persona
    if (ch.includes('cliente/proveedor') || ch.includes('nombre de cliente') || ch.includes('nombre cliente')) score += 30;
    else if (ch.includes('cliente') || ch.includes('customer') || ch.includes('destinatario') || ch.includes('comprador') || ch.includes('razon social') || ch.includes('titular')) score += 20;
    else if (ch === 'nombre' || ch === 'name') score += 10;
    else if (ch.includes('nombre') || ch.includes('name')) score += 5;

    // Penalizaciones si es nombre de producto, transporte, línea o vendedor
    if (ch.includes('linea') || ch.includes('envio') || ch.includes('producto') || ch.includes('vendedor') || ch.includes('deposito')) score -= 15;
    if (ch.includes('telefono') || ch.includes('contacto') || ch.includes('remito') || ch.includes('factura') || ch.includes('direccion') || ch.includes('fecha')) score -= 25;

    return score;
  };

  // Función para puntuar candidatos a Teléfono / WhatsApp
  const scorePhone = (h: string): number => {
    const ch = clean(h);
    let score = 0;
    if (ch.includes('whatsapp') || ch.includes('celular') || ch.includes('movil') || ch.includes('mobile')) score += 30;
    else if (ch.includes('telefono') || ch.includes('phone') || ch.includes('tel')) score += 25;
    else if (ch.includes('contacto entrega') || ch.includes('contacto')) score += 20;
    else if (ch.includes('wa')) score += 15;

    // Penalizaciones
    if (ch.includes('factura') && !ch.includes('contacto')) score -= 10;
    if (ch.includes('direccion') || ch.includes('remito') || ch.includes('fecha')) score -= 25;

    return score;
  };

  // Función para puntuar candidatos a Pedido / Remito / Factura / Orden
  const scoreOrder = (h: string): number => {
    const ch = clean(h);
    let score = 0;
    // Términos comunes en logística, distribución y comercio
    if (ch.includes('nro de remito') || ch.includes('nro remito') || ch.includes('remito')) score += 30;
    else if (ch.includes('nro de pedido') || ch.includes('nro pedido') || ch.includes('nro_pedido') || ch.includes('id_pedido')) score += 28;
    else if (ch.includes('nro factura') || ch.includes('nro de factura') || ch.includes('factura')) score += 26;
    else if (ch.includes('pedido') || ch.includes('orden') || ch.includes('order') || ch.includes('ticket')) score += 25;
    else if (ch.includes('guia') || ch.includes('comprobante') || ch.includes('despacho') || ch.includes('tracking') || ch.includes('albaran')) score += 20;
    else if (ch.includes('paquete') || ch.includes('item') || ch.includes('producto') || ch.includes('detalle')) score += 10;

    // Penalizaciones
    if (ch.includes('cliente') || ch.includes('destinatario') || ch.includes('contacto') || ch.includes('telefono') || ch.includes('vendedor') || ch.includes('direccion')) score -= 25;

    return score;
  };

  // Calcular puntajes para cada encabezado
  const scored = headers.map((h) => ({
    header: h,
    nameSort: scoreName(h),
    phoneSort: scorePhone(h),
    orderSort: scoreOrder(h),
  }));

  const mapping: ColumnMapping = {
    nombreCol: '',
    telefonoCol: '',
    pedidoCol: '',
  };

  // 1. Asignar Teléfono (el más inequívoco)
  const bestPhone = [...scored].sort((a, b) => b.phoneSort - a.phoneSort)[0];
  if (bestPhone && bestPhone.phoneSort > 0) {
    mapping.telefonoCol = bestPhone.header;
  }

  // 2. Asignar Nombre (evitando la columna de teléfono)
  const nameCandidates = scored
    .filter((s) => s.header !== mapping.telefonoCol)
    .sort((a, b) => b.nameSort - a.nameSort);
  if (nameCandidates[0] && nameCandidates[0].nameSort > 0) {
    mapping.nombreCol = nameCandidates[0].header;
  }

  // 3. Asignar Pedido (evitando teléfono y nombre)
  const orderCandidates = scored
    .filter((s) => s.header !== mapping.telefonoCol && s.header !== mapping.nombreCol)
    .sort((a, b) => b.orderSort - a.orderSort);
  if (orderCandidates[0] && orderCandidates[0].orderSort > 0) {
    mapping.pedidoCol = orderCandidates[0].header;
  }

  // Fallbacks garantizando que NUNCA se repita la misma columna para dos campos distintos
  const unassigned = headers.filter(
    (h) => h !== mapping.nombreCol && h !== mapping.telefonoCol && h !== mapping.pedidoCol
  );

  if (!mapping.nombreCol) {
    mapping.nombreCol = unassigned.shift() || headers[0] || '';
  }
  if (!mapping.telefonoCol) {
    mapping.telefonoCol = unassigned.shift() || headers[1] || '';
  }
  if (!mapping.pedidoCol) {
    mapping.pedidoCol = unassigned.shift() || headers[2] || '';
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

    // Guardar todas las columnas del CSV para usarlas en plantillas
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      extra[k] = String(v ?? '').trim();
    }

    const cleanPedido = String(pedido).trim();
    const empresaResult = detectEmpresaFromRemito(cleanPedido, extra);

    return {
      id: `contact-${Date.now()}-${index}`,
      nombre: String(nombre).trim(),
      telefono: String(rawTelefono).trim(),
      telefonoFormateado: phoneResult.formatted,
      telefonoValido: phoneResult.isValid,
      telefonoError: phoneResult.error,
      pedido: cleanPedido,
      empresa: empresaResult.empresa,
      empresaPrefix: empresaResult.matchedPrefix,
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
