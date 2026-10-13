import { Lead, InstallmentPaymentRecord } from '../types';

export const DEFAULT_EXCHANGE_RATE_LAK = 22000;
export const DEFAULT_ANNUAL_INTEREST_RATE = 0.075; // 7.5% per year

/**
 * Generate a complete, realistic installment repayment schedule for a customer
 */
export function generateInstallmentSchedule(
  customer: Lead,
  vehiclePriceUSD: number = 45000,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE_LAK,
  annualInterestRate: number = DEFAULT_ANNUAL_INTEREST_RATE
): InstallmentPaymentRecord[] {
  // If customer already has customized installment records, return them
  if (customer.installmentRecords && customer.installmentRecords.length > 0) {
    return customer.installmentRecords;
  }

  const tenure = Number(customer.tenureMonths) || 48;
  const downPaymentPercent = Number(customer.downPaymentPercent) || 30;
  const downPaymentUSD = customer.downPaymentUSD || Math.round(vehiclePriceUSD * (downPaymentPercent / 100));
  const principalFinancedUSD = Math.max(0, vehiclePriceUSD - downPaymentUSD);

  const totalInterestUSD = Math.round(principalFinancedUSD * annualInterestRate * (tenure / 12));
  const monthlyInterestUSD = Math.round(totalInterestUSD / tenure);
  const monthlyPrincipalUSD = Math.round(principalFinancedUSD / tenure);
  const monthlyTotalUSD = monthlyPrincipalUSD + monthlyInterestUSD;
  const monthlyTotalLAK = monthlyTotalUSD * exchangeRate;

  // Base contract date
  const baseDate = customer.createdAt ? new Date(customer.createdAt.replace(' ', 'T')) : new Date();
  if (isNaN(baseDate.getTime())) {
    baseDate.setTime(Date.now());
  }

  const today = new Date();
  const schedule: InstallmentPaymentRecord[] = [];

  for (let i = 1; i <= tenure; i++) {
    const dueDateObj = new Date(baseDate);
    // Add i months, set day to 10
    dueDateObj.setMonth(dueDateObj.getMonth() + i);
    dueDateObj.setDate(10);

    const year = dueDateObj.getFullYear();
    const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dueDateObj.getDate()).padStart(2, '0');
    const dueDateStr = `${year}-${month}-${day}`;

    // Determine initial status based on due date
    let status: 'paid' | 'due' | 'pending' | 'overdue' = 'pending';
    let paidDate: string | undefined = undefined;
    let receiptNo: string | undefined = undefined;
    let transferRef: string | undefined = undefined;
    let paymentMethod: 'cash' | 'transfer' | undefined = undefined;

    // If customer's status is already 'delivered' and contract is signed, or historical demo
    if (customer.status === 'delivered' && i === 1) {
      status = 'paid';
      paidDate = `${year}-${month}-08`;
      receiptNo = `REC-INS-${customer.id.replace(/\D/g, '') || '01'}-01`;
      transferRef = `TRF-${Math.floor(100000 + Math.random() * 900000)}`;
      paymentMethod = 'transfer';
    } else if (dueDateObj < today) {
      // Past due
      status = 'due';
    } else {
      status = 'pending';
    }

    schedule.push({
      period: i,
      dueDate: dueDateStr,
      amountUSD: monthlyTotalUSD,
      amountLAK: monthlyTotalLAK,
      principalUSD: monthlyPrincipalUSD,
      interestUSD: monthlyInterestUSD,
      status,
      paidDate,
      paidAmountUSD: status === 'paid' ? monthlyTotalUSD : undefined,
      paidAmountLAK: status === 'paid' ? monthlyTotalLAK : undefined,
      paymentMethod,
      receiptNo,
      transferRef,
      bankName: undefined,
      notes: i === 1 ? 'ງວດທີ 1 ຫຼັງຮັບລົດ' : undefined,
      collectedBy: status === 'paid' ? (customer.assignedTo || 'Admin') : undefined,
    });
  }

  return schedule;
}

/**
 * Calculate statistical financial summary of the installment ledger
 */
export function calculateInstallmentSummary(
  customer: Lead,
  records: InstallmentPaymentRecord[],
  vehiclePriceUSD: number = 45000,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE_LAK
) {
  const tenure = Number(customer.tenureMonths) || (records.length || 48);
  const downPaymentPercent = Number(customer.downPaymentPercent) || 30;
  const downPaymentUSD = customer.downPaymentUSD || Math.round(vehiclePriceUSD * (downPaymentPercent / 100));
  const downPaymentLAK = downPaymentUSD * exchangeRate;
  const principalFinancedUSD = Math.max(0, vehiclePriceUSD - downPaymentUSD);
  const principalFinancedLAK = principalFinancedUSD * exchangeRate;

  const paidRecords = records.filter(r => r.status === 'paid');
  const paidCount = paidRecords.length;
  const totalCount = records.length;

  const totalPaidInstallmentsUSD = paidRecords.reduce((sum, r) => sum + (r.paidAmountUSD || r.amountUSD), 0);
  const totalPaidInstallmentsLAK = paidRecords.reduce((sum, r) => sum + (r.paidAmountLAK || r.amountLAK), 0);

  const unpaidRecords = records.filter(r => r.status !== 'paid');
  const remainingInstallmentsUSD = unpaidRecords.reduce((sum, r) => sum + r.amountUSD, 0);
  const remainingInstallmentsLAK = unpaidRecords.reduce((sum, r) => sum + r.amountLAK, 0);

  const dueNowRecords = records.filter(r => r.status === 'due');
  const overdueRecords = records.filter(r => r.status === 'overdue');

  const monthlyPaymentUSD = records[0]?.amountUSD || Math.round(((principalFinancedUSD * (1 + 0.075 * (tenure / 12))) / tenure));
  const monthlyPaymentLAK = records[0]?.amountLAK || (monthlyPaymentUSD * exchangeRate);

  const progressPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  return {
    vehiclePriceUSD,
    vehiclePriceLAK: vehiclePriceUSD * exchangeRate,
    downPaymentUSD,
    downPaymentLAK,
    downPaymentPercent,
    principalFinancedUSD,
    principalFinancedLAK,
    monthlyPaymentUSD,
    monthlyPaymentLAK,
    tenure,
    paidCount,
    totalCount,
    progressPercent,
    totalPaidInstallmentsUSD,
    totalPaidInstallmentsLAK,
    remainingInstallmentsUSD,
    remainingInstallmentsLAK,
    dueNowCount: dueNowRecords.length,
    overdueCount: overdueRecords.length,
    isFullyPaid: totalCount > 0 && paidCount === totalCount,
  };
}
