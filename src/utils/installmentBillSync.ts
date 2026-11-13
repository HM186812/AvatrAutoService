import { resolveLakExchangeRate } from '../data/currencies';
import type { InstallmentPaymentRecord, InvoiceBillRecord, Lead, VehicleModel } from '../types';

export interface InstallmentRecordSyncMeta {
  paidAmountUSD?: number;
  paidAmountLAK?: number;
  installmentStatus?: Lead['installmentStatus'];
  billId?: string;
  billNumber?: string;
  voidedBillIds?: string[];
}

interface SyncInstallmentStateParams {
  customerId: string;
  updatedRecords: InstallmentPaymentRecord[];
  meta?: InstallmentRecordSyncMeta;
  leads: Lead[];
  bills?: InvoiceBillRecord[];
  vehicles?: VehicleModel[];
  currentUserName?: string;
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
  setBills?: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
}

/**
 * Applies authoritative installment RPC results to local Lead and InvoiceBillRecord React state.
 */
export function syncInstallmentBillState({
  customerId,
  updatedRecords,
  meta,
  leads,
  bills = [],
  vehicles = [],
  currentUserName,
  setLeads,
  setBills,
}: SyncInstallmentStateParams): Lead {
  const targetLead = leads.find((l) => l.id === customerId);
  if (!targetLead) throw new Error('Customer record not found.');

  const paidRecords = updatedRecords.filter((r) => r.status === 'paid');
  const totalPaidLAK =
    meta?.paidAmountLAK ??
    paidRecords.reduce((sum, r) => sum + Number(r.paidAmountLAK || r.amountLAK || 0), 0);
  const totalPaidUSD =
    meta?.paidAmountUSD ??
    paidRecords.reduce((sum, r) => sum + Number(r.paidAmountUSD || r.amountUSD || 0), 0);
  const isCompleted = paidRecords.length === updatedRecords.length && updatedRecords.length > 0;

  const updatedLead: Lead = {
    ...targetLead,
    installmentRecords: updatedRecords,
    paidAmountLAK: totalPaidLAK,
    paidAmountUSD: totalPaidUSD,
    installmentStatus: meta?.installmentStatus ?? (isCompleted ? 'completed' : 'active_repaying'),
    lastFollowUp: new Date().toISOString(),
  };

  if (setLeads) {
    setLeads((prev) => prev.map((l) => (l.id === customerId ? updatedLead : l)));
  }

  if (setBills) {
    if (meta?.voidedBillIds && meta.voidedBillIds.length > 0) {
      const voidSet = new Set(meta.voidedBillIds);
      setBills((prev) =>
        prev.map((b) => (voidSet.has(b.id) ? { ...b, status: 'voided' as const } : b)),
      );
    }

    if (meta?.billId && meta?.billNumber) {
      const matchedPeriod =
        paidRecords.find((r) => r.receiptNo === meta.billNumber) || paidRecords[paidRecords.length - 1];
      const alreadyInBills = bills.some((b) => b.id === meta.billId || b.billNumber === meta.billNumber);
      if (matchedPeriod && !alreadyInBills) {
        const lakRate = resolveLakExchangeRate();
        const payUSD = Number(matchedPeriod.paidAmountUSD || matchedPeriod.amountUSD) || 0;
        const payLAK = Number(matchedPeriod.paidAmountLAK || matchedPeriod.amountLAK) || Math.round(payUSD * lakRate);
        const matchedVeh = vehicles.find((v) => v.name === targetLead.interestedModel);
        const newReceiptBill: InvoiceBillRecord = {
          id: meta.billId,
          billType: 'installment',
          installmentType: 'monthly_installment',
          billNumber: meta.billNumber,
          date: matchedPeriod.paidDate || new Date().toISOString().slice(0, 10),
          model: targetLead.interestedModel || matchedVeh?.name || 'AVATR',
          vin: targetLead.vin || '',
          plateNumber: targetLead.plateNumber || '',
          color: targetLead.color || '',
          quantity: 1,
          unitPriceUSD: payUSD,
          unitPriceLAK: payLAK,
          discountUSD: 0,
          discountLAK: 0,
          netTotalUSD: payUSD,
          netTotalLAK: payLAK,
          amountUSD: payUSD,
          amountLAK: payLAK,
          customerName: targetLead.customerName,
          customerPhone: targetLead.phone,
          leadId: targetLead.id,
          customerIDCard: targetLead.idCardNumber,
          customerAddress: [targetLead.village, targetLead.district, targetLead.province].filter(Boolean).join(', '),
          customerProvince: targetLead.province,
          paymentMethod: (matchedPeriod.paymentMethod as InvoiceBillRecord['paymentMethod']) || 'transfer',
          bankName: matchedPeriod.bankName,
          transferRef: matchedPeriod.transferRef,
          installmentPeriod: matchedPeriod.period,
          tenureMonths: targetLead.tenureMonths,
          monthlyPaymentLAK: payLAK,
          financeCompany: targetLead.financeCompany,
          salesRep: matchedPeriod.collectedBy || currentUserName || 'Admin',
          recordedBy: currentUserName || 'Admin',
          notes: matchedPeriod.notes || `ຮັບເງິນງວດທີ ${matchedPeriod.period} ລູກຄ້າ ${targetLead.customerName}`,
        };
        setBills((prev) => [newReceiptBill, ...prev]);
      }
    }
  }

  return updatedLead;
}
