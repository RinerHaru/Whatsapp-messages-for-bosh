import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Link as LinkIcon, 
  Settings2, 
  Check, 
  AlertCircle, 
  Loader2, 
  FileSpreadsheet,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { ColumnMapping, Contact } from '../types';
import { parseCSVData } from '../utils/csvParser';
import { fetchSpreadsheetData, convertExcelToCSV } from '../utils/excelParser';

interface DataImporterProps {
  onImportSuccess: (contacts: Contact[], headers: string[], mapping: ColumnMapping, rawText?: string) => void;
  defaultCountryCode: string;
  onCountryCodeChange: (code: string) => void;
  headers: string[];
  currentMapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  rawCsvText: string;
}

export const DataImporter: React.FC<DataImporterProps> = ({
  onImportSuccess,
  defaultCountryCode,
  headers,
  currentMapping,
  onMappingChange,
  rawCsvText,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);

  // Soporte de hojas múltiples de Excel
  const [excelBuffer, setExcelBuffer] = useState<ArrayBuffer | null>(null);
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [currentSourceName, setCurrentSourceName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Procesador principal de texto CSV
  const processRawText = (text: string, sourceName = 'Hoja de Cálculo') => {
    try {
      const result = parseCSVData(text, defaultCountryCode);

      if (result.contacts.length === 0) {
        setErrorMessage('No se encontraron registros de clientes válidos en el archivo o la hoja seleccionada.');
        return;
      }

      onImportSuccess(result.contacts, result.headers, result.detectedMapping, text);
      setSuccessInfo(`¡Cargados ${result.contacts.length} contactos desde ${sourceName}!`);
    } catch (err: any) {
      setErrorMessage(`Error al procesar los datos: ${err.message || err}`);
    }
  };

  // Manejo de archivo local (Excel .xlsx, .xls o CSV .csv)
  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setSuccessInfo(null);

    const lowerName = file.name.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const isCsv = lowerName.endsWith('.csv') || file.type === 'text/csv';

    if (!isExcel && !isCsv) {
      setErrorMessage('Por favor sube un archivo con formato Excel (.xlsx, .xls) o CSV (.csv)');
      return;
    }

    try {
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const { csvText, sheetNames, activeSheet: firstSheet } = convertExcelToCSV(arrayBuffer, 0);
        setExcelBuffer(arrayBuffer);
        setExcelSheetNames(sheetNames);
        setActiveSheet(firstSheet);
        setCurrentSourceName(file.name);
        processRawText(csvText, `Excel: ${file.name} (Hoja: "${firstSheet}")`);
      } else {
        const text = await file.text();
        if (!text.trim()) {
          setErrorMessage('El archivo CSV está vacío.');
          return;
        }
        setExcelBuffer(null);
        setExcelSheetNames([]);
        setActiveSheet('');
        setCurrentSourceName(file.name);
        processRawText(text, `CSV: ${file.name}`);
      }
    } catch (err: any) {
      setErrorMessage(`Error al leer el archivo: ${err.message || err}`);
    }
  };

  // Manejo de importación desde enlace (Google Sheets, OneDrive, SharePoint, Dropbox, etc.)
  const handleFetchSpreadsheetUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!sheetUrl.trim()) {
      setErrorMessage('Ingresa el enlace de Google Sheets o de tu archivo Excel (OneDrive / SharePoint / Dropbox).');
      return;
    }

    setIsLoadingUrl(true);

    try {
      const fetched = await fetchSpreadsheetData(sheetUrl);

      if (fetched.isBinary) {
        const arrayBuffer = fetched.data as ArrayBuffer;
        const { csvText, sheetNames, activeSheet: firstSheet } = convertExcelToCSV(arrayBuffer, 0);
        setExcelBuffer(arrayBuffer);
        setExcelSheetNames(sheetNames);
        setActiveSheet(firstSheet);
        setCurrentSourceName(fetched.filenameSuggestion);
        processRawText(csvText, `${fetched.filenameSuggestion} (Hoja: "${firstSheet}")`);
      } else {
        const text = fetched.data as string;
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          throw new Error(
            'El enlace devolvió una página web de inicio de sesión. Asegúrate de que el documento esté compartido públicamente como "Cualquier persona que tenga el vínculo" (modo Lector).'
          );
        }
        setExcelBuffer(null);
        setExcelSheetNames([]);
        setActiveSheet('');
        setCurrentSourceName(fetched.filenameSuggestion);
        processRawText(text, fetched.filenameSuggestion);
      }
    } catch (err: any) {
      setErrorMessage(
        `No se pudo cargar desde el enlace: ${err.message || 'Error de conexión'}. Verifica los permisos públicos del archivo o prueba arrastrar el archivo Excel (.xlsx) directamente en la casilla izquierda.`
      );
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Cambio de hoja en un libro Excel multipestaña
  const handleSwitchSheet = (newSheetName: string) => {
    if (!excelBuffer) return;
    try {
      const { csvText, activeSheet: sheetSelected } = convertExcelToCSV(excelBuffer, newSheetName);
      setActiveSheet(sheetSelected);
      processRawText(csvText, `Excel: ${currentSourceName} (Hoja: "${sheetSelected}")`);
    } catch (err: any) {
      setErrorMessage(`Error al cambiar de hoja: ${err.message || err}`);
    }
  };

  // Cambio de columna mapeada
  const handleColumnChange = (field: keyof ColumnMapping, newCol: string) => {
    const updated = { ...currentMapping, [field]: newCol };
    onMappingChange(updated);
    if (rawCsvText) {
      const reParsed = parseCSVData(rawCsvText, defaultCountryCode, updated);
      onImportSuccess(reParsed.contacts, reParsed.headers, updated, rawCsvText);
    }
  };

  // Detectar servicio en tiempo real al escribir URL
  const getDetectedServiceBadge = (url: string) => {
    const trimmed = url.trim().toLowerCase();
    if (!trimmed) return null;
    if (trimmed.includes('docs.google.com/spreadsheets')) {
      return { label: 'Google Sheets', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (trimmed.includes('1drv.ms') || trimmed.includes('onedrive.live.com')) {
      return { label: 'Microsoft OneDrive Excel', color: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
    if (trimmed.includes('sharepoint.com')) {
      return { label: 'SharePoint / Microsoft 365', color: 'bg-teal-50 text-teal-800 border-teal-200' };
    }
    if (trimmed.includes('dropbox.com')) {
      return { label: 'Dropbox Excel / CSV', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
    }
    if (trimmed.includes('drive.google.com')) {
      return { label: 'Google Drive Excel', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (trimmed.endsWith('.xlsx') || trimmed.endsWith('.xls')) {
      return { label: 'Enlace directo Excel (.xlsx)', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (trimmed.endsWith('.csv')) {
      return { label: 'Enlace directo CSV', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
    return { label: 'Enlace Web Detectado', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const detectedBadge = getDetectedServiceBadge(sheetUrl);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              1
            </span>
            Carga de Hoja de Cálculo (Excel / Google Sheets / CSV)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sube tu archivo .xlsx, .xls o .csv, o vincula tu hoja en línea de Google Sheets, OneDrive o SharePoint.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          className="self-start sm:self-auto text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-medium"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>{showTips ? 'Ocultar guía de enlaces' : '¿Cómo obtener el enlace?'}</span>
        </button>
      </div>

      {/* Guía desplegable de enlaces */}
      {showTips && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2.5">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Formatos y Enlaces Compatibles
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-emerald-800 block mb-1">📊 Google Sheets:</span>
              <p className="text-slate-600">
                Abre tu hoja &gt; <strong>Compartir</strong> (arriba a la derecha) &gt; Acceso general: <strong>"Cualquier persona con el enlace"</strong> &gt; Copia y pega la URL aquí.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-blue-800 block mb-1">📗 Excel / OneDrive / SharePoint:</span>
              <p className="text-slate-600">
                Abre tu Excel en OneDrive o SharePoint &gt; <strong>Compartir</strong> &gt; <strong>Copiar vínculo</strong> (con acceso para cualquiera con el vínculo) &gt; Pégalo aquí.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            💡 Nota: Si tu archivo de Excel está en tu computadora o intranet protegida, también puedes simplemente arrastrarlo al recuadro de la izquierda.
          </p>
        </div>
      )}

      {/* Grid de Métodos de Carga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Método A: Subida de Archivo Local (Excel o CSV) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800 shadow-sm'
              : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 text-slate-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-800">
            Subir archivo Excel o CSV (.xlsx, .xls, .csv)
          </span>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Haz clic o arrastra tu archivo Excel o CSV directamente aquí
          </p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              Excel .XLSX / .XLS
            </span>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              .CSV
            </span>
          </div>
        </div>

        {/* Método B: Enlace Online (Google Sheets & Excel Online / OneDrive / SharePoint) */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="sheets-url-input" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-emerald-600" />
                Vincular Enlace Online (Excel / Google Sheets)
              </label>
              {detectedBadge ? (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${detectedBadge.color}`}>
                  {detectedBadge.label}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Excel & Sheets
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Pega un enlace de <strong>Google Sheets</strong>, <strong>OneDrive</strong>, <strong>SharePoint</strong> o archivo <strong>.xlsx</strong> web:
            </p>
          </div>

          <form onSubmit={handleFetchSpreadsheetUrl} className="mt-3 flex gap-2">
            <input
              id="sheets-url-input"
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/... o https://1drv.ms/..."
              className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
            <button
              type="submit"
              disabled={isLoadingUrl}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoadingUrl ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Importar'
              )}
            </button>
          </form>

          {/* Badges de compatibilidad */}
          <div className="mt-2.5 flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
            <span className="font-medium text-slate-500">Compatible con:</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">Google Sheets</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">OneDrive</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">SharePoint</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">Dropbox</span>
          </div>
        </div>

      </div>

      {/* Alertas de Notificación */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {successInfo && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successInfo}</span>
          </div>
        </div>
      )}

      {/* Selector de Hoja de Excel si el libro tiene más de 1 pestaña */}
      {excelSheetNames.length > 1 && (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-blue-900 block sm:inline">Libro de Excel con {excelSheetNames.length} hojas:</span>{' '}
              <span className="text-blue-700">Selecciona la pestaña a procesar</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-blue-900">Hoja activa:</span>
            <select
              value={activeSheet}
              onChange={(e) => handleSwitchSheet(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-white text-blue-950 border border-blue-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {excelSheetNames.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Mapeador de Columnas detectadas */}
      {headers.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Mapeo de Columnas Detectadas
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium bg-emerald-100/70 px-2 py-0.5 rounded">
              Detección automática activa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Columna Nombre */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Columna de Nombre:
              </label>
              <select
                value={currentMapping.nombreCol}
                onChange={(e) => handleColumnChange('nombreCol', e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {headers.map((h) => (
                  <option key={`name-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Columna Teléfono */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Columna de Teléfono / WhatsApp:
              </label>
              <select
                value={currentMapping.telefonoCol}
                onChange={(e) => handleColumnChange('telefonoCol', e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {headers.map((h) => (
                  <option key={`tel-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Columna Remito / Pedido */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                <span>Columna de Remito / Pedido:</span>
                <span className="text-[10px] text-emerald-700 font-normal">Detecta empresa</span>
              </label>
              <select
                value={currentMapping.pedidoCol}
                onChange={(e) => handleColumnChange('pedidoCol', e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {headers.map((h) => (
                  <option key={`ord-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Prefijos JC (181, 417, 135, 136) / Bosch (950, 960, 301, 304, 302)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
