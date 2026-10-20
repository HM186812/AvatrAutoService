/**
 * Utility functions for formatting and launching WhatsApp for Lao PDR and international numbers
 */

/**
 * Normalizes any entered phone number to the standard WhatsApp international number format (digits only, no '+' or leading zeros).
 * Especially handles Lao numbers (020, 030, 021, 20, 856...) and neighboring regions.
 */
export function formatWhatsAppNumber(phone: string | undefined | null): string {
  if (!phone) return '';

  const raw = phone.trim();
  const hasPlus = raw.startsWith('+');
  
  // Extract all numeric digits
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Case 1: Entered with explicit '+' (e.g. +856 20 5555 1234 or +856020...)
  if (hasPlus) {
    if (digits.startsWith('8560')) {
      return '856' + digits.slice(4);
    }
    return digits;
  }

  // Case 2: Already starts with 856 (Laos Country Code)
  if (digits.startsWith('856')) {
    if (digits.startsWith('8560')) {
      return '856' + digits.slice(4);
    }
    return digits;
  }

  // Case 3: Lao standard mobile numbers: 020 XXXXXXXX (11 digits)
  if (digits.startsWith('020')) {
    return '85620' + digits.slice(3);
  }

  // Case 4: Lao wireless/telecom numbers: 030 XXXXXXXX
  if (digits.startsWith('030')) {
    return '85630' + digits.slice(3);
  }

  // Case 5: Lao landline (Vientiane): 021 XXXXXX
  if (digits.startsWith('021')) {
    return '85621' + digits.slice(3);
  }

  // Case 6: Mobile entered as 20 XXXXXXXX without leading 0 (10 digits starting with 20)
  if (digits.startsWith('20') && digits.length === 10) {
    return '856' + digits;
  }

  // Case 7: Wireless entered as 30 XXXXXXXX (9 or 10 digits starting with 30)
  if (digits.startsWith('30') && (digits.length === 9 || digits.length === 10)) {
    return '856' + digits;
  }

  // Case 8: Landline entered as 21 XXXXXX (8 digits starting with 21)
  if (digits.startsWith('21') && digits.length === 8) {
    return '856' + digits;
  }

  // Case 9: 8 digits common Lao mobile without prefix (5xxxxxxx, 7xxxxxxx, 8xxxxxxx, 9xxxxxxx, 2xxxxxxx)
  if (digits.length === 8 && /^[25789]/.test(digits)) {
    return '85620' + digits;
  }

  // Case 10: Thai mobile format: 08x, 09x, 06x (10 digits)
  if (/^0[689]\d{8}$/.test(digits)) {
    return '66' + digits.slice(1);
  }

  // Case 11: Domestic number starting with 0 (strip 0 and default to Lao +856)
  if (digits.startsWith('0')) {
    return '856' + digits.slice(1);
  }

  return digits;
}

/**
 * Builds the official WhatsApp link (wa.me) with a prefilled greeting message
 */
export function getWhatsAppUrl(
  phone: string | undefined | null,
  customerName?: string,
  model?: string,
  lang: string = 'lo'
): string {
  const formattedNumber = formatWhatsAppNumber(phone);
  if (!formattedNumber) return '';

  let message = '';
  const cleanName = customerName?.trim();
  const cleanModel = model?.trim() || 'AVATR';

  if (lang === 'en') {
    const salutation = cleanName && !/^(mr|mrs|ms|dr)\b/i.test(cleanName) ? `Khun ${cleanName}` : cleanName;
    if (cleanName) {
      message = `Hello ${salutation}, AVATR Laos representative contacting you regarding ${cleanModel}.`;
    } else {
      message = `Hello, AVATR Laos representative contacting you.`;
    }
  } else if (lang === 'th') {
    const salutation = cleanName && !/^(คุณ|นาย|นาง|น\.ส\.)/.test(cleanName) ? `คุณ${cleanName}` : cleanName;
    if (cleanName) {
      message = `สวัสดีครับ/ค่ะ ${salutation}, ฝ่ายขาย AVATR Laos ติดต่อเกี่ยวกับรถรุ่น ${cleanModel}`;
    } else {
      message = `สวัสดีครับ/ค่ะ ตัวแทนฝ่ายขาย AVATR Laos ติดต่อมา`;
    }
  } else {
    // Lao default
    const salutation = cleanName && !/^(ທ່ານ|ທ້າວ|ນາງ|ດຣ)\b/.test(cleanName) ? `ທ່ານ ${cleanName}` : cleanName;
    if (cleanName) {
      message = `ສະບາຍດີ ${salutation}, ທີມງານ AVATR Laos ຕິດຕໍ່ມາກ່ຽວກັບລົດລຸ້ນ ${cleanModel}`;
    } else {
      message = `ສະບາຍດີ, ທີມງານ AVATR Laos ຕິດຕໍ່ມາກ່ຽວກັບລົດ AVATR`;
    }
  }

  return `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Formats for human display (e.g. +856 20 5555 1234)
 */
export function formatWhatsAppDisplay(phone: string | undefined | null): string {
  const num = formatWhatsAppNumber(phone);
  if (!num) return '';

  if (num.startsWith('85620') && num.length >= 13) {
    return `+856 20 ${num.slice(5, 9)} ${num.slice(9)}`;
  }
  if (num.startsWith('85630') && num.length >= 12) {
    return `+856 30 ${num.slice(5)}`;
  }
  if (num.startsWith('856')) {
    return `+856 ${num.slice(3)}`;
  }
  return `+${num}`;
}

import { showToast } from '../components/common/Toast';

/**
 * Direct trigger to open WhatsApp in new tab / application
 */
export function openWhatsApp(
  phone: string | undefined | null,
  customerName?: string,
  model?: string,
  lang: string = 'lo'
): boolean {
  const url = getWhatsAppUrl(phone, customerName, model, lang);
  if (!url) {
    showToast('ກະລຸນາປ້ອນເບີໂທລະສັບໃຫ້ຖືກຕ້ອງກ່ອນເປີດ WhatsApp (ຕົວຢ່າງ: 020 5xxxxxxx)', 'warning');
    return false;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Direct trigger to open WhatsApp with a custom message body
 */
export function openWhatsAppWithMessage(
  phone: string | undefined | null,
  message: string
): boolean {
  const formattedNumber = formatWhatsAppNumber(phone);
  if (!formattedNumber) {
    showToast('ກະລຸນາປ້ອນເບີໂທລະສັບໃຫ້ຖືກຕ້ອງກ່ອນເປີດ WhatsApp (ຕົວຢ່າງ: 020 5xxxxxxx)', 'warning');
    return false;
  }

  const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

