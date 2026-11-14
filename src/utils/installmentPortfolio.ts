import type { InstallmentPaymentRecord, InvoiceBillRecord, Lead, VehicleModel } from '../types';
import { calculateInstallmentSummary, generateInstallmentSchedule, isMonthlyInstallmentBill } from './installment';

/**
 * One definition of the installment portfolio for every page (Sidebar badge, Dashboard, Installment page),
 * so each account and each screen shows the same customers, prices and totals.
 */

const FALLBACK_PRICE_USD = 50000;
const digits = (value?: string | null) => (value || '').replace(/\D/g, '');

export function isInstallmentLead(lead: Lead): boolean {
  return lead.paymentType === 'installment' ||
    lead.paymentType === 'finance' ||
    Boolean(lead.downPaymentPercent) ||
    Boolean(lead.financeCompany) ||
    Boolean(lead.installmentRecords && lead.installmentRecords.length > 0) ||
    lead.installmentStatus === 'active_repaying' ||
    lead.installmentStatus === 'completed' ||
    lead.installmentStatus === 'approved' ||
    lead.installmentStatus === 'pending_approval';
}

export function isInstallmentContractCompleted(lead: Lead): boolean {
  return Boolean(lead.isPaymentCompleted) || lead.installmentStatus === 'completed';
}

/** A financed sale bill (not a voided bill and not a monthly receipt). */
function isFinancedSaleBill(bill: InvoiceBillRecord): boolean {
  return bill.status !== 'voided' &&
    !isMonthlyInstallmentBill(bill) &&
    (bill.paymentMethod === 'finance' || bill.billType === 'installment' || Boolean(bill.downPaymentPercent));
}

function billPriceUSD(bill?: InvoiceBillRecord): number | undefined {
  if (!bill) return undefined;
  const price = Number(bill.unitPriceUSD) || Number(bill.netTotalUSD);
  return price > 0 ? price : undefined;
}

function isSaleBillCandidate(b: InvoiceBillRecord): boolean {
  return (
    b.status !== 'voided' &&
    (b.billType === 'sale' || b.billType === 'installment') &&
    !isMonthlyInstallmentBill(b)
  );
}

function pickNewerBill(a?: InvoiceBillRecord, b?: InvoiceBillRecord): InvoiceBillRecord | undefined {
  if (!a) return b;
  if (!b) return a;
  return (b.date || '').localeCompare(a.date || '') > 0 ? b : a;
}

function findSaleBill(lead: Lead, bills: InvoiceBillRecord[]): InvoiceBillRecord | undefined {
  const phone = digits(lead.phone);
  let best: InvoiceBillRecord | undefined;
  for (const b of bills) {
    if (!isSaleBillCandidate(b)) continue;
    if (b.leadId === lead.id || (phone.length >= 6 && digits(b.customerPhone) === phone)) {
      best = pickNewerBill(best, b);
    }
  }
  return best;
}

/** Contract price: the customer's recorded price → the sale bill → the model's starting price. */
export function getContractPriceUSD(lead: Lead, vehicles: VehicleModel[], bills: InvoiceBillRecord[] = []): number {
  const recorded = Number(lead.listPriceUSD);
  if (recorded > 0) return Math.max(0, recorded - Math.max(0, Number(lead.discountUSD) || 0));
  const fromBill = billPriceUSD(findSaleBill(lead, bills));
  if (fromBill) return fromBill;
  const model = vehicles.find(v => v.name === lead.interestedModel);
  return model?.priceStartingUSD || FALLBACK_PRICE_USD;
}

/**
 * Every installment customer: flagged customers plus customers whose only record is a financed POS bill.
 * When a bill belongs to an existing customer, that real customer is used (so its ledger can be saved).
 */
export function getInstallmentCustomers(leads: Lead[], bills: InvoiceBillRecord[] = []): Lead[] {
  const result = leads.filter(isInstallmentLead);
  const includedIds = new Set(result.map(l => l.id));
  const seenPhones = new Set(result.map(l => digits(l.phone)).filter(Boolean));

  const leadsById = new Map<string, Lead>();
  const leadsByPhone = new Map<string, Lead>();
  for (const l of leads) {
    leadsById.set(l.id, l);
    const p = digits(l.phone);
    if (p.length >= 6 && !leadsByPhone.has(p)) leadsByPhone.set(p, l);
  }

  for (const bill of bills) {
    if (!isFinancedSaleBill(bill)) continue;
    const phone = digits(bill.customerPhone);
    if (bill.leadId && includedIds.has(bill.leadId)) continue;
    if (phone && seenPhones.has(phone)) continue;

    const owner = (bill.leadId ? leadsById.get(bill.leadId) : undefined) ||
      (phone.length >= 6 ? leadsByPhone.get(phone) : undefined);

    if (owner) {
      result.push({
        ...owner,
        paymentType: owner.paymentType || 'installment',
        downPaymentPercent: owner.downPaymentPercent || bill.downPaymentPercent,
        downPaymentUSD: owner.downPaymentUSD || bill.downPaymentUSD,
        tenureMonths: owner.tenureMonths || bill.tenureMonths,
        monthlyPaymentLAK: owner.monthlyPaymentLAK || bill.monthlyPaymentLAK,
        financeCompany: owner.financeCompany || bill.financeCompany,
        paymentReceiptNo: owner.paymentReceiptNo || bill.billNumber || bill.id,
      });
      includedIds.add(owner.id);
    } else {
      result.push({
        id: `inst-bill-${bill.id}`,
        customerName: bill.customerName || 'ລູກຄ້າຜ່ອນ',
        phone: bill.customerPhone || '',
        idCardNumber: bill.customerIDCard,
        province: bill.customerProvince || 'ນະຄອນຫຼວງວຽງຈັນ',
        category: 'walk_in',
        source: 'POS Installment',
        interestedModel: bill.model || 'AVATR 11',
        status: 'delivered',
        priority: 'high',
        notes: `ສັນຍາຜ່ອນຈາກບິນ ${bill.billNumber || bill.id}`,
        paymentType: 'installment',
        paymentTypeConfirmed: 'down_payment',
        installmentStatus: 'active_repaying',
        downPaymentPercent: bill.downPaymentPercent || 30,
        downPaymentUSD: bill.downPaymentUSD || 0,
        tenureMonths: bill.tenureMonths || 48,
        monthlyPaymentLAK: bill.monthlyPaymentLAK || 0,
        financeCompany: bill.financeCompany || 'AVATR Leasing',
        paymentReceiptNo: bill.billNumber || bill.id,
        paymentDate: bill.date,
        listPriceUSD: billPriceUSD(bill),
        createdAt: bill.date || new Date().toISOString(),
        assignedTo: bill.salesRep || 'Admin',
      } as Lead);
    }
    seenPhones.add(phone || bill.id);
  }

  return result;
}

