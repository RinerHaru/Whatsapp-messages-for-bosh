/**
 * Utilidad server-side para descargar hojas de cálculo (OneDrive, SharePoint, Google Sheets, Dropbox, URLs directas)
 * sin restricciones ni bloqueos de CORS del navegador.
 */

export interface FetchResult {
  isBinary: boolean;
  buffer?: Buffer;
  text?: string;
  filename: string;
  contentType: string;
}

/**
 * Gestiona descargas seguras desde OneDrive, SharePoint, Google Sheets, Dropbox, etc.
 */
export async function downloadSpreadsheetFromServer(inputUrl: string): Promise<FetchResult> {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    throw new Error('La URL está vacía');
  }

  // 1. Detección de Google Sheets
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    return downloadGoogleSheet(trimmed);
  }

  // 2. Detección de Google Drive
  if (trimmed.includes('drive.google.com/file/d/')) {
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const gdriveUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      return downloadDirectFile(gdriveUrl);
    }
  }

  // 3. Detección de Dropbox
  if (trimmed.includes('dropbox.com')) {
    let dbxUrl = trimmed.replace('dl=0', 'dl=1');
    if (!dbxUrl.includes('dl=1')) {
      dbxUrl += (dbxUrl.includes('?') ? '&' : '?') + 'dl=1';
    }
    return downloadDirectFile(dbxUrl);
  }

  // 4. Detección de OneDrive / SharePoint
  if (
    trimmed.includes('1drv.ms') ||
    trimmed.includes('onedrive.live.com') ||
    trimmed.includes('.sharepoint.com')
  ) {
    return downloadOneDriveFile(trimmed);
  }

  // 5. Descarga directa estándar
  return downloadDirectFile(trimmed);
}

/**
 * Descarga y exporta una hoja de Google Sheets en formato CSV
 */
async function downloadGoogleSheet(sheetUrl: string): Promise<FetchResult> {
  let exportUrl = sheetUrl;
  const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetIdMatch && sheetIdMatch[1]) {
    const sheetId = sheetIdMatch[1];
    const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMatch[1]}`;
    } else {
      exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    }
  }

  const res = await fetch(exportUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Google Sheets respondió con estado HTTP ${res.status}. Asegúrate de que los permisos estén en "Cualquier persona con el enlace"`);
  }

  const text = await res.text();
  if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
    throw new Error('La hoja de Google Sheets requiere iniciar sesión o no está compartida como pública (Lector).');
  }

  return {
    isBinary: false,
    text,
    filename: 'Google_Sheets_Export.csv',
    contentType: 'text/csv',
  };
}

/**
 * Descarga archivos compartidos de Microsoft OneDrive (personal y empresarial)
 * Maneja el handshake de cookies (FedAuth) y extracción de FileUrlNoAuth desde Office Online
 */
