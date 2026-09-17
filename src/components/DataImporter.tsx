import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Link as LinkIcon, 
  Settings2, 
  Globe, 
  Check, 
  AlertCircle, 
  Loader2, 
  FileText,
  HelpCircle
} from 'lucide-react';
import { ColumnMapping, Contact } from '../types';
import { POPULAR_COUNTRIES } from '../data/countries';
import { parseCSVData, normalizeGoogleSheetUrl } from '../utils/csvParser';
import Papa from 'papaparse';

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
  onCountryCodeChange,
  headers,
  currentMapping,
  onMappingChange,
  rawCsvText,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [showMappingDrawer, setShowMappingDrawer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMessage('Por favor sube un archivo con formato .CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setErrorMessage('El archivo CSV está vacío.');
        return;
      }
      processRawText(text, file.name);
    };
    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo desde tu dispositivo.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const processRawText = (text: string, sourceName = 'Archivo CSV') => {
    try {
      const result = parseCSVData(text, defaultCountryCode);

      if (result.contacts.length === 0) {
        setErrorMessage('No se encontraron registros de clientes válidos en el archivo.');
        return;
      }

      onImportSuccess(result.contacts, result.headers, result.detectedMapping, text);
      setSuccessInfo(`¡Cargados ${result.contacts.length} contactos desde ${sourceName}!`);
      setShowMappingDrawer(result.headers.length > 0);
    } catch (err: any) {
      setErrorMessage(`Error al procesar los datos: ${err.message || err}`);
    }
  };

  const handleFetchGoogleSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!googleSheetUrl.trim()) {
      setErrorMessage('Ingresa la URL de la hoja de cálculo de Google Sheets.');
      return;
    }

    const exportUrl = normalizeGoogleSheetUrl(googleSheetUrl);
    setIsLoadingUrl(true);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(
          `Respuesta del servidor: HTTP ${response.status}. Verifica que el documento sea público.`
        );
      }
      const csvText = await response.text();
      
      // Validar que no sea una página HTML de inicio de sesión de Google
      if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
        throw new Error(
          'Google devolvió una página HTML en vez de CSV. Por favor comparte la hoja con "Cualquier persona que tenga el enlace" en modo Lector o usa "Archivo > Compartir > Publicar en la web" como CSV.'
        );
      }

      processRawText(csvText, 'Google Sheets');
    } catch (err: any) {
      setErrorMessage(
        `No se pudo descargar automáticamente: ${err.message || 'Error de conexión/CORS'}. Asegúrate de que el documento esté compartido públicamente o prueba descargar el CSV y subirlo directamente.`
      );
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleColumnChange = (field: keyof ColumnMapping, newCol: string) => {
    const updated = { ...currentMapping, [field]: newCol };
    onMappingChange(updated);
    if (rawCsvText) {
      const reParsed = parseCSVData(rawCsvText, defaultCountryCode, updated);
      onImportSuccess(reParsed.contacts, reParsed.headers, updated, rawCsvText);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              1
            </span>
            Carga de Hoja de Cálculo (CSV / Google Sheets)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Elige subir tu archivo o pegar el enlace de tu Google Sheet público
          </p>
        </div>
      </div>

      {/* Grid de Métodos de Carga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Método A: Subida de CSV */}
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
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800'
              : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 text-slate-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <UploadCloud className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-slate-800">
            Subir archivo local (.CSV)
          </span>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Haz clic aquí para seleccionar tu archivo o arrástralo directamente a esta zona
          </p>
        </div>

        {/* Método B: Google Sheets URL */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="sheets-url-input" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-emerald-600" />
                Vincular Google Sheets
              </label>
              <span className="text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                Público / CSV
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Pega el enlace de tu hoja compartida (modo "Cualquier persona con el enlace"):
            </p>
          </div>

          <form onSubmit={handleFetchGoogleSheets} className="mt-3 flex gap-2">
            <input
              id="sheets-url-input"
              type="url"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
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
        </div>

      </div>

      {/* Alertas de Notificación */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>{errorMessage}</div>
        </div>
      )}

      {successInfo && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{successInfo}</span>
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