export interface InstallmentContract {
  lead: Lead;
  priceUSD: number;
  records: InstallmentPaymentRecord[];
  summary: ReturnType<typeof calculateInstallmentSummary>;
  isCompleted: boolean;
}

export function buildInstallmentContracts(
  leads: Lead[],
  bills: InvoiceBillRecord[],
  vehicles: VehicleModel[]
): InstallmentContract[] {
  const vehicleByName = new Map<string, VehicleModel>();
  for (const v of vehicles) {
    if (!vehicleByName.has(v.name)) vehicleByName.set(v.name, v);
  }

  const saleBillByLeadId = new Map<string, InvoiceBillRecord>();
  const saleBillByPhone = new Map<string, InvoiceBillRecord>();
  for (const b of bills) {
    if (!isSaleBillCandidate(b)) continue;
    if (b.leadId) {
      saleBillByLeadId.set(b.leadId, pickNewerBill(saleBillByLeadId.get(b.leadId), b)!);
    }
    const bp = digits(b.customerPhone);
    if (bp.length >= 6) {
      saleBillByPhone.set(bp, pickNewerBill(saleBillByPhone.get(bp), b)!);
    }
  }

  return getInstallmentCustomers(leads, bills).map(lead => {
    const recorded = Number(lead.listPriceUSD);
    let priceUSD: number;
    if (recorded > 0) {
      priceUSD = Math.max(0, recorded - Math.max(0, Number(lead.discountUSD) || 0));
    } else {
      const phone = digits(lead.phone);
      const bestBill = pickNewerBill(
        saleBillByLeadId.get(lead.id),
        phone.length >= 6 ? saleBillByPhone.get(phone) : undefined,
      );
      priceUSD = billPriceUSD(bestBill) ??
        vehicleByName.get(lead.interestedModel)?.priceStartingUSD ??
        FALLBACK_PRICE_USD;
    }

    const records = generateInstallmentSchedule(lead, priceUSD);
    const summary = calculateInstallmentSummary(lead, records, priceUSD);
    return {
      lead,
      priceUSD,
      records,
      summary,
      isCompleted: isInstallmentContractCompleted(lead) || summary.isFullyPaid,
    };
  });
}

export function summarizeInstallmentPortfolio(contracts: InstallmentContract[], today: Date = new Date()) {
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  let activeContracts = 0;
  let completedContracts = 0;
  let totalVehicleValueUSD = 0;
  let totalDownPaymentUSD = 0;
  let totalFinancedUSD = 0;
  let totalInstallmentsPaidUSD = 0;
  let totalOutstandingUSD = 0;
  let periodsDue = 0;
  let periodsPaidOfDue = 0;

  contracts.forEach(({ priceUSD, records, summary, isCompleted }) => {
    totalVehicleValueUSD += priceUSD;
    totalDownPaymentUSD += summary.downPaymentUSD;
    totalFinancedUSD += summary.principalFinancedUSD;
    if (isCompleted) {
      completedContracts += 1;
      // Paid off (e.g. early payoff): nothing is owed any more, even if the ledger was never filled in
      totalInstallmentsPaidUSD += summary.totalPaidInstallmentsUSD + summary.remainingInstallmentsUSD;
      return;
    }
    activeContracts += 1;
    totalInstallmentsPaidUSD += summary.totalPaidInstallmentsUSD;
    totalOutstandingUSD += summary.remainingInstallmentsUSD;
    records.forEach(r => {
      if (r.dueDate <= todayKey) {
        periodsDue += 1;
        if (r.status === 'paid') periodsPaidOfDue += 1;
      }
    });
  });

  const scheduledTotalUSD = totalInstallmentsPaidUSD + totalOutstandingUSD;
  return {
    totalContracts: contracts.length,
    activeContracts,
    completedContracts,
    totalVehicleValueUSD,
    totalDownPaymentUSD,
    averageDownPercent: totalVehicleValueUSD > 0 ? Math.round((totalDownPaymentUSD / totalVehicleValueUSD) * 100) : null,
    totalFinancedUSD,
    totalInstallmentsPaidUSD,
    /** Down payments + installments received */
    totalCollectedUSD: totalDownPaymentUSD + totalInstallmentsPaidUSD,
    totalOutstandingUSD,
    /** Share of the scheduled installments (principal + interest) already received */
    repaymentProgressPercent: scheduledTotalUSD > 0 ? Math.round((totalInstallmentsPaidUSD / scheduledTotalUSD) * 100) : 0,
    /** Share of installments already due that have been paid; null when nothing is due yet */
    onTimeRatePercent: periodsDue > 0 ? Math.round((periodsPaidOfDue / periodsDue) * 100) : null,
  };
}
