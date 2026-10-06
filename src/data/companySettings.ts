export interface CompanyBankInfo {
  accountName: string;
  bankName: string;
  usdAccount: string;
  lakAccount: string;
  cnyAccount?: string;
  thbAccount?: string;
  hotline: string;
  branch: string;
  qrCodeUrl: string | null; // Base64 data URL or image URL uploaded by Super Admin
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_COMPANY_BANK_INFO: CompanyBankInfo = {
  accountName: 'AVATR AUTO SERVICE SOLE CO., LTD',
  bankName: 'BCEL (ທະນາຄານການຄ້າຕ່າງປະເທດລາວ ມະຫາຊົນ)',
  usdAccount: '010-12-00-01458923-001',
  lakAccount: '010-12-00-01458923-002',
  cnyAccount: '010-12-00-01458923-003',
  thbAccount: '010-12-00-01458923-004',
  hotline: '+856 20 55575537',
  branch: 'ສາຂາ ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ, ນະຄອນຫຼວງວຽງຈັນ',
  qrCodeUrl: null,
  updatedAt: '2026-10-01 09:00',
  updatedBy: 'ທ້າວແສງອຸໄທ (Admin ໃຫຍ່)',
};

export const getStoredCompanyBankInfo = (): CompanyBankInfo => {
  try {
    const saved = localStorage.getItem('avatr_company_bank_info_v2');
    if (saved) {
      return { ...DEFAULT_COMPANY_BANK_INFO, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading company bank info:', e);
  }
  return DEFAULT_COMPANY_BANK_INFO;
};

export const saveStoredCompanyBankInfo = (info: CompanyBankInfo) => {
  try {
    localStorage.setItem('avatr_company_bank_info_v2', JSON.stringify(info));
  } catch (e) {
    console.error('Error saving company bank info:', e);
  }
};
