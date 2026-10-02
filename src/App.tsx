import React, { useState } from 'react';
import { 
  Building2, 
  Building, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Trash2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { StatsCards } from './components/StatsCards';
import { DataImporter } from './components/DataImporter';
import { TemplateEditor } from './components/TemplateEditor';
import { ContactsTable } from './components/ContactsTable';
import { DocumentationModal } from './components/DocumentationModal';
import { StandaloneExportModal } from './components/StandaloneExportModal';
import { Contact, ColumnMapping, TemplateConfig, ImportStats } from './types';
import { getSampleContacts, SAMPLE_CSV_CONTENT } from './data/sampleContacts';
import { DEFAULT_TEMPLATE } from './utils/messageFormatter';
import { sanitizeAndFormatPhone } from './utils/phoneFormatter';
import { detectEmpresaFromRemito } from './utils/empresaDetector';

export default function App() {
  // Contactos inicializados con datos de muestra para que la app sea interactiva desde el primer segundo
  const [contacts, setContacts] = useState<Contact[]>(() => {
    return getSampleContacts();
  });

  // Indica si la lista actual contiene únicamente los datos de muestra iniciales
  const [isSampleData, setIsSampleData] = useState<boolean>(true);

  // Modo de importación: 'append' (añadir/acumular, por defecto) o 'replace' (reemplazar)
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const [headers, setHeaders] = useState<string[]>([
    'Nombre',
    'Telefono',
    'Pedido',
    'Fecha',
    'Detalle',
  ]);

  const [currentMapping, setCurrentMapping] = useState<ColumnMapping>({
    nombreCol: 'Nombre',
    telefonoCol: 'Telefono',
    pedidoCol: 'Pedido',
  });

  const [rawCsvText, setRawCsvText] = useState<string>(SAMPLE_CSV_CONTENT);

  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({
    template: DEFAULT_TEMPLATE,
    defaultCountryCode: 'auto',
    empresa: 'Juan Construye',
    horario: 'Lunes a Viernes de 09:00 a 19:00 hs',
    tienda: 'Local Central (Av. Corrientes 1234)',
  });

  const [currentFilter, setCurrentFilter] = useState<'all' | 'Pendiente' | 'Enviado' | 'invalid'>('all');
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(
    contacts[0]?.id
  );

  // Modales
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Manejador de cambio de código de país por defecto
  const handleCountryCodeChange = (newCode: string) => {
    setTemplateConfig((prev) => ({ ...prev, defaultCountryCode: newCode }));

    // Recalcular el formateo de los teléfonos existentes
    setContacts((prev) =>
      prev.map((c) => {
        const res = sanitizeAndFormatPhone(c.telefono, newCode);
        return {
          ...c,
          telefonoFormateado: res.formatted,
          telefonoValido: res.isValid,
          telefonoError: res.error,
          paisDetectado: res.country,
        };
      })
    );
  };

  // Carga de nuevos contactos desde CSV, Excel o Google Sheets con opción de añadir (acumular) o reemplazar
  const handleImportSuccess = (
    newContacts: Contact[],
    newHeaders: string[],
    newMapping: ColumnMapping,
    rawText?: string,
    modeOverride?: 'append' | 'replace'
  ): ImportStats => {
    const effectiveMode = modeOverride || importMode;

    // Fusionar encabezados para mantener disponibles todas las etiquetas detectadas
    setHeaders((prev) => Array.from(new Set([...prev, ...newHeaders])));
    setCurrentMapping(newMapping);
    if (rawText) {
      setRawCsvText(rawText);
    }

    // Caso 1: Reemplazo explícito O reemplazo inicial si sólo había datos demo de muestra
    if (effectiveMode === 'replace' || (isSampleData && contacts.length <= 8)) {
      setContacts(newContacts);
      setIsSampleData(false);
      if (newContacts.length > 0) {
        setSelectedContactId(newContacts[0].id);
      }
      return {
        addedCount: newContacts.length,
        duplicateCount: 0,
        totalCount: newContacts.length,
        wasSampleReplaced: isSampleData,
      };
    }

    // Caso 2: MODO AÑADIR (Acumular planillas sin borrar lo anterior)
    let addedCount = 0;
    let duplicateCount = 0;

    // Conjunto de claves para evitar órdenes duplicadas exactas
    const existingOrderKeys = new Set<string>();
    const existingPhoneNameKeys = new Set<string>();

    for (const c of contacts) {
      const cleanP = (c.pedido || '').trim().toLowerCase();
      const cleanPh = (c.telefonoFormateado || c.telefono || '').replace(/\D/g, '');
      const cleanN = (c.nombre || '').trim().toLowerCase();

      if (cleanP && cleanPh) {
        existingOrderKeys.add(`${cleanP}|${cleanPh}`);
      }
      if (cleanPh && cleanN) {
        existingPhoneNameKeys.add(`${cleanPh}|${cleanN}`);
      }
    }

    const uniqueNew: Contact[] = [];
    for (const nc of newContacts) {
      const cleanP = (nc.pedido || '').trim().toLowerCase();
      const cleanPh = (nc.telefonoFormateado || nc.telefono || '').replace(/\D/g, '');
      const cleanN = (nc.nombre || '').trim().toLowerCase();

      const isDupByOrder = cleanP && cleanPh && existingOrderKeys.has(`${cleanP}|${cleanPh}`);
      const isDupByPhoneName = cleanPh && cleanN && existingPhoneNameKeys.has(`${cleanPh}|${cleanN}`);

      if (isDupByOrder || isDupByPhoneName) {
        duplicateCount++;
      } else {
        if (cleanP && cleanPh) existingOrderKeys.add(`${cleanP}|${cleanPh}`);
        if (cleanPh && cleanN) existingPhoneNameKeys.add(`${cleanPh}|${cleanN}`);
        uniqueNew.push(nc);
        addedCount++;
      }
    }

    setContacts((prev) => [...prev, ...uniqueNew]);
    setIsSampleData(false);

    if (!selectedContactId && uniqueNew.length > 0) {
      setSelectedContactId(uniqueNew[0].id);
    }

    return {
      addedCount,
      duplicateCount,
      totalCount: contacts.length + uniqueNew.length,
      wasSampleReplaced: false,
    };
  };

  // Actualizar mapeo de columnas y sincronizar datos en todos los contactos acumulados
  const handleMappingChange = (newMapping: ColumnMapping) => {
    setCurrentMapping(newMapping);

    setContacts((prev) =>
      prev.map((c) => {
        if (!c.datosExtra) return c;
        const newNombre =
          newMapping.nombreCol && c.datosExtra[newMapping.nombreCol] !== undefined
            ? c.datosExtra[newMapping.nombreCol]
            : c.nombre;
        const newTel =
          newMapping.telefonoCol && c.datosExtra[newMapping.telefonoCol] !== undefined
            ? c.datosExtra[newMapping.telefonoCol]
            : c.telefono;
        const newPed =
          newMapping.pedidoCol && c.datosExtra[newMapping.pedidoCol] !== undefined
            ? c.datosExtra[newMapping.pedidoCol]
            : c.pedido;

        const phoneRes = sanitizeAndFormatPhone(newTel, templateConfig.defaultCountryCode);
        const empRes = detectEmpresaFromRemito(newPed, c.datosExtra);

        return {
          ...c,
          nombre: String(newNombre).trim(),
          telefono: String(newTel).trim(),
          telefonoFormateado: phoneRes.formatted,
          telefonoValido: phoneRes.isValid,
          telefonoError: phoneRes.error,
          pedido: String(newPed).trim(),
          empresa: empRes.empresa || c.empresa,
          empresaPrefix: empRes.matchedPrefix || c.empresaPrefix,
        };
      })
    );
  };

  // Cambiar estado de contacto
  const handleUpdateStatus = (contactId: string, newStatus: 'Pendiente' | 'Enviado') => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) {
          return {
            ...c,
            estado: newStatus,
            enviadoAt:
              newStatus === 'Enviado'
                ? `Enviado ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : undefined,
          };
        }
        return c;
      })
    );
  };

  // Eliminar contacto
  const handleDeleteContact = (contactId: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  // Cargar datos de muestra
  const handleLoadSample = () => {
    const samples = getSampleContacts();
    setContacts(samples);
    setIsSampleData(true);
    setHeaders(['Nombre', 'Telefono', 'Pedido', 'Fecha', 'Detalle']);
    setCurrentMapping({
      nombreCol: 'Nombre',
      telefonoCol: 'Telefono',
      pedidoCol: 'Pedido',
    });
    setRawCsvText(SAMPLE_CSV_CONTENT);
    setSelectedContactId(samples[0]?.id);
  };

  // Limpiar lista completa
  const handleClear = () => {
    if (window.confirm('¿Seguro que deseas vaciar todos los contactos de la lista actual?')) {
      setContacts([]);
      setSelectedContactId(undefined);
      setIsSampleData(false);
    }
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || contacts[0];

  // Columnas extras detectadas
  const extraColumns = headers.filter(
    (h) =>
      h !== currentMapping.nombreCol &&
      h !== currentMapping.telefonoCol &&
      h !== currentMapping.pedidoCol
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Barra de Navegación Superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs font-bold text-lg">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Notificador de Pedidos WhatsApp
                </h1>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded">
                    Juan Construye
                  </span>
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.2 rounded">
                    Bosch & Cia
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Carga múltiples planillas de arribos y envía avisos con 1 clic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDocsOpen(true)}
              type="button"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Documentación</span>
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              type="button"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar</span>
            </button>

            {contacts.length === 0 ? (
              <button
                onClick={handleLoadSample}
                type="button"
                className="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cargar ejemplo</span>
              </button>
            ) : (
              <button
                onClick={handleClear}
                type="button"
                className="text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                title="Vaciar todos los contactos de la lista actual"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar ({contacts.length})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Métricas y Resumen */}
        <StatsCards
          contacts={contacts}
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
        />

        {/* Paso 1: Importador de Datos (Con soporte para añadir múltiples planillas) */}
        <DataImporter
          onImportSuccess={handleImportSuccess}
          defaultCountryCode={templateConfig.defaultCountryCode}
          onCountryCodeChange={handleCountryCodeChange}
          headers={headers}
          currentMapping={currentMapping}
          onMappingChange={handleMappingChange}
          rawCsvText={rawCsvText}
          importMode={importMode}
          onImportModeChange={setImportMode}
          totalContactsCount={contacts.length}
          onClearContacts={handleClear}
        />

        {/* Paso 2: Editor de Mensaje y Vista Previa */}
        <TemplateEditor
          config={templateConfig}
          onChangeConfig={setTemplateConfig}
          selectedContact={selectedContact}
          availableExtraColumns={extraColumns}
          headers={headers}
        />

        {/* Paso 3: Tabla Interactiva con Envío a WhatsApp */}
        <ContactsTable
          contacts={contacts}
          templateConfig={templateConfig}
          onCountryCodeChange={handleCountryCodeChange}
          onUpdateStatus={handleUpdateStatus}
          onDeleteContact={handleDeleteContact}
          onSelectContactForPreview={(c) => setSelectedContactId(c.id)}
          selectedContactId={selectedContactId}
          onClearContacts={handleClear}
        />

      </main>

      {/* Modales */}
      <DocumentationModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <StandaloneExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