async function downloadOneDriveFile(oneDriveUrl: string): Promise<FetchResult> {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  // Mapa de cookies para almacenar cookies de sesión de Microsoft
  const cookieJar = new Map<string, string>();

  function updateCookies(res: Response) {
    const rawSetCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    const setCookieHeader = res.headers.get('set-cookie');
    const allHeaders = rawSetCookies.length > 0 ? rawSetCookies : (setCookieHeader ? [setCookieHeader] : []);
    
    for (const header of allHeaders) {
      const parts = header.split(';');
      if (parts.length > 0) {
        const [name, ...rest] = parts[0].trim().split('=');
        if (name) {
          cookieJar.set(name.trim(), rest.join('='));
        }
      }
    }
  }

  function getCookieString(): string {
    return Array.from(cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  // 1. Petición inicial al enlace de OneDrive
  let currentUrl = oneDriveUrl;
  let response: Response | null = null;
  let redirectCount = 0;

  while (redirectCount < 10) {
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*;q=0.8',
    };
    const cookieStr = getCookieString();
    if (cookieStr) headers['Cookie'] = cookieStr;

    response = await fetch(currentUrl, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

    updateCookies(response);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      currentUrl = new URL(location, currentUrl).toString();
      redirectCount++;
      continue;
    }

    break;
  }

  if (!response || !response.ok) {
    throw new Error(`OneDrive respondió con error HTTP ${response?.status || 'desconocido'}.`);
  }

  const contentType = response.headers.get('content-type') || '';
  const contentDisp = response.headers.get('content-disposition') || '';

  // Si ya es binario (descarga directa)
  if (
    contentType.includes('spreadsheet') ||
    contentType.includes('excel') ||
    contentType.includes('octet-stream') ||
    contentDisp.includes('.xlsx') ||
    contentDisp.includes('.xls')
  ) {
    const arrayBuf = await response.arrayBuffer();
    const filename = extractFilenameFromHeader(contentDisp) || 'Libro_OneDrive.xlsx';
    return {
      isBinary: true,
      buffer: Buffer.from(arrayBuf),
      filename,
      contentType,
    };
  }

  // Si devolvió la página HTML del visor de Office Online, extraemos la URL de descarga directa
  const htmlText = await response.text();

  // Buscar _wopiContextJson en el HTML
  const wopiMatch = htmlText.match(/_wopiContextJson\s*=\s*(\{.*?\});/s);
  let fileUrlToDownload: string | null = null;
  let detectedFilename = 'Libro_OneDrive.xlsx';

  if (wopiMatch && wopiMatch[1]) {
    try {
      const wopiData = JSON.parse(wopiMatch[1]);
      if (wopiData.FileName) {
        detectedFilename = wopiData.FileName;
      }
      if (wopiData.FileUrlNoAuth) {
        fileUrlToDownload = wopiData.FileUrlNoAuth.replace(/\\u0026/g, '&');
      } else if (wopiData.FileGetUrl) {
        fileUrlToDownload = wopiData.FileGetUrl.replace(/\\u0026/g, '&');
      }
    } catch {
      // Ignorar error de parseo JSON y probar regex alternativa
    }
  }

  // Regex alternativa para FileUrlNoAuth o FileGetUrl
  if (!fileUrlToDownload) {
    const fileUrlMatch = htmlText.match(/"(?:FileUrlNoAuth|FileGetUrl)":"([^"]+)"/);
    if (fileUrlMatch && fileUrlMatch[1]) {
      fileUrlToDownload = fileUrlMatch[1].replace(/\\u0026/g, '&');
    }
  }

  // Regex para FileName si no se obtuvo
  if (detectedFilename === 'Libro_OneDrive.xlsx') {
    const nameMatch = htmlText.match(/"FileName":"([^"]+)"/);
    if (nameMatch && nameMatch[1]) {
      detectedFilename = nameMatch[1];
    }
  }

  if (!fileUrlToDownload) {
    // Si no encontramos FileUrlNoAuth, verificar si requiere autenticación de Microsoft
    if (htmlText.includes('Sign in to your account') || htmlText.includes('login.live.com')) {
      throw new Error(
        'El archivo de OneDrive es privado o requiere inicio de sesión. Por favor compártelo seleccionando "Cualquier persona que tenga el vínculo puede ver", o arrastra el archivo .xlsx directamente a la aplicación.'
      );
    }
    throw new Error('No se pudo extraer el enlace de descarga directa de OneDrive.');
  }

  // 2. Realizar petición a FileUrlNoAuth con las cookies obtenidas (FedAuth)
  const downloadHeaders: Record<string, string> = {
    'User-Agent': userAgent,
    Accept: '*/*',
  };
  const cookieStr = getCookieString();
  if (cookieStr) downloadHeaders['Cookie'] = cookieStr;

  const downloadRes = await fetch(fileUrlToDownload, {
    method: 'GET',
    headers: downloadHeaders,
    redirect: 'follow',
  });

  if (!downloadRes.ok) {
    throw new Error(`Falló la descarga del archivo de Excel desde OneDrive (HTTP ${downloadRes.status}).`);
  }

  const finalContentType = downloadRes.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const finalContentDisp = downloadRes.headers.get('content-disposition') || '';
  const finalFilename = extractFilenameFromHeader(finalContentDisp) || detectedFilename;

  const buffer = Buffer.from(await downloadRes.arrayBuffer());

  return {
    isBinary: true,
    buffer,
    filename: finalFilename,
    contentType: finalContentType,
  };
}

/**
 * Descarga directa para enlaces a archivos alojados en la web
 */
async function downloadDirectFile(url: string): Promise<FetchResult> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`El servidor remoto respondió con estado HTTP ${res.status}.`);
  }

  const contentType = res.headers.get('content-type') || '';
  const contentDisp = res.headers.get('content-disposition') || '';
  const isBinary =
    contentType.includes('spreadsheet') ||
    contentType.includes('excel') ||
    contentType.includes('officedocument') ||
    contentType.includes('octet-stream') ||
    url.endsWith('.xlsx') ||
    url.endsWith('.xls');

  const filename = extractFilenameFromHeader(contentDisp) || (isBinary ? 'archivo_excel.xlsx' : 'archivo_datos.csv');

  if (isBinary) {
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      isBinary: true,
      buffer: buf,
      filename,
      contentType,
    };
  } else {
    const text = await res.text();
    return {
      isBinary: false,
      text,
      filename,
      contentType: contentType || 'text/csv',
    };
  }
}

function extractFilenameFromHeader(contentDisposition: string): string | null {
  if (!contentDisposition) return null;
  // Soporte filename*=utf-8''Nombre.xlsx
  const utf8Match = contentDisposition.match(/filename\*=utf-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  // Soporte filename="Nombre.xlsx"
  const standardMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1];
  }
  return null;
}
