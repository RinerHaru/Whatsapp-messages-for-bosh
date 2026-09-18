import * as XLSX from 'xlsx';
import { parseCSVData, ParseCSVResult } from './csvParser';
import { ColumnMapping } from '../types';

export interface SheetInfo {
  name: string;
  rowCount: number;
}

export interface ExcelParseResult {
  sheetNames: string[];
  activeSheetName: string;
  result: ParseCSVResult;
  rawCsvText: string;
}

/**
 * Normaliza cualquier enlace (Google Sheets, OneDrive, SharePoint, Dropbox, Google Drive, Excel Directo)
 * para obtener una URL de descarga directa de datos (CSV o XLSX).
 */
export function normalizeSpreadsheetUrl(inputUrl: string): { url: string; type: 'google-sheets' | 'excel-onedrive' | 'excel-sharepoint' | 'excel-dropbox' | 'excel-gdrive' | 'direct' } {
  const trimmed = inputUrl.trim();
  if (!trimmed) return { url: '', type: 'direct' };

  // 1. Google Sheets
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    // Si ya tiene export o pub
    if (trimmed.includes('format=csv') || trimmed.includes('output=csv')) {
      return { url: trimmed, type: 'google-sheets' };
    }
    const sheetIdMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch && sheetIdMatch[1]) {
      const sheetId = sheetIdMatch[1];
      const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        return {
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMatch[1]}`,
          type: 'google-sheets',
        };
      }
      return {
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
        type: 'google-sheets',
      };
    }
    return { url: trimmed, type: 'google-sheets' };
  }

  // 2. OneDrive Personal (onedrive.live.com o 1drv.ms)
  if (trimmed.includes('1drv.ms') || trimmed.includes('onedrive.live.com')) {
    let url = trimmed;
    // Si es enlace view.aspx o redir.aspx, cambiar a download.aspx o añadir download=1
    if (url.includes('onedrive.live.com')) {
      if (url.includes('view.aspx')) {
        url = url.replace('view.aspx', 'download.aspx');
      }
      if (!url.includes('download=1') && !url.includes('download.aspx')) {
        url += (url.includes('?') ? '&' : '?') + 'download=1';
      }
    } else if (trimmed.includes('1drv.ms')) {
      // 1drv.ms corto
      if (!url.includes('download=1')) {
        url += (url.includes('?') ? '&' : '?') + 'download=1';
      }
    }
    return { url, type: 'excel-onedrive' };
  }

  // 3. SharePoint / OneDrive for Business (*.sharepoint.com)
  if (trimmed.includes('.sharepoint.com')) {
    let url = trimmed;
    if (!url.includes('download=1')) {
      url += (url.includes('?') ? '&' : '?') + 'download=1';
    }
    return { url, type: 'excel-sharepoint' };
  }

  // 4. Dropbox
  if (trimmed.includes('dropbox.com')) {
    let url = trimmed;
    if (url.includes('dl=0')) {
      url = url.replace('dl=0', 'dl=1');
    } else if (!url.includes('dl=1') && !url.includes('raw=1')) {
      url += (url.includes('?') ? '&' : '?') + 'dl=1';
    }
    return { url, type: 'excel-dropbox' };
  }

  // 5. Google Drive (archivo .xlsx o .csv alojado como archivo en Drive)
  if (trimmed.includes('drive.google.com/file/d/')) {
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return {
        url: `https://drive.google.com/uc?export=download&id=${match[1]}`,
        type: 'excel-gdrive',
      };
    }
  }

  // 6. Enlace directo
  return { url: trimmed, type: 'direct' };
}

/**
 * Convierte un ArrayBuffer de Excel (.xlsx / .xls) a texto CSV usando SheetJS
 */
export function convertExcelToCSV(
  arrayBuffer: ArrayBuffer,
  sheetIndexOrName: number | string = 0
): { csvText: string; sheetNames: string[]; activeSheet: string } {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('El archivo de Excel no contiene hojas de cálculo.');
  }

  let activeSheet = sheetNames[0];
  if (typeof sheetIndexOrName === 'number') {
    activeSheet = sheetNames[sheetIndexOrName] || sheetNames[0];
  } else if (typeof sheetIndexOrName === 'string' && sheetNames.includes(sheetIndexOrName)) {
    activeSheet = sheetIndexOrName;
  }

  const worksheet = workbook.Sheets[activeSheet];
  if (!worksheet) {
    throw new Error(`No se pudo leer la hoja "${activeSheet}".`);
  }

  // Convertir hoja a CSV con separador de coma y salto de línea estándar
  const csvText = XLSX.utils.sheet_to_csv(worksheet, {
    FS: ',',
    RS: '\n',
    blankrows: false,
  });

  return {
    csvText,
    sheetNames,
    activeSheet,
  };
}

