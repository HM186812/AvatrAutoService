import { VehicleModel, Lead, ServiceAppointment, TestDriveBooking, InventoryItem, SystemUser, StockLogRecord, InvoiceBillRecord, PendingMemberRequest } from '../types';

export const AVATR_VEHICLES: VehicleModel[] = [
  {
    id: 'avatr-12',
    name: 'AVATR 12',
    subTitle: 'Future Luxury Grand Coupé',
    tagline: 'ອະນາຄົດແຫ່ງຍົນລະກຳໄຟຟ້າຊັ້ນສູງ | ຄວາມຫຼູຫຼາແບບ Pure Minimal',
    category: 'Grand Coupé',
    priceStartingUSD: 46800,
    priceStartingLAK: 1029600000,
    acceleration: '3.9s (0-100 km/h)',
    rangeCLTC: '700 km',
    batteryCapacity: '94.5 kWh',
    batterySupplier: 'CATL CTP Ternary Lithium',
    chargingSpeed: '800V High-Voltage Silicon Carbide (30-80% in 15min)',
    smartDriving: 'Huawei Qiankun ADS 3.0 + HarmonyOS Cockpit',
    powertrain: 'Dual-Motor AWD (578 hp)',
    colors: [
      { name: 'Obsidian Black', hex: '#0a0a0b', previewClass: 'bg-zinc-950 border border-zinc-700' },
      { name: 'Ceramic White', hex: '#f4f4f5', previewClass: 'bg-zinc-100 border border-zinc-300' },
      { name: 'Liquid Titanium', hex: '#71717a', previewClass: 'bg-zinc-500 border border-zinc-400' },
      { name: 'Midnight Charcoal', hex: '#18181b', previewClass: 'bg-zinc-900 border border-zinc-700' },
    ],
    description: 'AVATR 12 ເປັນລົດ Grand Coupé ໄຟຟ້າລະດັບ Flagship ທີ່ປະສານງານອອກແບບລ້ຳຍຸກ ໂດຍ Munich Design Center ຮ່ວມກັບເຕັກໂນໂລຊີ AI ອັດສະລິຍະຈາກ Huawei ແລະ ແບັດເຕີຣີມາດຕະຖານໂລກຈາກ CATL. ມາພ້ອມໜ້າຈໍ 35.4 ນິ້ວ 4K Remote Panoramic Display, ແວ່ນເບິ່ງຫຼັງດິຈິຕອນ HD, ແລະ ລະບົບຊ່ວງລ່າງຖົງລົມອັດສະລິຍະ.',
    features: [
      '35.4-inch 4K Panoramic Halo Screen across the dash',
      'Electronic Digital Rearview Mirrors with Rain-Fog Filter',
      'Huawei ADS 3.0 with 3 Lidar sensors & 300m range',
      'Zero-Gravity Front Luxury Lounge Seats with 8-point massage',
      '7.1.4 Meridian-grade 27-speaker immersive acoustic suite',
      'Smart Electric Retractable Spoiler & Frameless Gullwing-inspired Doors',
    ],
    stockCount: 0,
    heroImage: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    id: 'avatr-11',
    name: 'AVATR 11',
    subTitle: 'Smart Emotional Luxury SUV',
    tagline: 'SUV Coupé ໄຟຟ້າອັດສະລິຍະ | ພະລັງຂັບເຄື່ອນທີ່ໄຮ້ຂີດຈຳກັດ',
    category: 'Luxury SUV Coupé',
    priceStartingUSD: 43900,
    priceStartingLAK: 965800000,
    acceleration: '3.98s (0-100 km/h)',
    rangeCLTC: '730 km',
    batteryCapacity: '116 kWh',
    batterySupplier: 'CATL High-Energy Density Battery',
    chargingSpeed: '750V / 240kW Ultra-Fast Charging (200km in 10min)',
    smartDriving: 'Huawei Triple-LiDAR Autonomous Driving System',
    powertrain: 'Dual-Motor AWD (425 kW / 578 ps)',
    colors: [
      { name: 'Gloss Onyx Black', hex: '#09090b', previewClass: 'bg-black border border-zinc-700' },
      { name: 'Alpine Pearl White', hex: '#fafafa', previewClass: 'bg-zinc-200 border border-zinc-400' },
      { name: 'Monochrome Silver', hex: '#52525b', previewClass: 'bg-zinc-600 border border-zinc-500' },
    ],
    description: 'AVATR 11 ມອບປະສົບການຂັບຂີ່ SUV Coupé ທີ່ໂດດເດັ່ນດ້ວຍຮູບຊົງ Aerodynamic ທີ່ໜັກແໜ້ນ ແລະ ໂຄ້ງມົນຄືຍານອະວະກາດ. ໂດດເດັ່ນດ້ວຍ "Vortex" Center Emotion Console ທີ່ຕອບສະໜອງຕໍ່ອາລົມຜູ້ຂັບຂີ່ ແລະ ລະບົບຊ່ວຍຂັບອັດຕະໂນມັດເຕັມຮູບແບບ.',
    features: [
      'Iconic Emotion Vortex Ambient Intelligent Console',
      'Triple Ultra-long range LiDAR sensors embedded seamlessly',
      'Active Speed-sensing Aerodynamic Rear Spoiler',
      'Antibacterial Nappa Leather & Alcantara Roof Lining',
      '800V Architecture with Instant Supercharging Capability',
      'Autonomous Valet Parking (AVP) & Remote Summon via App',
    ],
    stockCount: 0,
    heroImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    id: 'avatr-07',
    name: 'AVATR 07',
    subTitle: 'Intelligent Urban Luxury Crossover',
    tagline: 'ຍົນລະກຳອັດສະລິຍະສຳລັບຄົນລຸ້ນໃໝ່ | Smart City EV',
    category: 'Smart Urban SUV',
    priceStartingUSD: 36500,
    priceStartingLAK: 803000000,
    acceleration: '4.9s (0-100 km/h)',
    rangeCLTC: '650 km / EREV 1150 km',
    batteryCapacity: '82 kWh',
    batterySupplier: 'CATL Shenxing Ultra-Recharge Battery',
    chargingSpeed: '4C Supercharge (30-80% in 10 minutes)',
    smartDriving: 'Huawei ADS 3.0 End-to-End Smart Pilot',
    powertrain: 'Dual-Motor AWD / EREV Super Hybrid',
    colors: [
      { name: 'Obsidian Jet', hex: '#000000', previewClass: 'bg-black border border-zinc-700' },
      { name: 'Pure Chalk White', hex: '#ffffff', previewClass: 'bg-white border border-zinc-400' },
      { name: 'Carbon Graphite', hex: '#27272a', previewClass: 'bg-zinc-800 border border-zinc-600' },
    ],
    description: 'AVATR 07 ລຸ້ນໃໝ່ຫຼ້າສຸດ ເໝາະສຳລັບການນຳໃຊ້ໃນຕົວເມືອງ ແລະ ເດີນທາງໄກໃນລາວ. ສະເໜີທັງລຸ້ນ Pure EV ແລະ Range Extender (EREV) ທີ່ສາມາດຂັບຂີ່ໄດ້ໄກກວ່າ 1,150 ກິໂລແມັດ ພ້ອມແບັດເຕີຣີ CATL Shenxing ທີ່ສາກໄວທີ່ສຸດ.',
    features: [
      'Dual Options: 100% Pure Electric or Super Hybrid EREV (1150km)',
      'Next-Gen HarmonyOS 4.0 Cockpit with Instant Voice Assistant',
      'Ultra-compact Aerodynamic Drag Coefficient (0.268 Cd)',
      'CATL Shenxing 4C Battery - 10-minute fast charging',
      'Surround 360 Sensing with Huawei 192-line LiDAR',
      'High-grade Acoustic Glass & Active Road Noise Cancellation',
    ],
    stockCount: 0,
    heroImage: 'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=800&q=80',
    ],
  },
];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_SERVICES: ServiceAppointment[] = [];

