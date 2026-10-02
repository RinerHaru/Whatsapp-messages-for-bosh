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
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
  Files
} from 'lucide-react';
import { ColumnMapping, Contact, ImportStats } from '../types';
import { parseCSVData } from '../utils/csvParser';
import { fetchSpreadsheetData, convertExcelToCSV } from '../utils/excelParser';

interface DataImporterProps {
  onImportSuccess: (
    contacts: Contact[],
    headers: string[],
    mapping: ColumnMapping,
    rawText?: string,
    mode?: 'append' | 'replace'
  ) => ImportStats | void;
  defaultCountryCode: string;
  onCountryCodeChange: (code: string) => void;
  headers: string[];
  currentMapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  rawCsvText: string;
  importMode: 'append' | 'replace';
  onImportModeChange: (mode: 'append' | 'replace') => void;
  totalContactsCount: number;
  onClearContacts: () => void;
}

export const DataImporter: React.FC<DataImporterProps> = ({
  onImportSuccess,
  defaultCountryCode,
  headers,
  currentMapping,
  onMappingChange,
  rawCsvText,
  importMode,
  onImportModeChange,
  totalContactsCount,
  onClearContacts,
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
  const processRawText = (text: string, sourceName = 'Hoja de Cálculo', modeOverride?: 'append' | 'replace') => {
    try {
      const result = parseCSVData(text, defaultCountryCode, undefined, sourceName);

      if (result.contacts.length === 0) {
        setErrorMessage('No se encontraron registros de clientes válidos en el archivo o la hoja seleccionada.');
        return;
      }

      const stats = onImportSuccess(result.contacts, result.headers, result.detectedMapping, text, modeOverride);

      if (stats) {
        if (stats.wasSampleReplaced) {
          setSuccessInfo(`¡Cargados ${stats.addedCount} contactos desde ${sourceName}! Se reemplazaron los datos de muestra iniciales (Total: ${stats.totalCount} contactos).`);
        } else if (importMode === 'replace' && !modeOverride) {
          setSuccessInfo(`¡Lista reemplazada! Cargados ${stats.addedCount} contactos desde ${sourceName}.`);
        } else {
          // Modo Añadir / Acumular
          let msg = `¡Se añadieron ${stats.addedCount} contactos desde "${sourceName}"! Total acumulado en la lista: ${stats.totalCount} contactos.`;
          if (stats.duplicateCount > 0) {
            msg += ` (${stats.duplicateCount} registros duplicados ya existentes fueron omitidos)`;
          }
          setSuccessInfo(msg);
        }
      } else {
        setSuccessInfo(`¡Cargados ${result.contacts.length} contactos desde ${sourceName}!`);
      }
    } catch (err: any) {
      setErrorMessage(`Error al procesar los datos: ${err.message || err}`);
    }
  };

  // Manejo de múltiples archivos o archivo individual (Excel .xlsx, .xls o CSV .csv)
  const handleFilesUpload = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    setSuccessInfo(null);

    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Si es un solo archivo
    if (files.length === 1) {
      const file = files[0];
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
          processRawText(csvText, `${file.name} (Hoja: "${firstSheet}")`);
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
          processRawText(text, file.name);
        }
      } catch (err: any) {
        setErrorMessage(`Error al leer el archivo: ${err.message || err}`);
      }
      return;
    }

    // Múltiples archivos seleccionados a la vez
    let totalAdded = 0;
    let totalDuplicates = 0;
    let successfulFiles = 0;

    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
      const isCsv = lowerName.endsWith('.csv') || file.type === 'text/csv';

      if (!isExcel && !isCsv) continue;

      try {
        let csv = '';
        if (isExcel) {
          const buf = await file.arrayBuffer();
          const converted = convertExcelToCSV(buf, 0);
          csv = converted.csvText;
        } else {
          csv = await file.text();
        }

        const parsed = parseCSVData(csv, defaultCountryCode, undefined, file.name);
        if (parsed.contacts.length > 0) {
          const stats = onImportSuccess(parsed.contacts, parsed.headers, parsed.detectedMapping, csv, 'append');
          totalAdded += stats?.addedCount ?? parsed.contacts.length;
          totalDuplicates += stats?.duplicateCount ?? 0;
          successfulFiles++;
        }
      } catch (err) {
        console.error(`Error procesando archivo ${file.name}:`, err);
      }
    }

    if (successfulFiles > 0) {
      setSuccessInfo(
        `¡Se procesaron ${successfulFiles} archivos con éxito! Se añadieron ${totalAdded} contactos nuevos a la lista.` +
        (totalDuplicates > 0 ? ` (${totalDuplicates} duplicados omitidos)` : '')
      );
    } else {
      setErrorMessage('No se pudieron procesar los archivos seleccionados.');
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
      processRawText(csvText, `${currentSourceName} (Hoja: "${sheetSelected}")`);
    } catch (err: any) {
      setErrorMessage(`Error al cambiar de hoja: ${err.message || err}`);
    }
  };

  // Procesar y añadir TODAS las hojas del archivo Excel cargado en un solo paso
  const handleLoadAllSheets = () => {
    if (!excelBuffer || excelSheetNames.length === 0) return;
    try {
      const allContacts: Contact[] = [];
      const allHeadersSet = new Set<string>();
      let detectedMap = currentMapping;

      for (const sheet of excelSheetNames) {
        const { csvText } = convertExcelToCSV(excelBuffer, sheet);
        const parsed = parseCSVData(csvText, defaultCountryCode, undefined, `${currentSourceName} [${sheet}]`);
        if (parsed.contacts.length > 0) {
          allContacts.push(...parsed.contacts);
          parsed.headers.forEach((h) => allHeadersSet.add(h));
          if (!detectedMap.nombreCol && parsed.detectedMapping.nombreCol) {
            detectedMap = parsed.detectedMapping;
          }
        }
      }

      if (allContacts.length === 0) {
        setErrorMessage('No se encontraron registros de clientes en las hojas del archivo Excel.');
        return;
      }

      const mergedHeaders = Array.from(allHeadersSet);
      const stats = onImportSuccess(allContacts, mergedHeaders, detectedMap, undefined, 'append');

      setSuccessInfo(
        `¡Se importaron las ${excelSheetNames.length} hojas de Excel! Se añadieron ${stats?.addedCount ?? allContacts.length} contactos a la lista (Total: ${stats?.totalCount ?? allContacts.length}).`
      );
    } catch (err: any) {
      setErrorMessage(`Error al procesar todas las hojas: ${err.message || err}`);
    }
  };

  // Cambio de columna mapeada
  const handleColumnChange = (field: keyof ColumnMapping, newCol: string) => {
    const updated = { ...currentMapping, [field]: newCol };
    onMappingChange(updated);
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

      {/* Barra de Modo de Importación y Control de Acumulación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/90 rounded-xl p-3 sm:px-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">Comportamiento al cargar planillas:</span>
          <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/50">
            <button
              type="button"
              onClick={() => onImportModeChange('append')}
              className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 text-xs ${
                importMode === 'append'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Conserva todos los contactos cargados previamente y añade los de la nueva planilla"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir a la lista (Acumular)</span>
            </button>
            <button
              type="button"
              onClick={() => onImportModeChange('replace')}
              className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 text-xs ${
                importMode === 'replace'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Borra la lista anterior y deja únicamente los datos de la nueva planilla"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reemplazar lista</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/70">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Files className="w-4 h-4 text-emerald-600" />
            <span>Contactos acumulados: <strong className="text-slate-900 font-bold">{totalContactsCount}</strong></span>
          </div>
          {totalContactsCount > 0 && (
            <button
              type="button"
              onClick={onClearContacts}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors font-medium text-[11px]"
              title="Vaciar la lista para comenzar una nueva tanda"
            >
              <Trash2 className="w-3 h-3" />
              <span>Vaciar lista</span>
            </button>
          )}
        </div>
      </div>

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
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFilesUpload(e.dataTransfer.files);
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
            multiple
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesUpload(e.target.files);
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
            Subir archivo(s) Excel o CSV (.xlsx, .xls, .csv)
          </span>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Haz clic o arrastra 1 o más archivos para añadirlos a la lista
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap justify-center">
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              Excel .XLSX / .XLS
            </span>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              .CSV
            </span>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              Múltiples planillas soportadas
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
          <div className="flex items-center gap-2 flex-wrap">
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
            <button
              type="button"
              onClick={handleLoadAllSheets}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Procesa y añade los clientes de todas las hojas de este libro"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Añadir todas las hojas ({excelSheetNames.length})</span>
            </button>
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
                Prefijos JC (181, 417, 135, 136, 170) / Bosch (950, 960, 301, 304, 302, 171)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