/**
 * Lee un archivo File de Excel (.xlsx / .xls) desde el navegador
 */
export async function parseExcelFile(
  file: File,
  defaultCountryCode = 'auto',
  sheetIndexOrName: number | string = 0,
  overrideMapping?: Partial<ColumnMapping>
): Promise<ExcelParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const { csvText, sheetNames, activeSheet } = convertExcelToCSV(arrayBuffer, sheetIndexOrName);
  const result = parseCSVData(csvText, defaultCountryCode, overrideMapping);

  return {
    sheetNames,
    activeSheetName: activeSheet,
    result,
    rawCsvText: csvText,
  };
}

/**
 * Convierte una cadena base64 en un ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Intenta descargar desde una URL de hoja de cálculo (Google Sheets, OneDrive, SharePoint o Excel Directo).
 * Utiliza preferentemente la API backend /api/fetch-spreadsheet para evitar restricciones de CORS y procesar
 * adecuadamente las sesiones de Microsoft OneDrive y SharePoint.
 */
export async function fetchSpreadsheetData(
  inputUrl: string
): Promise<{ data: ArrayBuffer | string; isBinary: boolean; filenameSuggestion: string }> {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    throw new Error('La URL no puede estar vacía.');
  }

  // 1. Intentar primero a través del backend (/api/fetch-spreadsheet)
  try {
    const apiRes = await fetch('/api/fetch-spreadsheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: trimmed }),
    });

    const data = await apiRes.json();

    if (apiRes.ok && data.success) {
      if (data.isBinary && data.base64) {
        const arrayBuffer = base64ToArrayBuffer(data.base64);
        return {
          data: arrayBuffer,
          isBinary: true,
          filenameSuggestion: data.filename || 'Libro de Excel',
        };
      } else if (typeof data.text === 'string') {
        return {
          data: data.text,
          isBinary: false,
          filenameSuggestion: data.filename || 'Hoja de datos',
        };
      }
    }

    // Si el backend devolvió un error explícito (ej. enlace privado o no compartido)
    if (!apiRes.ok || data.error) {
      throw new Error(data.error || `Error del servidor (HTTP ${apiRes.status})`);
    }
  } catch (backendError: any) {
    // Si el mensaje del backend es un error de permisos o de OneDrive/Google claro, propagarlo
    const msg = backendError?.message || '';
    if (
      msg.includes('privado') ||
      msg.includes('permisos') ||
      msg.includes('inicio de sesión') ||
      msg.includes('Cualquier persona')
    ) {
      throw backendError;
    }

    // Si falló por otra causa en el backend, intentar fallback de descarga directa por el cliente
    console.warn('Fallback al cliente tras error en backend:', backendError);
  }

  // 2. Fallback client-side directo en caso de enlaces con soporte CORS nativo
  const { url, type } = normalizeSpreadsheetUrl(trimmed);
  const candidateUrls: string[] = [url];
  if (type !== 'google-sheets') {
    candidateUrls.push(`https://corsproxy.io/?url=${encodeURIComponent(url)}`);
  }

  let lastError: any = null;

  for (let i = 0; i < candidateUrls.length; i++) {
    const candidate = candidateUrls[i];
    try {
      const response = await fetch(candidate, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, text/plain, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const textSample = await response.clone().text();
        if (textSample.includes('<!DOCTYPE html>') || textSample.includes('<html') || textSample.includes('Sign in to your account')) {
          throw new Error('El enlace requiere inicio de sesión en Microsoft/Google o no tiene permisos públicos de lectura.');
        }
      }

      const isExcelBinary =
        contentType.includes('spreadsheet') ||
        contentType.includes('excel') ||
        contentType.includes('officedocument') ||
        contentType.includes('application/zip') ||
        contentType.includes('octet-stream') ||
        url.endsWith('.xlsx') ||
        url.endsWith('.xls') ||
        type.startsWith('excel');

      if (isExcelBinary) {
        const arrayBuffer = await response.arrayBuffer();
        return {
          data: arrayBuffer,
          isBinary: true,
          filenameSuggestion: type.startsWith('excel') ? 'Libro de Excel' : 'Hoja de cálculo',
        };
      } else {
        const text = await response.text();
        return {
          data: text,
          isBinary: false,
          filenameSuggestion: type === 'google-sheets' ? 'Google Sheets' : 'Archivo CSV',
        };
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo acceder al enlace proporcionado.');
}
