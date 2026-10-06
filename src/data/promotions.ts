export interface PromotionCampaign {
  id: string;
  titleLo: string;
  titleEn: string;
  badge: string;
  badgeColor: string;
  type: 'event' | 'discount' | 'package' | 'special';
  applicableModels: ('AVATR 11' | 'AVATR 12' | 'AVATR 07')[];
  period: string;
  eventLocation?: string;
  highlightBenefit: string;
  freeGifts: string[];
  discountAmountUSD?: number;
  specialInterestRate?: string;
  descriptionLo: string;
  imageUrl: string;
  featuredVin?: string;
}

export const ACTIVE_PROMOTIONS: PromotionCampaign[] = [
  {
    id: 'promo-motor-expo-2026',
    titleLo: 'ງານ Vientiane Motor Expo 2026 - AVATR Special Booth',
    titleEn: 'Vientiane Motor Expo 2026 Special',
    badge: 'ງານ EVENT ໃຫຍ່ແຫ່ງປີ',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    type: 'event',
    applicableModels: ['AVATR 12', 'AVATR 11', 'AVATR 07'],
    period: '01 ຕຸລາ - 31 ຕຸລາ 2026',
    eventLocation: 'ສູນການຄ້າ ITECC Mall (Booth A-01 ຫາ A-04)',
    highlightBenefit: 'ດອກເບ້ຍພິເສດ 0% ນານ 12 ເດືອນ + ຟຣີປະກັນໄພຊັ້ນ 1 VIP',
    freeGifts: [
      'Wallbox Charger 22kW ພ້ອມຕິດຕັ້ງຟຣີເຖິງບ້ານ',
      'ປະກັນໄພຊັ້ນ 1 VIP ຄຸ້ມຄອງເຕັມ 1 ປີ',
      'ຟຣີບຳລຸງຮັກສາ 5 ປີ ຫຼື 100,000 km',
      'ບັດສາກໄຟຟ້າສາທາລະນະຟຣີ 1 ປີເຕັມ',
      'ຊຸດພົມປູພື້ນພຣີມຽມ Luxury AVATR ຕົ້ນສະບັບ',
    ],
    discountAmountUSD: 2500,
    specialInterestRate: '0% ດອກເບ້ຍ 12 ເດືອນ',
    descriptionLo: 'ແຄມເປນພິເສດສຳລັບລູກຄ້າທີ່ຈອງລົດ AVATR ທຸກລຸ້ນພາຍໃນງານ Motor Expo 2026 ຮັບສ່ວນຫຼຸດສູງສຸດ $2,500 ພ້ອມຂອງແຖມຄົບຊຸດ.',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    featuredVin: 'AVATR12-2026-EXP01',
  },
  {
    id: 'promo-avatr12-future-luxury',
    titleLo: 'ໂປຣໂມຊັນເປີດຕົວ AVATR 12 Future Luxury Grand Coupé',
    titleEn: 'AVATR 12 Launch Privilege Package',
    badge: 'ໂປຣໂມຊັນພິເສດ FLAGSHIP',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    type: 'package',
    applicableModels: ['AVATR 12'],
    period: 'ຕະຫຼອດເດືອນນີ້ (ຈຳກັດ 10 ຄັນທຳອິດ)',
    eventLocation: 'ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)',
    highlightBenefit: 'ຟຣີຊຸດແຕ່ງ Carbon Aero Kit + ກະຈົກດິຈິຕອລ Halo Display',
    freeGifts: [
      'ຟຣີຊຸດແຕ່ງ Carbon Fiber Aero Kit ຕົ້ນສະບັບ',
      'ຟຣີ Wallbox Charger 22kW',
      'ຮັບປະກັນແບັດເຕີຣີ CATL 8 ປີ ຫຼື 160,000 km',
      'ບໍລິການຊ່ວຍເຫຼືອສຸກເສີນ 24 ຊົ່ວໂມງ 5 ປີ (Roadside Assist)',
    ],
    discountAmountUSD: 1800,
    specialInterestRate: '1.99% ຜ່ອນຍາວ 60 ເດືອນ',
    descriptionLo: 'ສິດທິພິເສດສຳລັບເຈົ້າຂອງ AVATR 12 ລຸ້ນທັອບ Grand Coupé ຮັບແພັກເກດຍົກລະດັບຄວາມຫຼູຫຼາແບບຄົບວົງຈອນ.',
    imageUrl: 'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=800&q=80',
    featuredVin: 'AVATR12-2026-00912',
  },
  {
    id: 'promo-vip-roadshow-07',
    titleLo: 'AVATR 07 Intelligent SUV Roadshow & Private Test Drive',
    titleEn: 'AVATR 07 Roadshow & Test Drive Lounge',
    badge: 'EVENT ທົດລອງຂັບ VIP',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    type: 'event',
    applicableModels: ['AVATR 07'],
    period: 'ທຸກວັນເສົາ - ອາທິດ ຕະຫຼອດເດືອນ',
    eventLocation: 'Lao Plaza Hotel & Vientiane Center Courtyard',
    highlightBenefit: 'ທົດລອງຂັບຮັບທັນທີ Gift Voucher $500 ແລະ ເງິນມັດຈຳດອກເບ້ຍພິເສດ',
    freeGifts: [
      'Voucher ສ່ວນຫຼຸດອຸປະກອນຕົບແຕ່ງ $500',
      'ຟຣີຟິມກັນຄວາມຮ້ອນ Ceramic 3M ຮອບຄັນ',
      'ຟຣີເຊັກໄລຍະຟຣີຄ່າແຮງ 3 ປີ',
      'ຊຸດຂອງຂວັນ AVATR VIP Lifestyle Collection',
    ],
    discountAmountUSD: 1200,
    descriptionLo: 'ເປີດປະສົບການທົດລອງຂັບລົດ SUV ອັດສະລິຍະ AVATR 07 ພ້ອມລະບົບ Huawei Qiankun ADS 3.0 ໃນເສັ້ນທາງຕົວຈິງ.',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    featuredVin: 'AVATR07-2026-VIP07',
  },
];
