import { Contact } from '../types';
import { sanitizeAndFormatPhone } from '../utils/phoneFormatter';
import { detectEmpresaFromRemito } from '../utils/empresaDetector';

export const SAMPLE_CSV_CONTENT = `Nombre,Telefono,Remito,Factura,Fecha
Alejandro Cetani,+598 99 146 354,18178573,131059983,16/09/2026
Mariana Benítez,098 765 432,950357776,304033377,16/09/2026
Carlos Rodríguez,+54 9 11 4512-8890,41702911,136011808,16/09/2026
Estela Silva,099 234 567,960162040,301400332,16/09/2026
Gonzalo Méndez,091 889 900,13508192,135099112,16/09/2026
Lucía Morales,094 556 778,301400332,301400332,16/09/2026
Fernando Varela,092 112 233,136011808,136011808,16/09/2026
Laura Torres,+54 9 11 00,950000000,302000000,16/09/2026`;

export function getSampleContacts(): Contact[] {
  const rows = [
    {
      nombre: 'Alejandro Cetani',
      telefono: '+598 99 146 354',
      pedido: '18178573',
      extra: { 'Nro de Remito': '18178573', 'Nro Factura': '131059983', 'Fecha': '16/09/2026' },
    },
    {
      nombre: 'Mariana Benítez',
      telefono: '098 765 432',
      pedido: '950357776',
      extra: { 'Nro de Remito': '950357776', 'Nro Factura': '304033377', 'Fecha': '16/09/2026' },
    },
    {
      nombre: 'Carlos Rodríguez',
      telefono: '+54 9 11 4512-8890',
      pedido: '41702911',
      extra: { 'Nro de Remito': '41702911', 'Nro Factura': '136011808', 'Fecha': '16/09/2026' },
    },
    {
      nombre: 'Estela Silva',
      telefono: '099 234 567',
      pedido: '960162040',
      extra: { 'Nro de Remito': '960162040', 'Nro Factura': '301400332', 'Fecha': '16/09/2026' },
    },
    {
      nombre: 'Gonzalo Méndez',
      telefono: '091 889 900',
      pedido: '13508192',
      extra: { 'Nro de Remito': '13508192', 'Nro Factura': '135099112', 'Fecha': '16/09/2026' },
    },
    {
      nombre: 'Lucía Morales',
      telefono: '094 556 778',
      pedido: '301400332',
      extra: { 'Nro de Remito': '301400332', 'Nro Factura': '301400332', 'Fecha': '16/09/2026' },
    },
    {
      nombre: 'Fernando Varela',
      telefono: '092 112 233',
      pedido: '136011808',
      extra: { 'Nro de Remito': '136011808', 'Nro Factura': '136011808', 'Fecha': '16/09/2026' },
    },
    {
      nombre: 'Laura Torres',
      telefono: '+54 9 11 00',
      pedido: '950000000',
      extra: { 'Nro de Remito': '950000000', 'Nro Factura': '302000000', 'Fecha': '16/09/2026' },
    },
  ];

  return rows.map((r, index) => {
    const phoneRes = sanitizeAndFormatPhone(r.telefono, 'auto');
    const empRes = detectEmpresaFromRemito(r.pedido, r.extra);
    return {
      id: `sample-${index + 1}`,
      nombre: r.nombre,
      telefono: r.telefono,
      telefonoFormateado: phoneRes.formatted,
      telefonoValido: phoneRes.isValid,
      telefonoError: phoneRes.error,
      pedido: r.pedido,
      empresa: empRes.empresa,
      empresaPrefix: empRes.matchedPrefix,
      estado: index === 0 ? 'Enviado' : 'Pendiente',
      enviadoAt: index === 0 ? 'Hoy 10:15 hs' : undefined,
      paisDetectado: phoneRes.country,
      datosExtra: r.extra,
    };
  });
}