export const INITIAL_TEST_DRIVES: TestDriveBooking[] = [];

export const FAQ_LIST = [
  {
    questionLo: 'ການຮັບປະກັນລົດ ແລະ ແບັດເຕີຣີ AVATR ໃນລາວມີແນວໃດ?',
    questionEn: 'What is the warranty coverage for AVATR vehicles and batteries in Laos?',
    questionZh: '阿维塔汽车及电池在老挝的保修政策是什么？',
    answerLo: 'ລົດ AVATR ທຸກຄັນມາພ້ອມການຮັບປະກັນແບັດເຕີຣີແຮງສູງ CATL ດົນເຖິງ 8 ປີ ຫຼື 160,000 ກິໂລແມັດ. ການຮັບປະກັນຕົວລົດທົ່ວໄປ 5 ປີ ຫຼື 120,000 ກິໂລແມັດ ພ້ອມບໍລິການກູ້ໄພສຸກເສີນ 24 ຊົ່ວໂມງໃນລາວ ໂດຍສູນ avatrAutoService.',
    answerEn: 'All AVATR vehicles feature an 8-year / 160,000 km warranty for the CATL high-voltage battery pack and 5-year / 120,000 km comprehensive vehicle warranty with 24/7 roadside assistance in Laos.',
    answerZh: '所有阿维塔车型均享有宁德时代高压电池组8年或16万公里质保，整车5年或12万公里质保，并享有老挝全境24小时道路救援服务。',
  },
  {
    questionLo: 'ການສາກໄຟລົດ AVATR ໃນລາວ ສະດວກບໍ່ ແລະ ໃຊ້ເວລາດົນປານໃດ?',
    questionEn: 'How convenient is EV charging in Laos, and how fast is AVATR charging?',
    questionZh: '在老挝给阿维塔充电方便吗？充电速度如何？',
    answerLo: 'ສະດວກຫຼາຍ! ລົດ AVATR ມາພ້ອມສະຖາປັດຕະຍະກຳ 800V Ultra-Fast Charging ສາມາດສາກໄຟໄວ 30% ຫາ 80% ພາຍໃນພຽງ 10-15 ນາທີ ທີ່ສະຖານີສາກໄວ DC. ນອກຈາກນັ້ນ ພວກເຮົາແຖມຟຣີຕູ້ສາກ Home Charger 7kW - 11kW ຕິດຕັ້ງໃຫ້ເຖິງບ້ານ.',
    answerEn: 'Extremely convenient! Powered by 800V high-voltage architecture, AVATR charges from 30% to 80% in just 10-15 minutes at DC fast stations. Every purchase includes a complimentary 7-11kW home charger with full home installation.',
    answerZh: '非常便利！依托800V高压碳化硅平台，在直流快充站仅需10-15分钟即可从30%充至80%。购车即赠送7-11kW家用智能充电桩并上门专业安装。',
  },
  {
    questionLo: 'ຂັບຂີ່ລົດໄຟຟ້າໃນລະດູຝົນ ຫຼື ນ້ຳຖ້ວມຂັງໃນວຽງຈັນ ປອດໄພບໍ່?',
    questionEn: 'Is it safe to drive in rain and waterlogged roads in Vientiane?',
    questionZh: '在万象雨季或积水路段驾驶阿维塔电动车安全吗？',
    answerLo: 'ປອດໄພສູງສຸດ! ຊຸດແບັດເຕີຣີ ແລະ ມໍເຕີ້ຂອງ AVATR ຜ່ານມາດຕະຖານກັນນ້ຳ ແລະ ຝຸ່ນລະດັບ IP68/IP69K ສາມາດລຸຍນ້ຳເລິກ 300mm ໄດ້ຢ່າງປອດໄພ ພ້ອມລະບົບຕັດກະແສໄຟອັດຕະໂນມັດ (Millisecond Isolation) ຫາກເກີດເຫດສຸກເສີນ.',
    answerEn: 'Completely safe. AVATR battery packs and electric drive units are certified to IP68/IP69K waterproof and dustproof standards, capable of wading through 300mm of standing water with millisecond-level high-voltage isolation safety cutoffs.',
    answerZh: '绝对安全。电池包和电机系统达到IP68/IP69K最高防尘防水等级，涉水深度达300mm，配备毫秒级高压自动断电安全防护。',
  },
  {
    questionLo: 'ຂັ້ນຕອນການຈົດທະບຽນປ້າຍເລກລົດໄຟຟ້າໃນລາວໃຊ້ເວລາດົນບໍ່?',
    questionEn: 'How long does electric vehicle registration and plating take in Laos?',
    questionZh: '在老挝办理电动汽车上牌和落户手续需要多长时间？',
    answerLo: 'ທີມງານ avatrAutoService ຈະດູແລເອກະສານເສຍພາສີ, ອາກອນ, ແລະ ຈົດທະບຽນປ້າຍເຫຼືອງ/ປ້າຍຂາວ ໃຫ້ຄົບວົງຈອນພາຍໃນ 3-5 ວັນລັດຖະການ.',
    answerEn: 'Our avatrAutoService team handles customs clearance, luxury EV duty incentives, and vehicle registration completely within 3-5 business days.',
    answerZh: '阿维塔服务中心专业团队全程代办老挝关税、牌照及落户手续，通常在3-5个工作日内即可完成交车上牌。',
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_USERS: SystemUser[] = [];

export const INITIAL_STOCK_LOGS: StockLogRecord[] = [];

export const INITIAL_SALES_LOGS: StockLogRecord[] = [];

export const INITIAL_BILLS: InvoiceBillRecord[] = [];

export const INITIAL_PENDING_MEMBERS: PendingMemberRequest[] = [];
