import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  RotateCcw, 
  Trash2, 
  Filter, 
  Check, 
  ArrowRightCircle,
  MessageCircle,
  Globe,
  Building2,
  Building
} from 'lucide-react';
import { Contact, TemplateConfig } from '../types';
import { formatMessage } from '../utils/messageFormatter';
import { buildWhatsAppLink, SUPPORTED_COUNTRIES } from '../utils/phoneFormatter';

interface ContactsTableProps {
  contacts: Contact[];
  templateConfig: TemplateConfig;
  onCountryCodeChange?: (newCode: string) => void;
  onUpdateStatus: (contactId: string, newStatus: 'Pendiente' | 'Enviado') => void;
  onDeleteContact: (contactId: string) => void;
  onSelectContactForPreview: (contact: Contact) => void;
  selectedContactId?: string;
}

export const ContactsTable: React.FC<ContactsTableProps> = ({
  contacts,
  templateConfig,
  onCountryCodeChange,
  onUpdateStatus,
  onDeleteContact,
  onSelectContactForPreview,
  selectedContactId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pendiente' | 'Enviado' | 'invalid' | 'Juan Construye' | 'Bosch & Cia'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtrado
  const filteredContacts = contacts.filter((c) => {
    // Filtro por término
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      c.nombre.toLowerCase().includes(lowerSearch) ||
      c.pedido.toLowerCase().includes(lowerSearch) ||
      (c.empresa && c.empresa.toLowerCase().includes(lowerSearch)) ||
      (c.empresaPrefix && c.empresaPrefix.includes(searchTerm)) ||
      c.telefono.includes(searchTerm) ||
      c.telefonoFormateado.includes(searchTerm);

    if (!matchesSearch) return false;

    // Filtro por pestaña o empresa
    if (statusFilter === 'all') return true;
    if (statusFilter === 'invalid') return !c.telefonoValido;
    if (statusFilter === 'Juan Construye') return c.empresa === 'Juan Construye';
    if (statusFilter === 'Bosch & Cia') return c.empresa === 'Bosch & Cia';
    return c.estado === statusFilter;
  });

  const handleSendWhatsApp = (contact: Contact) => {
    if (!contact.telefonoValido) {
      alert(`El teléfono "${contact.telefono}" no es válido: ${contact.telefonoError || 'Error de formato'}`);
      return;
    }

    const messageText = formatMessage(templateConfig.template, contact, templateConfig);
    const waUrl = buildWhatsAppLink(contact.telefonoFormateado, messageText);

    // Abrir en nueva pestaña con seguridad
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Marcar automáticamente como enviado
    onUpdateStatus(contact.id, 'Enviado');
  };

  const handleCopyMessage = (contact: Contact) => {
    const messageText = formatMessage(templateConfig.template, contact, templateConfig);
    navigator.clipboard.writeText(messageText);
    setCopiedId(contact.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Enviar siguiente pendiente de forma ágil
  const nextPending = contacts.find((c) => c.estado === 'Pendiente' && c.telefonoValido);
  const handleSendNext = () => {
    if (nextPending) {
      handleSendWhatsApp(nextPending);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      {/* Barra de Herramientas de la Tabla */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              3
            </span>
            Listado de Contactos y Envío
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mostrando {filteredContacts.length} de {contacts.length} contactos
          </p>
        </div>

        {/* Búsqueda y Botón Acción Siguiente */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, pedido o teléfono..."
              className="text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {nextPending && (
            <button
              onClick={handleSendNext}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
              title="Abre WhatsApp para el próximo cliente pendiente"
            >
              <ArrowRightCircle className="w-4 h-4" />
              Enviar Siguiente ({nextPending.nombre.split(' ')[0]})
            </button>
          )}
        </div>
      </div>

      {/* Filtros de Pestaña y Selector de Prefijo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({contacts.length})
          </button>
          <button
            onClick={() => setStatusFilter('Juan Construye')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              statusFilter === 'Juan Construye'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
            title="Filtrar clientes con remitos de Juan Construye (prefijos 181, 417, 135, 136)"
          >
            <Building2 className="w-3.5 h-3.5" />
            Juan Construye ({contacts.filter((c) => c.empresa === 'Juan Construye').length})
          </button>
          <button
            onClick={() => setStatusFilter('Bosch & Cia')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              statusFilter === 'Bosch & Cia'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
            }`}
            title="Filtrar clientes con remitos de Bosch & Cia (prefijos 950, 960, 301, 304, 302)"
          >
            <Building className="w-3.5 h-3.5" />
            Bosch & Cia ({contacts.filter((c) => c.empresa === 'Bosch & Cia').length})
          </button>
          <button
            onClick={() => setStatusFilter('Pendiente')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'Pendiente'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pendientes ({contacts.filter((c) => c.estado === 'Pendiente').length})
          </button>
          <button
            onClick={() => setStatusFilter('Enviado')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'Enviado'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Enviados ({contacts.filter((c) => c.estado === 'Enviado').length})
          </button>
          <button
            onClick={() => setStatusFilter('invalid')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'invalid'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Inválidos ({contacts.filter((c) => !c.telefonoValido).length})
          </button>
        </div>

        {/* Configuración de Código de País para Números Locales */}
        {onCountryCodeChange && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs self-start md:self-auto">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-600 font-medium whitespace-nowrap">Código de Área / País:</span>
            <select
              value={templateConfig.defaultCountryCode}
              onChange={(e) => onCountryCodeChange(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="auto">🌐 Automático (Detectar de cada número)</option>
              <option value="none">🚫 Sin prefijo (Conservar original)</option>
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.dialCode + c.code} value={c.dialCode}>
                  {c.flag} {c.name} (+{c.dialCode})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contenedor de la Tabla */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Cliente / Nombre</th>
              <th className="px-4 py-3">Teléfono / WhatsApp</th>
              <th className="px-4 py-3">Empresa / Remito / Detalle</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Acción WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  {contacts.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-600">
                        No hay clientes cargados en la lista
                      </p>
                      <p className="text-xs text-slate-400">
                        Sube un archivo Excel (.xlsx) / CSV en el Paso 1 o pega un enlace de Excel o Google Sheets.
                      </p>
                    </div>
                  ) : (
                    'No hay clientes que coincidan con la búsqueda o filtro actual.'
                  )}
                </td>
              </tr>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = contact.id === selectedContactId;
                return (
                  <tr
                    key={contact.id}
                    onClick={() => onSelectContactForPreview(contact)}
                    className={`transition-colors cursor-pointer ${
                      contact.estado === 'Enviado'
                        ? 'bg-emerald-50/25 hover:bg-emerald-50/50'
                        : isSelected
                        ? 'bg-slate-100/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Nombre */}
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            contact.estado === 'Enviado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {contact.nombre ? contact.nombre.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <span>{contact.nombre || 'Sin nombre'}</span>
                          {contact.enviadoAt && (
                            <span className="block text-[10px] text-emerald-600 font-normal">
                              {contact.enviadoAt}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Teléfono */}
                    <td className="px-4 py-3">
                      {contact.telefonoValido ? (
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium">
                            {contact.paisDetectado ? (
                              <span title={`${contact.paisDetectado.name} (+${contact.paisDetectado.dialCode})`}>
                                {contact.paisDetectado.flag}
                              </span>
                            ) : (
                              <span className="text-slate-400" title="Número internacional">🌐</span>
                            )}
                            <span>+{contact.telefonoFormateado}</span>
                          </div>
                          {contact.telefono !== contact.telefonoFormateado && (
                            <span className="block text-[10px] text-slate-400">
                              Orig: {contact.telefono}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            {contact.telefono || 'Sin número'}
                          </span>
                          <span className="block text-[10px] text-rose-500">
                            {contact.telefonoError}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Pedido, Empresa y detalles de la planilla */}
                    <td className="px-4 py-3 text-slate-600 max-w-sm">
                      <div className="space-y-1.5">
                        {/* Indicador de Empresa */}
                        {contact.empresa === 'Juan Construye' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                            <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Juan Construye</span>
                            {contact.empresaPrefix && (
                              <span 
                                className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-200/60 rounded text-amber-950 font-normal"
                                title={`Prefijo de remito: ${contact.empresaPrefix}`}
                              >
                                #{contact.empresaPrefix}
                              </span>
                            )}
                          </div>
                        ) : contact.empresa === 'Bosch & Cia' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-900 border border-blue-300 shadow-2xs">
                            <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Bosch & Cia</span>
                            {contact.empresaPrefix && (
                              <span 
                                className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-200/60 rounded text-blue-950 font-normal"
                                title={`Prefijo de remito: ${contact.empresaPrefix}`}
                              >
                                #{contact.empresaPrefix}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <span>Empresa no detectada</span>
                          </div>
                        )}

                        {/* Remito / Pedido */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block bg-slate-100/90 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-xs font-semibold max-w-xs truncate" title={contact.pedido}>
                            Remito: <span className="font-mono font-bold text-slate-900">{contact.pedido || 'Sin número'}</span>
                          </span>
                        </div>

                        {/* Columnas adicionales de la planilla */}
                        {contact.datosExtra && Object.keys(contact.datosExtra).length > 0 && (
                          <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 pt-0.5">
                            {Object.entries(contact.datosExtra)
                              .filter(([k, v]) => v && v !== contact.pedido && v !== contact.nombre && v !== contact.telefono)
                              .slice(0, 2)
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  className="bg-slate-50 text-slate-600 border border-slate-200/60 px-1.5 py-0.5 rounded truncate max-w-[150px]"
                                  title={`${k}: ${v}`}
                                >
                                  <span className="font-semibold text-slate-700">{k}:</span> {v}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center">
                      {contact.estado === 'Enviado' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pendiente
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Botón WhatsApp */}
                        {contact.telefonoValido ? (
                          <button
                            onClick={() => handleSendWhatsApp(contact)}
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-2xs ${
                              contact.estado === 'Enviado'
                                ? 'bg-slate-600 hover:bg-slate-700'
                                : 'bg-[#25D366] hover:bg-[#128C7E]'
                            }`}
                            title="Abrir WhatsApp en una nueva pestaña"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            {contact.estado === 'Enviado' ? 'Reenviar' : 'Enviar por WhatsApp'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-rose-500 italic px-2">
                            Corregir teléfono
                          </span>
                        )}

                        {/* Botón Copiar Mensaje */}
                        <button
                          onClick={() => handleCopyMessage(contact)}
                          type="button"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Copiar texto del mensaje al portapapeles"
                        >
                          {copiedId === contact.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Cambiar Estado Manual */}
                        <button
                          onClick={() =>
                            onUpdateStatus(
                              contact.id,
                              contact.estado === 'Enviado' ? 'Pendiente' : 'Enviado'
                            )
                          }
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title={
                            contact.estado === 'Enviado'
                              ? 'Marcar como Pendiente'
                              : 'Marcar como Enviado'
                          }
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Eliminar Fila */}
                        <button
                          onClick={() => onDeleteContact(contact.id)}
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Quitar contacto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
