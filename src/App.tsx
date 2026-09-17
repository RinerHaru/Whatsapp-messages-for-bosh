import React, { useState } from 'react';
import { StatsCards } from './components/StatsCards';
import { DataImporter } from './components/DataImporter';
import { TemplateEditor } from './components/TemplateEditor';
import { ContactsTable } from './components/ContactsTable';
import { DocumentationModal } from './components/DocumentationModal';
import { StandaloneExportModal } from './components/StandaloneExportModal';
import { Contact, ColumnMapping, TemplateConfig } from './types';
import { getSampleContacts, SAMPLE_CSV_CONTENT } from './data/sampleContacts';
import { DEFAULT_TEMPLATE } from './utils/messageFormatter';
import { sanitizeAndFormatPhone } from './utils/phoneFormatter';

export default function App() {
  // Contactos inicializados con datos de muestra para que la app sea interactiva desde el primer segundo
  const [contacts, setContacts] = useState<Contact[]>(() => {
    return getSampleContacts();
  });

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

  // Carga de nuevos contactos desde CSV o Google Sheets
  const handleImportSuccess = (
    newContacts: Contact[],
    newHeaders: string[],
    newMapping: ColumnMapping,
    rawText?: string
  ) => {
    setContacts(newContacts);
    setHeaders(newHeaders);
    setCurrentMapping(newMapping);
    if (rawText) {
      setRawCsvText(rawText);
    }
    if (newContacts.length > 0) {
      setSelectedContactId(newContacts[0].id);
    }
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
    setHeaders(['Nombre', 'Telefono', 'Pedido', 'Fecha', 'Detalle']);
    setCurrentMapping({
      nombreCol: 'Nombre',
      telefonoCol: 'Telefono',
      pedidoCol: 'Pedido',
    });
    setRawCsvText(SAMPLE_CSV_CONTENT);
    setSelectedContactId(samples[0]?.id);
  };

  // Limpiar lista
  const handleClear = () => {
    if (window.confirm('¿Seguro que deseas vaciar la lista actual de clientes?')) {
      setContacts([]);
      setSelectedContactId(undefined);
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
      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Métricas y Resumen */}
        <StatsCards
          contacts={contacts}
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
        />

        {/* Paso 1: Importador de Datos */}
        <DataImporter
          onImportSuccess={handleImportSuccess}
          defaultCountryCode={templateConfig.defaultCountryCode}
          onCountryCodeChange={handleCountryCodeChange}
          headers={headers}
          currentMapping={currentMapping}
          onMappingChange={setCurrentMapping}
          rawCsvText={rawCsvText}
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
