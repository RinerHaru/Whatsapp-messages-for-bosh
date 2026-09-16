import React from 'react';
import { Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Contact } from '../types';

interface StatsCardsProps {
  contacts: Contact[];
  currentFilter: string;
  onFilterChange: (filter: 'all' | 'Pendiente' | 'Enviado' | 'invalid') => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  contacts,
  currentFilter,
  onFilterChange,
}) => {
  const total = contacts.length;
  const pendientes = contacts.filter((c) => c.estado === 'Pendiente').length;
  const enviados = contacts.filter((c) => c.estado === 'Enviado').length;
  const invalidos = contacts.filter((c) => !c.telefonoValido).length;

  const percentageSent = total > 0 ? Math.round((enviados / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {/* Total */}
      <button
        type="button"
        onClick={() => onFilterChange('all')}
        className={`text-left p-4 rounded-xl border transition-all ${
          currentFilter === 'all'
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              currentFilter === 'all' ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            Total Clientes
          </span>
          <Users
            className={`w-4 h-4 ${
              currentFilter === 'all' ? 'text-slate-300' : 'text-slate-400'
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold">{total}</span>
          <span
            className={`text-xs ${
              currentFilter === 'all' ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            registros
          </span>
        </div>
      </button>

      {/* Pendientes */}
      <button
        type="button"
        onClick={() => onFilterChange('Pendiente')}
        className={`text-left p-4 rounded-xl border transition-all ${
          currentFilter === 'Pendiente'
            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
            : 'bg-white hover:bg-amber-50/50 border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              currentFilter === 'Pendiente' ? 'text-amber-100' : 'text-amber-600'
            }`}
          >
            Pendientes
          </span>
          <Clock
            className={`w-4 h-4 ${
              currentFilter === 'Pendiente' ? 'text-amber-100' : 'text-amber-500'
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold">{pendientes}</span>
          <span
            className={`text-xs ${
              currentFilter === 'Pendiente' ? 'text-amber-100' : 'text-slate-500'
            }`}
          >
            por avisar
          </span>
        </div>
      </button>

      {/* Enviados */}
      <button
        type="button"
        onClick={() => onFilterChange('Enviado')}
        className={`text-left p-4 rounded-xl border transition-all ${
          currentFilter === 'Enviado'
            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
            : 'bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              currentFilter === 'Enviado' ? 'text-emerald-100' : 'text-emerald-600'
            }`}
          >
            Notificados
          </span>
          <CheckCircle2
            className={`w-4 h-4 ${
              currentFilter === 'Enviado' ? 'text-emerald-100' : 'text-emerald-500'
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold">{enviados}</span>
          <span
            className={`text-xs ${
              currentFilter === 'Enviado' ? 'text-emerald-100' : 'text-slate-500'
            }`}
          >
            ({percentageSent}%)
          </span>
        </div>
      </button>

      {/* Inválidos */}
      <button
        type="button"
        onClick={() => onFilterChange('invalid')}
        className={`text-left p-4 rounded-xl border transition-all ${
          currentFilter === 'invalid'
            ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
            : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              currentFilter === 'invalid' ? 'text-rose-100' : 'text-rose-600'
            }`}
          >
            Tel. con Error
          </span>
          <AlertTriangle
            className={`w-4 h-4 ${
              currentFilter === 'invalid' ? 'text-rose-100' : 'text-rose-500'
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold">{invalidos}</span>
          <span
            className={`text-xs ${
              currentFilter === 'invalid' ? 'text-rose-100' : 'text-slate-500'
            }`}
          >
            a corregir
          </span>
        </div>
      </button>
    </div>
  );
};
