import { Contact } from '../types';
import { sanitizeAndFormatPhone } from '../utils/phoneFormatter';

export const SAMPLE_CSV_CONTENT = `Nombre,Telefono,Pedido,Fecha,Detalle
Carlos Rodríguez,+54 9 11 4512-8890,ORD-8492,15/09/2026,Zapatillas Deportivas Talle 42
María Fernanda López,+52 55 4123 9901,ORD-8493,15/09/2026,Cafetera Espresso Automática
Alejandro Gómez,+34 612 34 56 78,ORD-8494,15/09/2026,Auriculares Inalámbricos Pro
Sofía Martínez,+57 300 456 7890,ORD-8495,15/09/2026,Kit de Skincare Facial
Lucas Silva,+56 9 8765 4321,ORD-8496,15/09/2026,Reloj Inteligente Fit v2
Valeria Morales,+51 912 345 678,ORD-8497,15/09/2026,Campera Impermeable Negra
Andrés Benítez,1134567890,ORD-8498,15/09/2026,Mochila Urbana Antirrobo (Sin prefijo internacional)
Laura Torres,+54 9 11 0000-00,ORD-8499,15/09/2026,Número incompleto para prueba de error`;

export function getSampleContacts(): Contact[] {
  const rows = [
    {
      nombre: 'Carlos Rodríguez',
      telefono: '+54 9 11 4512-8890',
      pedido: 'ORD-8492 (Zapatillas Deportivas Talle 42)',
      extra: { Fecha: '15/09/2026', Producto: 'Zapatillas' },
    },
    {
      nombre: 'María Fernanda López',
      telefono: '+52 55 4123 9901',
      pedido: 'ORD-8493 (Cafetera Espresso Automática)',
      extra: { Fecha: '15/09/2026', Producto: 'Cafetera' },
    },
    {
      nombre: 'Alejandro Gómez',
      telefono: '+34 612 34 56 78',
      pedido: 'ORD-8494 (Auriculares Inalámbricos Pro)',
      extra: { Fecha: '15/09/2026', Producto: 'Auriculares' },
    },
    {
      nombre: 'Sofía Martínez',
      telefono: '+57 300 456 7890',
      pedido: 'ORD-8495 (Kit de Skincare Facial)',
      extra: { Fecha: '15/09/2026', Producto: 'Skincare' },
    },
    {
      nombre: 'Lucas Silva',
      telefono: '+56 9 8765 4321',
      pedido: 'ORD-8496 (Reloj Inteligente Fit v2)',
      extra: { Fecha: '15/09/2026', Producto: 'Smartwatch' },
    },
    {
      nombre: 'Valeria Morales',
      telefono: '+51 912 345 678',
      pedido: 'ORD-8497 (Campera Impermeable Negra)',
      extra: { Fecha: '15/09/2026', Producto: 'Campera' },
    },
    {
      nombre: 'Andrés Benítez',
      telefono: '1134567890',
      pedido: 'ORD-8498 (Mochila Antirrobo)',
      extra: { Fecha: '15/09/2026', Producto: 'Mochila' },
    },
    {
      nombre: 'Laura Torres',
      telefono: '+54 9 11 00',
      pedido: 'ORD-8499 (Funda Silicona)',
      extra: { Fecha: '15/09/2026', Producto: 'Funda' },
    },
  ];

  return rows.map((r, index) => {
    const phoneRes = sanitizeAndFormatPhone(r.telefono, 'auto');
    return {
      id: `sample-${index + 1}`,
      nombre: r.nombre,
      telefono: r.telefono,
      telefonoFormateado: phoneRes.formatted,
      telefonoValido: phoneRes.isValid,
      telefonoError: phoneRes.error,
      pedido: r.pedido,
      estado: index === 0 ? 'Enviado' : 'Pendiente',
      enviadoAt: index === 0 ? 'Hoy 10:15 hs' : undefined,
      paisDetectado: phoneRes.country,
      datosExtra: r.extra,
    };
  });
}
