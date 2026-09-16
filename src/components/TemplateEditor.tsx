import React, { useRef } from 'react';
import { 
  MessageSquare, 
  RotateCcw, 
  Clock, 
  Store, 
  CheckCheck, 
  Eye, 
  Tag, 
  Sparkles 
} from 'lucide-react';
import { Contact, TemplateConfig } from '../types';
import { formatMessage, DEFAULT_TEMPLATE } from '../utils/messageFormatter';

interface TemplateEditorProps {
  config: TemplateConfig;
  onChangeConfig: (newConfig: TemplateConfig) => void;
  selectedContact?: Contact;
  availableExtraColumns?: string[];
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  config,
  onChangeConfig,
  selectedContact,
  availableExtraColumns = [],
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mockContact: Contact = selectedContact || {
    id: 'demo',
    nombre: 'Carlos Rodríguez',
    telefono: '5491145128890',
    telefonoFormateado: '5491145128890',
    telefonoValido: true,
    pedido: 'ORD-8492 (Zapatillas Deportivas Talle 42)',
    estado: 'Pendiente',
  };

  const previewText = formatMessage(config.template, mockContact, config);

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = config.template;
    const updated = current.substring(0, start) + tag + current.substring(end);
    onChangeConfig({ ...config, template: updated });

    // Devolver el foco
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleReset = () => {
    onChangeConfig({
      ...config,
      template: DEFAULT_TEMPLATE,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              2
            </span>
            Editor de Mensaje & Plantilla Dinámica
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personaliza el texto con variables automáticas para cada cliente
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restablecer Plantilla
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Editor */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Etiquetas dinámicas clickeables */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                Variables Disponibles (Clic para insertar):
              </span>
              <span>Se reemplazarán por fila</span>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => insertTag('{nombre}')}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                title="Nombre del cliente"
              >
                {'{nombre}'}
              </button>
              <button
                type="button"
                onClick={() => insertTag('{pedido}')}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                title="Número o detalle del pedido"
              >
                {'{pedido}'}
              </button>
              <button
                type="button"
                onClick={() => insertTag('{horario}')}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
                title="Horario configurado"
              >
                {'{horario}'}
              </button>
              <button
                type="button"
                onClick={() => insertTag('{tienda}')}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
                title="Nombre del local o sucursal"
              >
                {'{tienda}'}
              </button>

              {availableExtraColumns.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => insertTag(`{${col}}`)}
                  className="px-2.5 py-1 text-xs font-mono font-medium bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                  title={`Columna detectada: ${col}`}
                >
                  {`{${col}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={4}
              value={config.template}
              onChange={(e) => onChangeConfig({ ...config, template: e.target.value })}
              className="w-full text-sm p-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-sans leading-relaxed text-slate-800 bg-white shadow-2xs"
              placeholder="Escribe la plantilla del mensaje aquí..."
            />
            <span className="absolute bottom-2.5 right-3 text-[11px] text-slate-400">
              {config.template.length} caracteres
            </span>
          </div>

          {/* Configuración rápida de Horario y Tienda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Horario de Atención ({'{horario}'}):
              </label>
              <input
                type="text"
                value={config.horario}
                onChange={(e) => onChangeConfig({ ...config, horario: e.target.value })}
                placeholder="Lun a Vie de 09:00 a 19:00 hs"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-slate-500" />
                Nombre del Local / Tienda ({'{tienda}'}):
              </label>
              <input
                type="text"
                value={config.tienda}
                onChange={(e) => onChangeConfig({ ...config, tienda: e.target.value })}
                placeholder="Sucursal Central (Av. Corrientes 1234)"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Vista Previa Simulada de WhatsApp */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              Vista Previa en Vivo de WhatsApp:
            </span>
            <span className="text-[11px] text-slate-400 font-normal truncate max-w-[160px]">
              Cliente: {mockContact.nombre}
            </span>
          </div>

          {/* Marco estilo teléfono / WhatsApp Web chat */}
          <div className="flex-1 rounded-xl bg-[#E5DDD5] border border-[#d1c7bc] p-4 flex flex-col justify-between relative overflow-hidden shadow-inner">
            {/* Patrón de fondo sutil */}
            <div 
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
              }}
            />

            {/* Cabecera del chat simulado */}
            <div className="relative z-10 bg-[#075E54] text-white px-3 py-2 rounded-lg flex items-center gap-2.5 shadow-xs mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-400/30 text-white flex items-center justify-center font-bold text-xs">
                {mockContact.nombre.charAt(0)}
              </div>
              <div className="leading-tight flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{mockContact.nombre}</p>
                <p className="text-[10px] text-emerald-200 truncate">en línea</p>
              </div>
            </div>

            {/* Burbuja de mensaje simulada */}
            <div className="relative z-10 self-end max-w-[90%] bg-white rounded-lg rounded-tr-xs p-3 shadow-sm border border-slate-200/60">
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {previewText}
              </p>
              <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                <span>10:42</span>
                <CheckCheck className="w-3 h-3 text-sky-500" />
              </div>
            </div>

            <div className="relative z-10 mt-3 pt-2 border-t border-[#d1c7bc]/50 text-center">
              <span className="text-[10px] text-slate-500">
                Al hacer clic en "Enviar", se abrirá WhatsApp con este texto codificado
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
