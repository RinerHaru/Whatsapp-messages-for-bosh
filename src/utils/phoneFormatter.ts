/**
 * Utilidades para sanitización, formateo y validación de números de WhatsApp
 * y generación de enlaces oficiales wa.me sin forzar códigos de área.
 */

export interface DetectedCountry {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export interface PhoneFormatResult {
  formatted: string;
  isValid: boolean;
  error?: string;
  country?: DetectedCountry;
}

// Prefijos internacionales ordenados por longitud descendente para evitar ambigüedades (ej. 593 antes de 59)
export const SUPPORTED_COUNTRIES: (DetectedCountry & { minLen: number; maxLen: number })[] = [
  { name: 'Ecuador', code: 'EC', dialCode: '593', flag: '🇪🇨', minLen: 11, maxLen: 12 },
  { name: 'Uruguay', code: 'UY', dialCode: '598', flag: '🇺🇾', minLen: 11, maxLen: 11 },
  { name: 'Paraguay', code: 'PY', dialCode: '595', flag: '🇵🇾', minLen: 11, maxLen: 12 },
  { name: 'Bolivia', code: 'BO', dialCode: '591', flag: '🇧🇴', minLen: 11, maxLen: 11 },
  { name: 'Guatemala', code: 'GT', dialCode: '502', flag: '🇬🇹', minLen: 11, maxLen: 11 },
  { name: 'El Salvador', code: 'SV', dialCode: '503', flag: '🇸🇻', minLen: 11, maxLen: 11 },
  { name: 'Honduras', code: 'HN', dialCode: '504', flag: '🇭🇳', minLen: 11, maxLen: 11 },
  { name: 'Nicaragua', code: 'NI', dialCode: '505', flag: '🇳🇮', minLen: 11, maxLen: 11 },
  { name: 'Costa Rica', code: 'CR', dialCode: '506', flag: '🇨🇷', minLen: 11, maxLen: 11 },
  { name: 'Panamá', code: 'PA', dialCode: '507', flag: '🇵🇦', minLen: 11, maxLen: 11 },
  { name: 'Argentina', code: 'AR', dialCode: '54', flag: '🇦🇷', minLen: 12, maxLen: 13 },
  { name: 'México', code: 'MX', dialCode: '52', flag: '🇲🇽', minLen: 12, maxLen: 13 },
  { name: 'Colombia', code: 'CO', dialCode: '57', flag: '🇨🇴', minLen: 12, maxLen: 12 },
  { name: 'España', code: 'ES', dialCode: '34', flag: '🇪🇸', minLen: 11, maxLen: 11 },
  { name: 'Chile', code: 'CL', dialCode: '56', flag: '🇨🇱', minLen: 11, maxLen: 11 },
  { name: 'Perú', code: 'PE', dialCode: '51', flag: '🇵🇪', minLen: 11, maxLen: 11 },
  { name: 'Venezuela', code: 'VE', dialCode: '58', flag: '🇻🇪', minLen: 12, maxLen: 12 },
  { name: 'Brasil', code: 'BR', dialCode: '55', flag: '🇧🇷', minLen: 12, maxLen: 13 },
  { name: 'Italia', code: 'IT', dialCode: '39', flag: '🇮🇹', minLen: 11, maxLen: 12 },
  { name: 'Francia', code: 'FR', dialCode: '33', flag: '🇫🇷', minLen: 11, maxLen: 11 },
  { name: 'Reino Unido', code: 'GB', dialCode: '44', flag: '🇬🇧', minLen: 11, maxLen: 12 },
  { name: 'Alemania', code: 'DE', dialCode: '49', flag: '🇩🇪', minLen: 11, maxLen: 13 },
  { name: 'Estados Unidos / Canadá', code: 'US', dialCode: '1', flag: '🇺🇸', minLen: 11, maxLen: 11 },
];

/**
 * Detecta si una cadena de dígitos ya posee un código de país internacional conocido
 */
export function detectCountryFromDigits(digits: string): DetectedCountry | null {
  for (const country of SUPPORTED_COUNTRIES) {
    if (digits.startsWith(country.dialCode)) {
      // Verificar si la longitud total es compatible con un número internacional completo
      if (digits.length >= country.minLen - 1 && digits.length <= country.maxLen + 1) {
        return {
          name: country.name,
          code: country.code,
          dialCode: country.dialCode,
          flag: country.flag,
        };
      }
    }
  }
  return null;
}

/**
 * Sanitiza y formatea el teléfono respetando el código de país que ya traiga el número.
 * NUNCA fuerza +54 salvo que el usuario lo elija explícitamente para números locales.
 */
export function sanitizeAndFormatPhone(
  raw: string | number | undefined | null,
  defaultCountryCode = 'auto'
): PhoneFormatResult {
  if (raw === undefined || raw === null) {
    return { formatted: '', isValid: false, error: 'Número no provisto' };
  }

  const rawStr = String(raw).trim();
  if (!rawStr) {
    return { formatted: '', isValid: false, error: 'Número vacío' };
  }

  const hasLeadingPlus = rawStr.startsWith('+');
  let digitsOnly = rawStr.replace(/\D/g, '');

  if (!digitsOnly) {
    return { formatted: '', isValid: false, error: 'No contiene dígitos válidos' };
  }

  // Quitar prefijo 00 de marcación internacional si estuviese presente
  if (digitsOnly.startsWith('00')) {
    digitsOnly = digitsOnly.substring(2);
  }

  let finalNumber = digitsOnly;
  let detected = detectCountryFromDigits(digitsOnly);

  // Si ya tiene un código de país detectado (ej: 52 México, 57 Colombia, 34 España, 56 Chile, etc.)
  if (detected) {
    // Caso particular Argentina: WhatsApp exige anteponer el 9 para celulares (+54 9 ...)
    if (detected.dialCode === '54') {
      if (finalNumber.startsWith('54') && !finalNumber.startsWith('549') && finalNumber.length >= 12) {
        finalNumber = '549' + finalNumber.substring(2);
      }
    }
  } else {
    // Si NO se detectó un país conocido y tampoco vino con + (ej. número local de 7 a 10 dígitos)
    const cleanDefault = defaultCountryCode.replace(/\D/g, '');
    
    // Solo aplicar prefijo por defecto si el usuario especificó uno válido (distinto de 'auto', 'none' o vacío)
    if (cleanDefault && defaultCountryCode !== 'auto' && defaultCountryCode !== 'none') {
      const defaultCountry = SUPPORTED_COUNTRIES.find((c) => c.dialCode === cleanDefault);
      
      if (cleanDefault === '54') {
        let local = digitsOnly;
        if (local.startsWith('15')) local = local.substring(2);
        if (local.startsWith('0')) local = local.substring(1);
        finalNumber = `549${local}`;
      } else if (cleanDefault === '52') {
        finalNumber = `52${digitsOnly}`;
      } else {
        finalNumber = `${cleanDefault}${digitsOnly}`;
      }

      if (defaultCountry) {
        detected = {
          name: defaultCountry.name,
          code: defaultCountry.code,
          dialCode: defaultCountry.dialCode,
          flag: defaultCountry.flag,
        };
      }
    }
  }

  // Validación de longitud general E.164 (entre 8 y 16 dígitos)
  if (finalNumber.length < 8) {
    return {
      formatted: finalNumber,
      isValid: false,
      error: `Número demasiado corto (${finalNumber.length} dígitos)`,
      country: detected || undefined,
    };
  }

  if (finalNumber.length > 16) {
    return {
      formatted: finalNumber,
      isValid: false,
      error: `Número excede la longitud estándar (${finalNumber.length} dígitos)`,
      country: detected || undefined,
    };
  }

  return {
    formatted: finalNumber,
    isValid: true,
    country: detected || undefined,
  };
}

/**
 * Genera el enlace directo de WhatsApp wa.me
 */
export function buildWhatsAppLink(cleanPhone: string, messageText: string): string {
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
