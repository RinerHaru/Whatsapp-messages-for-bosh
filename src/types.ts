export type ContactStatus = 'Pendiente' | 'Mensaje Generado' | 'Enviado';
export type EmpresaTipo = 'Juan Construye' | 'Bosch & Cia';

export interface Contact {
  id: string;
  nombre: string;
  telefono: string;
  telefonoFormateado: string;
  telefonoValido: boolean;
  telefonoError?: string;
  pedido: string;
  empresa?: EmpresaTipo;
  empresaPrefix?: string;
  estado: ContactStatus;
  enviadoAt?: string;
  paisDetectado?: { name: string; flag: string; dialCode: string };
  datosExtra?: Record<string, string>;
}

export interface ColumnMapping {
  nombreCol: string;
  telefonoCol: string;
  pedidoCol: string;
}

export interface TemplateConfig {
  template: string;
  defaultCountryCode: string; // e.g. '54', '52', '34', '57', etc.
  horario: string;
  tienda: string;
}

export interface CountryCodeOption {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  example: string;
}
