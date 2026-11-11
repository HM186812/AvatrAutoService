import type { InvoiceBillRecord, Lead } from '../types';
import { isMonthlyInstallmentBill } from './installment';

const digits = (v?: string) => (v || '').replace(/\D/g, '');

/** The customer's sale (or down-payment) bill: same lead id, or same phone. Monthly receipts and voided bills don't count. */
export function findSaleBillForLead(lead: Lead, bills: InvoiceBillRecord[]): InvoiceBillRecord | undefined {
  const phone = digits(lead.phone);
  return bills
    .filter(b =>
      b.status !== 'voided' &&
      (b.billType === 'sale' || b.billType === 'installment') &&
      !isMonthlyInstallmentBill(b) &&
      (b.leadId === lead.id || (phone.length >= 6 && digits(b.customerPhone) === phone)))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
}

/**
 * Documents read vehicle and price data from the customer. After a POS sale some of it lives only
 * on the bill, so fill the gaps from the bill. Values already on the customer always win.
 */
export function withVehicleFromBills(lead: Lead, bills: InvoiceBillRecord[] = []): Lead {
  const bill = findSaleBillForLead(lead, bills);
  if (!bill) return lead;
  const billGifts = (bill.freeGifts || []).map(g => g.trim()).filter(Boolean);
  return {
    ...lead,
    vin: lead.vin || bill.vin || undefined,
    engineNumber: lead.engineNumber || bill.engineNumber || undefined,
    color: lead.color || bill.color || undefined,
    plateNumber: lead.plateNumber || bill.plateNumber || undefined,
    listPriceUSD: lead.listPriceUSD ?? bill.unitPriceUSD ?? bill.netTotalUSD,
    discountUSD: lead.listPriceUSD != null ? lead.discountUSD : (lead.discountUSD ?? bill.discountUSD),
    giftItems: lead.giftItems && lead.giftItems.length > 0
      ? lead.giftItems
      : (billGifts.length > 0 ? billGifts.map(name => ({ name, costUSD: 0 })) : lead.giftItems),
    paymentReceiptNo: lead.paymentReceiptNo || bill.billNumber,
    paymentDate: lead.paymentDate || bill.date,
  };
}
