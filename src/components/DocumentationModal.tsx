import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Smartphone, 
  HelpCircle, 
  Zap, 
  ShieldAlert, 
  Copy, 
  Check 
} from 'lucide-react';
import { SAMPLE_CSV_CONTENT } from '../data/sampleContacts';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'whatsapp' | 'api' | 'errors'>('csv');
  const [copiedCsv, setCopiedCsv] = useState(false);

  if (!isOpen) return null;

  const copyCsvTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_CSV_CONTENT);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              📚
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Guía de Uso, Estructura de Datos y API
              </h3>
              <p className="text-xs text-slate-500">
                Documentación técnica para el operador y desarrollador
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-slate-200 px-5 bg-slate-50/50 text-xs font-semibold gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('csv')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'csv'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            1. Excel, Sheets & CSV
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            2. Formato de Teléfonos
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            3. Escalabilidad WhatsApp API
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'errors'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            4. Manejo de Errores
          </button>
        </div>

        {/* Contenido Modal */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          
          {/* TAB 1: CSV */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Estructura recomendada para el archivo CSV o Google Sheets
              </h4>
              <p>
                La aplicación autodetecta las columnas por palabras clave (ej: <code>nombre</code>, <code>telefono</code>, <code>pedido</code>). También puedes incluir cualquier columna adicional (como <code>Fecha</code> o <code>Detalle</code>) y usarla como etiqueta <code>{'{Detalle}'}</code> en tu plantilla.
              </p>

              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] relative">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-slate-400">
                  <span>plantilla_pedidos.csv</span>
                  <button
                    onClick={copyCsvTemplate}
                    className="flex items-center gap-1 text-slate-300 hover:text-white"
                  >
                    {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCsv ? 'Copiado' : 'Copiar CSV'}
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre">{SAMPLE_CSV_CONTENT}</pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-950">
                  <h5 className="font-bold mb-1 flex items-center gap-1.5 text-emerald-900">
                    <span>📊</span> Google Sheets
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-900/90">
                    <li>Abre tu hoja de Google Sheets.</li>
                    <li>Haz clic en el botón <strong>Compartir</strong> (arriba a la derecha).</li>
                    <li>Selecciona <strong>"Cualquier persona con el enlace"</strong> (Lector).</li>
                    <li>Copia y pega la URL en el Paso 1 de la app.</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-blue-950">
                  <h5 className="font-bold mb-1 flex items-center gap-1.5 text-blue-900">
                    <span>📗</span> Excel (OneDrive / SharePoint)
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-blue-900/90">
                    <li>Abre tu archivo Excel en OneDrive o SharePoint.</li>
                    <li>Haz clic en <strong>Compartir</strong> &gt; <strong>Copiar vínculo</strong>.</li>
                    <li>Asegúrate de permitir acceso a cualquier persona con el vínculo.</li>
                    <li>Pega el enlace en el Paso 1 (o arrastra el archivo .xlsx).</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Teléfonos */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Requisitos del Protocolo WhatsApp (wa.me)
              </h4>
              <p>
                La API oficial de enlaces web de WhatsApp (<code>https://wa.me/{'<numero>'}?text={'<texto>'}</code>) requiere un número telefónico en <strong>formato internacional puro (sin el símbolo '+', sin espacios, sin guiones ni paréntesis)</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="font-bold text-rose-800 block mb-1">❌ Formatos que fallan en wa.me:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                    <li><code>+54 9 11 4512-8890</code> (con + y espacios)</li>
                    <li><code>(011) 15-4512-8890</code> (con 0 y 15 local)</li>
                    <li><code>4512-8890</code> (sin código de país)</li>
                  </ul>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="font-bold text-emerald-800 block mb-1">✅ Lo que la app genera automáticamente:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-emerald-700">
                    <li><code>5491145128890</code> (Argentina móvil con 9)</li>
                    <li><code>525541239901</code> (México)</li>
                    <li><code>34612345678</code> (España)</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <h5 className="font-semibold text-slate-800 mb-1">Regla especial Argentina (54):</h5>
                <p className="text-slate-600">
                  Para enviar mensajes a celulares de Argentina, WhatsApp exige anteponer el prefijo <code>9</code> después del 54 (quedando <code>549...</code>) y omitir el <code>0</code> del código de área y el <code>15</code> local. Nuestra app realiza esta normalización de forma transparente.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Escalabilidad API */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Sugerencias de Escalabilidad para Envío Masivo Automatizado
              </h4>
              <p>
                Actualmente, el método de <code>wa.me</code> requiere la interacción del usuario (un clic por cliente) para cumplir las políticas de usuario y evitar bloqueos por SPAM. Si el negocio escala a cientos o miles de pedidos diarios, se recomienda migrar a:
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-800 mb-1">1. Meta WhatsApp Cloud API (Oficial)</h5>
                  <p className="text-slate-600">
                    Permite enviar mensajes usando endpoints HTTP REST directamente desde un backend (Node.js/Python). Requiere:
                  </p>
                  <ul className="list-disc list-inside mt-1 text-slate-600 space-y-0.5">
                    <li>Cuenta comercial verificada en Meta Business Manager.</li>
                    <li>Plantillas de mensaje aprobadas (HSM) para notificaciones fuera de la ventana de 24 horas.</li>
                    <li>Costo por conversación iniciado por el negocio (centavos de dólar según el país).</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-800 mb-1">2. Proveedores BSP (Twilio, MessageBird, Z-API)</h5>
                  <p className="text-slate-600">
                    Plataformas que facilitan la integración mediante SDKs sencillos:
                  </p>
                  <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[10px] mt-1.5">
                    <code>
                      client.messages.create(&#123; body: 'Tu pedido está listo', from: 'whatsapp:+14155238886', to: 'whatsapp:+54911...' &#125;)
                    </code>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-800 mb-1">3. Webhooks para Estado de Entrega</h5>
                  <p className="text-slate-600">
                    Con la API oficial puedes recibir webhooks en tiempo real con los eventos: <code>sent</code>, <code>delivered</code>, <code>read</code> y respuestas del cliente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Errores */}
          {activeTab === 'errors' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                Manejo de Errores y Validaciones Implementadas
              </h4>

              <div className="space-y-2">
                <div className="border border-slate-200 rounded-xl p-3">
                  <span className="font-bold text-slate-800">1. Número con longitud inválida</span>
                  <p className="text-slate-600 mt-0.5">
                    Si un teléfono tiene menos de 8 dígitos o más de 16, la app lo marca con una insignia roja de advertencia y deshabilita el botón de envío para evitar links rotos.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3">
                  <span className="font-bold text-slate-800">2. Bloqueo de CORS o Hoja Privada en Google Sheets</span>
                  <p className="text-slate-600 mt-0.5">
                    Si Google Sheets devuelve error 401/403 o CORS, la app muestra un mensaje guiando al usuario a cambiar el permiso a "Cualquier persona con el enlace" o usar la descarga local de CSV.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3">
                  <span className="font-bold text-slate-800">3. Bloqueador de ventanas emergentes (Pop-up Blocker)</span>
                  <p className="text-slate-600 mt-0.5">
                    Los navegadores pueden bloquear <code>window.open</code> si no proviene de un clic directo del usuario. Cada botón "Enviar por WhatsApp" es accionado por clic manual explícito para garantizar apertura inmediata.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Entendido, volver a la aplicación
          </button>
        </div>

      </div>
    </div>
  );
};
