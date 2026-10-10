/**
 * Security & Input Sanitization Utilities
 * ป้องกันการป้อนโค้ดอันตราย (SQL Injection, XSS, Format Exploits)
 */

// ตรวจจับ Pattern อันตรายที่มักใช้ในการ Inject คำสั่ง
const DANGEROUS_SQL_PATTERNS = [
  /(\b(DROP|ALTER|TRUNCATE|DELETE\s+FROM|EXEC|UNION\s+ALL|UNION\s+SELECT)\b)/i,
  /(--|\/\*|\*\/|;\s*$)/, // Comment markers or trailing statement terminators
];

const DANGEROUS_HTML_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
];

/**
 * ตรวจสอบว่าข้อความมี Pattern ต้องสงสัย/อันตรายหรือไม่
 */
export function hasDangerousPatterns(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const str = input.trim();
  for (const pattern of DANGEROUS_SQL_PATTERNS) {
    if (pattern.test(str)) return true;
  }
  for (const pattern of DANGEROUS_HTML_PATTERNS) {
    if (pattern.test(str)) return true;
  }
  return false;
}

/**
 * ทำความสะอาดข้อความทั่วไป (General Text Sanitizer)
 * - ตัดช่องว่างหัวท้าย
 * - จำกัดความยาว (ป้องกัน Buffer/Memory flood)
 * - ลบ Null bytes (\0)
 * - หลีกเลี่ยงอักขระควบคุม (Control Characters)
 */
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();
  
  // ลบ null bytes
  str = str.replace(/\0/g, '');
  
  // ลบ control characters ที่ผิดปกติ (ยกเว้น newline/tab)
  str = str.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // จำกัดความยาว
  if (str.length > maxLength) {
    str = str.slice(0, maxLength);
  }

  return str;
}

/**
 * ทำความสะอาดเบอร์โทรศัพท์
 * ยอมรับเฉพาะตัวเลข, +, -, วงเล็บ และช่องว่าง
 */
export function sanitizePhone(input: unknown, maxLength = 30): string {
  if (!input) return '';
  const str = String(input).trim();
  // เก็บเฉพาะตัวอักษรที่ถูกต้องสำหรับเบอร์โทร
  const cleaned = str.replace(/[^0-9+\-()\s]/g, '');
  return cleaned.slice(0, maxLength);
}

/**
 * ทำความสะอาดเลขตัวถังรถ (VIN)
 * - แปลงเป็นตัวพิมพ์ใหญ่
 * - อนุญาตเฉพาะ A-Z และ 0-9
 * - จำกัด 17 ตัวอักษร
 */
export function sanitizeVIN(input: unknown): string {
  if (!input) return '';
  const str = String(input).toUpperCase().trim();
  const cleaned = str.replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 17);
}

/**
 * ทำความสะอาดจำนวนเงิน / ตัวเลข
 * - ป้องกันค่าติดลบ
 * - ป้องกัน NaN / Infinity
 */
export function sanitizeNumber(input: unknown, defaultValue = 0, min = 0, max = 1_000_000_000_000): number {
  if (input === null || input === undefined || input === '') return defaultValue;
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}
