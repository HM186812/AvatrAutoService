import type { Lead } from '../types';

/** The 7-stage sales pipeline shown on cards and the customer detail page. */
export const PIPELINE_STAGE_KEYS = ['new', 'contacted', 'test_drive', 'negotiation', 'booked', 'sale', 'delivered'] as const;
export type PipelineStageKey = (typeof PIPELINE_STAGE_KEYS)[number];

const STATUS_RANK: Record<string, number> = { new: 0, contacted: 1, test_drive: 2, negotiation: 3 };

/**
 * Which stages are complete. Booking and delivery are recorded on the lead
 * (bookingDate / vehicleDeliveredAt); the sale comes from POS / payment confirmation.
 */
export function getPipelineDone(lead: Lead, isPurchased: boolean): boolean[] {
  const delivered = Boolean(lead.vehicleDeliveredAt);
  const sold = isPurchased || delivered;
  const booked = Boolean(lead.bookingDate) || sold;
  const rank = STATUS_RANK[lead.status] ?? 0;
  return PIPELINE_STAGE_KEYS.map((key, i) => {
    if (key === 'delivered') return delivered;
    if (key === 'sale') return sold;
    if (key === 'booked') return booked;
    return booked || rank > i; // early stages
  });
}

/** Index of the current (first unfinished) stage; equals the length when all are done. */
export function getPipelineCurrentIndex(done: boolean[]): number {
  const i = done.findIndex(d => !d);
  return i === -1 ? done.length : i;
}

export const PIPELINE_LABELS: Record<PipelineStageKey, { lo: string; en: string; th: string }> = {
  new: { lo: 'ສອບຖາມໃໝ່', en: 'New inquiry', th: 'สอบถามใหม่' },
  contacted: { lo: 'ຕິດຕໍ່ແລ້ວ', en: 'Contacted', th: 'ติดต่อแล้ว' },
  test_drive: { lo: 'ທົດລອງຂັບ', en: 'Test drive', th: 'ทดลองขับ' },
  negotiation: { lo: 'ເຈລະຈາ', en: 'Negotiation', th: 'เจรจา' },
  booked: { lo: 'ຈອງ (ມັດຈຳ)', en: 'Booked (deposit)', th: 'จอง (มัดจำ)' },
  sale: { lo: 'ຂາຍ / ອອກບິນ', en: 'Sale / Invoice', th: 'ขาย / ออกบิล' },
  delivered: { lo: 'ມອບລົດ', en: 'Delivered', th: 'ส่งมอบรถ' },
};
