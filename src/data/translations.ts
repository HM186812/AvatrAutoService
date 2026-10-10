export interface TranslationSchema {
  brandName: string;
  subBrand: string;
  tagline: string;
  directorTitle: string;
  directorName: string;
  contactDirect: string;

  // View Switcher
  switchDashboard: string;
  switchShowroom: string;

  // Nav items
  navHome: string;
  navAbout: string;
  navServices: string;
  navPortfolio: string;
  navCatalog: string;
  navPricing: string;
  navFaq: string;
  navContact: string;

  // Sidebar Groups & Items
  groupSalesCRM: string;
  groupInventory: string;
  groupFinanceAdmin: string;
  navDashboard: string;
  navPOS: string;
  navPOSSub: string;
  navCustomers: string;
  navInventory: string;
  navStockIn: string;
  navStockInSub: string;
  navAlerts: string;
  navBills: string;
  navUsers: string;
  navProfile: string;
  navCurrencies: string;
  navLogout: string;
  languageLabel: string;
  badgeSale: string;
  badgeImport: string;

  // Top Header Titles & Actions
  headerDashboard: string;
  headerCustomers: string;
  headerInventory: string;
  headerStockIn: string;
  headerPOS: string;
  headerBills: string;
  headerAlerts: string;
  headerUsers: string;
  headerProfile: string;
  quickPOSBtn: string;
  quickStockInBtn: string;
  roleSuperAdmin: string;
  roleBranchAdmin: string;
  roleSales: string;
  roleTechnician: string;
  roleGeneralUser: string;
  switchRoleBtn: string;
  supabaseDatabase: string;
  offlineSync: string;
  profileTooltip: string;
  currencyTooltip: string;
  timeframeSelector: string;
  tfDay: string;
  tfWeek: string;
  tfMonth: string;
  tfYear: string;
  catWalkIn: string;
  catOnline: string;
  catEvent: string;

  // Dashboard Stats
  totalLeads: string;
  testDrivesScheduled: string;
  activeServices: string;
  monthlyDeliveries: string;
  pipelineValue: string;
  conversionRate: string;

  // Dashboard Tabs
  tabOverview: string;
  tabPipeline: string;
  tabTestDrives: string;
  tabServiceBays: string;
  tabCalculator: string;

  // Actions & Common
  addNewLead: string;
  bookTestDrive: string;
  requestService: string;
  calculateLoan: string;
  viewDetails: string;
  callNow: string;
  whatsappChat: string;
  saveChanges: string;
  cancel: string;
  exportQuote: string;
  searchPlaceholder: string;
  filterAll: string;
  save: string;
  confirm: string;
  delete: string;
  edit: string;
  close: string;
  loading: string;
  success: string;
  error: string;
  unitCars: string;
  unitBills: string;
  unitItems: string;
  unitPeople: string;

  // Statuses
  statusNew: string;
  statusContacted: string;
  statusTestDrive: string;
  statusNegotiation: string;
  statusDelivered: string;
  statusLost: string;

  // Inventory & Stock
  stockAll: string;
  stockAvailable: string;
  stockReserved: string;
  stockSold: string;
  stockPdiPending: string;
  stockPdiPassed: string;
  tableModel: string;
  tableColor: string;
  tableVin: string;
  tablePrice: string;
  tableStock: string;
  tableStatus: string;
  tableActions: string;
  addVehicle: string;
  importVehicles: string;

  // Stock In Form
  stockInTitle: string;
  stockInSubtitle: string;
  supplierName: string;
  warehouseDest: string;
  vehicleModelSelect: string;
  trimSpec: string;
  bodyColor: string;
  vinNumber: string;
  engineNumber: string;
  plateNumber: string;
  importCostUSD: string;
  sellingPriceUSD: string;
  quantityUnits: string;
  importDate: string;
  saveStockInBtn: string;
  printStockInReceipt: string;

  // POS Sales
  posTitle: string;
  posSubtitle: string;
  selectVehicleToSell: string;
  buyerInfo: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerIDPassport: string;
  paymentType: string;
  paymentCash: string;
  paymentTransfer: string;
  paymentInstallments: string;
  sellingPrice: string;
  discountAmount: string;
  netPaymentTotal: string;
  confirmSaleAndDeduct: string;
  saleCompletedSuccess: string;
  printInvoiceBtn: string;

  // Bills Management
  billsTitle: string;
  billsSubtitle: string;
  filterAllBills: string;
  filterSaleBills: string;
  filterImportBills: string;
  billNumber: string;
  billDate: string;
  billAmount: string;
  billType: string;
  noBillsFound: string;

  // Alerts
  alertsTitle: string;
  criticalStockAlert: string;
  warningStockAlert: string;
  outOfStockWarning: string;
  minThreshold: string;
  recommendedOrder: string;
  updateThresholdBtn: string;

  // Users & Permissions
  usersTitle: string;
  usersSubtitle: string;
  addUserBtn: string;
  memberName: string;
  memberRole: string;
  memberDepartment: string;
  memberStatus: string;
  grantAdminPrivilege: string;
  activeStatus: string;
  suspendedStatus: string;

  // Profile
  profileTitle: string;
  profileSubtitle: string;
  accountDetails: string;
  contactNumber: string;
  securityPermissions: string;

  // Currencies Modal
  currencyTitle: string;
  currencySubtitle: string;
  baseCurrencyUSD: string;
  exchangeRateLAK: string;
  exchangeRateTHB: string;
  saveRatesBtn: string;

  // Auth & Login
  authOnline: string;
  authSystemTitle: string;
  authSignInTitle: string;
  authSignUpTitle: string;
  authSignInDesc: string;
  authSignUpDesc: string;
  authEmailOrPhone: string;
  authPassword: string;
  authConfirmPassword: string;
  authFullName: string;
  authRememberMe: string;
  authNoAccount: string;
  authHaveAccount: string;
  authSignInBtn: string;
  authSignUpBtn: string;
  authValidEmail: string;
  authPasswordMatch: string;
  authPasswordMismatch: string;
  authSecurityStrength: string;
  authMatrixLightsOn: string;
  authMatrixLightsOff: string;
  authBatterySpec: string;
  authAccelSpec: string;
  authPowerSpec: string;
  authSafetySpec: string;

  // Showroom Copy
  heroTitle: string;
  heroSubtitle: string;
  bookDriveCTA: string;
  exploreInventory: string;

  // Service highlights
  serviceHighlight1Title: string;
  serviceHighlight1Desc: string;
  serviceHighlight2Title: string;
  serviceHighlight2Desc: string;
  serviceHighlight3Title: string;
  serviceHighlight3Desc: string;

  // Dashboard Specific
  dashboardTitle: string;
  dashboardSubtitle: string;
  consoleSubtitle: string;
  kpiTotalLeads: string;
  kpiTotalCars: string;
  kpiRevenueTitle: string;
  readyForSale: string;
  manageCrmAction: string;
  checkStockAction: string;
  viewBillsAction: string;
  customerCategoryTitle: string;
  customerCategorySubtitle: string;
  viewAllDetails: string;
  latestCustomers: string;
  ratioLabel: string;
  eventsAndPromotionsTitle: string;
  eventsAndPromotionsSubtitle: string;
  viewEventStock: string;
  openPosPromo: string;
  noPromotionsTitle: string;
  noPromotionsDesc: string;
  inventoryStagesTitle: string;
  inventoryStagesSubtitle: string;
  manageAllStock: string;
  stage1Imported: string;
  stage1Desc: string;
  stage2PDI: string;
  stage2Desc: string;
  stage3Ready: string;
  stage3Desc: string;
  stage4Reserved: string;
  stage4Desc: string;
  stage5Event: string;
  stage5Desc: string;
  stage6Promo: string;
  stage6Desc: string;
  noEventCarsNow: string;
  noPromoCarsNow: string;

  // Customer View Specific
  customerViewTitle: string;
  customerViewSubtitle: string;
  assignedOfficer: string;
  inputFormHeader: string;
  customerTypeLabel: string;
  customerNameLabel: string;
  customerPhoneLabel: string;
  customerEmailLabel: string;
  interestedModelLabel: string;
  priorityLabel: string;
  budgetLabel: string;
  notesLabel: string;
  saveCustomerBtn: string;
  savedCustomerSuccess: string;
  filterByStatus: string;
  statusAll: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  createQuoteAction: string;
  callCustomer: string;
  whatsappCustomer: string;
  noCustomersFound: string;

  // Inventory View Specific
  inventoryViewTitle: string;
  inventoryViewSubtitle: string;
  tabStockList: string;
  tabStockHistory: string;
  filterAllStatus: string;
  filterAllModels: string;
  filterAllEventPromo: string;
  filterEventOnly: string;
  filterStandardOnly: string;
  btnSellCar: string;
  btnEditPrice: string;
  btnDeleteCar: string;
  sellModalTitle: string;
  sellModalDesc: string;
  editModalTitle: string;
  editModalDesc: string;
  vehiclePriceStarting: string;
  pdiStatusLabel: string;
  pdiPassedLabel: string;
  pdiPendingLabel: string;
  pdiFailedLabel: string;
  historyStockIn: string;
  historyStockOut: string;
  noInventoryFound: string;
  toastSaleSuccess: string;
  toastUpdateSuccess: string;
  toastDeleteSuccess: string;

  // Stock In View Specific
  stockInHeader: string;
  stockInHeaderSub: string;
  basicInfoSection: string;
  customsSection: string;
  pdiSection: string;
  customsDocNo: string;
  entryPort: string;
  pdiInspectorLabel: string;
  pdiNotesLabel: string;
  notesGeneral: string;
  uploadCarImage: string;
  imageUploadSuccess: string;
  generateRandomVinBtn: string;
  quickSetDays: string;
  eventCampaignName: string;
  eventStartDateLabel: string;
  eventEndDateLabel: string;
  eventLocationLabel: string;
  promoDiscountUSDLabel: string;
  promoNotesLabel: string;

  // POS Sales Specific
  posHeader: string;
  posHeaderSub: string;
  companyBankTransfer: string;
  scanQrToPay: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  cashPaymentDesc: string;
  installmentLoanDesc: string;
  downPaymentLabel: string;
  loanTermMonths: string;
  monthlyInstallment: string;
  companySealSignature: string;
  customerSignature: string;
  salesRepresentative: string;
  invoiceThankYou: string;

  // Bills Specific
  billsHeader: string;
  billsHeaderSub: string;
  printBillBtn: string;
  deleteBillBtn: string;
  confirmDeleteBill: string;
  billTotalSalesRevenue: string;
  billTotalImportValuation: string;

  // Stock Alerts Specific
  alertsHeader: string;
  alertsHeaderSub: string;
  criticalZeroStock: string;
  lowStockThreshold: string;
  restockModalTitle: string;
  restockQuantity: string;
  restockBtnConfirm: string;
  toastRestockSuccess: string;

  // Modals Specific
  modalAddLeadTitle: string;
  modalAddLeadSub: string;
  modalQuoteTitle: string;
  modalServiceTitle: string;
  modalServiceSub: string;
  modalTestDriveTitle: string;
  modalTestDriveSub: string;
  modalVehicleSpecs: string;
  modalPrint: string;
  modalClose: string;

  // Theme & Password Change
  themeMode: string;
  darkMode: string;
  lightMode: string;
  changePasswordBtn: string;
  currentPasswordLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  passwordMismatchError: string;
  passwordSuccessMsg: string;
  userGovernanceTitle: string;
  manageUsersFromProfileBtn: string;
}

export const translations: Record<'lo' | 'en' | 'th', TranslationSchema> = {
  lo: {
    brandName: 'AVATR AUTO SERVICE',
    subBrand: 'ລະບົບຈັດການລູກຄ້າ ແລະ ໂຊຣູມລົດໄຟຟ້າຊັ້ນສູງ',
    tagline: 'Emotional Luxury & Smart EV Mobility',
    directorTitle: 'ຝ່າຍບໍລິຫານ & ທີ່ປຶກສາການຂາຍ',
    directorName: 'AVATR Executive Team',
    contactDirect: '020 55575537',

    // View Switcher
    switchDashboard: 'ລະບົບ Dashboard ຈັດການລູກຄ້າ',
    switchShowroom: 'ໂຊຣູມລົດ AVATR (Client Portal)',

    // Nav items
    navHome: 'ໜ້າຫຼັກ (Home)',
    navAbout: 'ກ່ຽວກັບພວກເຮົາ (About)',
    navServices: 'ບໍລິການສ້ອມແປງ (Services)',
    navPortfolio: 'ຜົນງານສົ່ງມອບ (Portfolio)',
    navCatalog: 'ລຸ້ນລົດທັງໝົດ (Catalog)',
    navPricing: 'ລາຄາ & ຕາຕະລາງຜ່ອນ (Pricing)',
    navFaq: 'ຄຳຖາມທີ່ພົບເລື້ອຍ (FAQ)',
    navContact: 'ຕິດຕໍ່ພວກເຮົາ (Contact)',

    // Sidebar Groups & Items
    groupSalesCRM: 'ງານຂາຍ & ລູກຄ້າ',
    groupInventory: 'ຄັງສິນຄ້າ & ສະຕ໋ອກ',
    groupFinanceAdmin: 'ການເງິນ & ບໍລິຫານ',
    navDashboard: 'Dashboard (ພາບລວມ)',
    navPOS: 'POS ຂາຍລົດຍົນ',
    navPOSSub: 'ອອກບິນ & ຕັດສະຕ໋ອກ',
    navCustomers: 'ລູກຄ້າ (CRM)',
    navInventory: 'ສະຕ໋ອກລົດ (Stock)',
    navStockIn: 'ປ້ອນນຳເຂົ້າລົດ (Stock-In)',
    navStockInSub: 'ຮັບລົດ & ອອກໃບຮັບ',
    navAlerts: 'ແຈ້ງເຕືອນສະຕ໋ອກ',
    navBills: 'ບັນທຶກບິນ & ໃບຮັບ',
    navUsers: 'ອະນຸຍາດ & ມອບສິດ',
    navProfile: 'ໂປຣໄຟລ໌ສ່ວນຕົວ',
    navCurrencies: 'ສະກຸນເງິນ (Currencies)',
    navLogout: 'ອອກຈາກລະບົບ',
    languageLabel: 'ພາສາ:',
    badgeSale: 'ຂາຍ',
    badgeImport: 'ນຳເຂົ້າ',

    // Top Header Titles & Actions
    headerDashboard: 'Dashboard • ພາບລວມລະບົບ',
    headerCustomers: 'ລູກຄ້າ CRM • ຖານຂໍ້ມູນ & ຕິດຕາມ',
    headerInventory: 'ສະຕ໋ອກລົດ AVATR • ຄັງສິນຄ້າທັງໝົດ',
    headerStockIn: 'ປ້ອນນຳເຂົ້າລົດ • Stock-In Entry',
    headerPOS: 'POS ຂາຍລົດຍົນ • ອອກໃບບິນ & ຕັດສະຕ໋ອກ',
    headerBills: 'ບັນທຶກບິນທັງໝົດ • ໃບຮັບ & ໃບຂາຍ',
    headerAlerts: 'ແຈ້ງເຕືອນສະຕ໋ອກ • ໃກ້ໝົດ & ສັ່ງເພີ່ມ',
    headerUsers: 'ອະນຸຍາດສະມາຊິກ • ມອບສິດ (Admin)',
    headerProfile: 'ໂປຣໄຟລ໌ຜູ້ໃຊ້ • ຂໍ້ມູນບັນຊີ',
    quickPOSBtn: '+ ຂາຍລົດ (POS)',
    quickStockInBtn: '+ ນຳເຂົ້າລົດ',
    roleSuperAdmin: 'Admin',
    roleBranchAdmin: 'Admin ສາຂາ',
    roleSales: 'ທີ່ປຶກສາການຂາຍ',
    roleTechnician: 'ຊ່າງກວດ PDI & CATL',
    roleGeneralUser: 'User ທຳມະດາ',
    switchRoleBtn: 'ປ່ຽນສິດ',
    supabaseDatabase: 'Supabase Database',
    offlineSync: 'Offline Persistence',
    profileTooltip: 'ເບິ່ງໂປຣໄຟລ໌ສ່ວນຕົວ',
    currencyTooltip: 'ເລືອກ ຫຼື ຕັ້ງຄ່າສະກຸນເງິນ',
    timeframeSelector: 'ຊ່ວງເວລາ:',
    tfDay: 'ມື້ (Day)',
    tfWeek: 'ອາທິດ (Week)',
    tfMonth: 'ເດືອນ (Month)',
    tfYear: 'ປີ (Year)',
    catWalkIn: 'ລູກຄ້າ Walk-in',
    catOnline: 'ລູກຄ້າ Online',
    catEvent: 'ລູກຄ້າ Event',

    // Dashboard Stats
    totalLeads: 'ລູກຄ້າສົນໃຈທັງໝົດ',
    testDrivesScheduled: 'ນັດໝາຍທົດລອງຂັບ',
    activeServices: 'ກຳລັງສ້ອມບຳລຸງ / ເຊັກແບັດ',
    monthlyDeliveries: 'ຍອດສົ່ງມອບລົດເດືອນນີ້',
    pipelineValue: 'ມູນຄ່າການຂາຍໃນ Pipeline',
    conversionRate: 'ອັດຕາການປິດການຂາຍ',

    // Dashboard Tabs
    tabOverview: 'ພາບລວມລະບົບ',
    tabPipeline: 'ຈັດການລູກຄ້າ (CRM Pipeline)',
    tabTestDrives: 'ຕາຕະລາງທົດລອງຂັບ',
    tabServiceBays: 'ສູນບໍລິການ avatrAutoService',
    tabCalculator: 'ຄຳນວນເງິນດາວน์ & ຄ່າງວດ',

    // Actions & Common
    addNewLead: 'ເພີ່ມລູກຄ້າໃໝ່',
    bookTestDrive: 'ຈອງທົດລອງຂັບ',
    requestService: 'ນັດໝາຍສ້ອມບຳລຸງ',
    calculateLoan: 'ຄຳນວນສິນເຊື່ອ',
    viewDetails: 'ເບິ່ງລາຍລະອຽດ',
    callNow: 'ໂທດ່ວນ',
    whatsappChat: 'ສົນທະນາ WhatsApp',
    saveChanges: 'ບັນທຶກຂໍ້ມູນ',
    cancel: 'ຍົກເລີກ',
    exportQuote: 'ພິມໃບສະເໜີລາຄາ (PDF/Print)',
    searchPlaceholder: 'ຄົ້ນຫາ...',
    filterAll: 'ທັງໝົດ',
    save: 'ບັນທຶກ',
    confirm: 'ຢືນຢັນ',
    delete: 'ລຶບ',
    edit: 'ແກ້ໄຂ',
    close: 'ປິດ',
    loading: 'ກຳລັງໂຫລດ...',
    success: 'ສຳເລັດ',
    error: 'ເກີດຂໍ້ຜິດພາດ',
    unitCars: 'ຄັນ',
    unitBills: 'ສະບັບ',
    unitItems: 'ລາຍການ',
    unitPeople: 'ຄົນ',

    // Statuses
    statusNew: 'ສອບຖາມໃໝ່',
    statusContacted: 'ຕິດຕໍ່ແລ້ວ',
    statusTestDrive: 'ນັດທົດລອງຂັບ',
    statusNegotiation: 'ເຈລະຈາ / ສະເໜີລາຄາ',
    statusDelivered: 'ສົ່ງມອບສຳເລັດ',
    statusLost: 'ຍົກເລີກ / ພາດໂອກາດ',

    // Inventory & Stock
    stockAll: 'ສະຕ໋ອກທັງໝົດ',
    stockAvailable: 'ພ້ອມສົ່ງມອບ / ພ້ອມຂາຍ',
    stockReserved: 'ຈອງແລ້ວ',
    stockSold: 'ສົ່ງມອບແລ້ວ (Sold)',
    stockPdiPending: 'ລໍຖ້າ PDI ກວດເຊັກ',
    stockPdiPassed: 'ຜ່ານ PDI ແລ້ວ',
    tableModel: 'ລຸ້ນລົດ',
    tableColor: 'ສີ / ປ້າຍ',
    tableVin: 'ເລກຖັງ (VIN)',
    tablePrice: 'ລາຄາ',
    tableStock: 'ຈຳນວນ',
    tableStatus: 'ສະຖານະ',
    tableActions: 'ຈັດການ',
    addVehicle: 'ເພີ່ມລົດໃໝ່',
    importVehicles: 'ນຳເຂົ້າລົດ',

    // Stock In Form
    stockInTitle: 'ປ້ອນນຳເຂົ້າລົດ (Stock-In Entry)',
    stockInSubtitle: 'ບັນທຶກການຮັບລົດໃໝ່ເຂົ້າສາງ, ອອກໃບບິນ Stock-In ແລະ ເພີ່ມສະຕ໋ອກອັດຕະໂນມັດ',
    supplierName: 'ແຫຼ່ງທີ່ມາ / ຊື່ຜູ້ສະໜອງ (Supplier)',
    warehouseDest: 'ສາງປາຍທາງ (Destination Warehouse)',
    vehicleModelSelect: 'ເລືອກລຸ້ນລົດ (Vehicle Model)',
    trimSpec: 'ລຸ້ນຍ່ອຍ / ອັອບຊັ່ນ (Trim & Options)',
    bodyColor: 'ສີຕົວຖັງ (Body Color)',
    vinNumber: 'ເລກຕົວຖັງ (VIN 17 ຫຼັກ)',
    engineNumber: 'ເລກເຄື່ອງຍົນ / ມໍເຕີ (Motor No)',
    plateNumber: 'ໝາຍເລກປ້າຍ / ປ້າຍຊົ່ວຄາວ',
    importCostUSD: 'ຕົ້ນທຶນນຳເຂົ້າ (Cost USD)',
    sellingPriceUSD: 'ລາຄາຂາຍຕັ້ງໄວ້ (Selling Price USD)',
    quantityUnits: 'ຈຳນວນລົດທີ່ນຳເຂົ້າ (Quantity)',
    importDate: 'ວັນທີນຳເຂົ້າ',
    saveStockInBtn: 'ບັນທຶກການນຳເຂົ້າ & ເພີ່ມສະຕ໋ອກ',
    printStockInReceipt: 'ພິມໃບຮັບສິນຄ້າ (Stock-In Receipt)',

    // POS Sales
    posTitle: 'POS ຂາຍລົດຍົນ & ອອກໃບບິນ (Sales Billing)',
    posSubtitle: 'ລະບົບອອກໃບສັ່ງຊື້/ໃບຂາຍລົດ, ຄຳນວນສ່ວນຫຼຸດ, ຕັດສະຕ໋ອກ ແລະ ບັນທຶກລາຍຮັບທັນທີ',
    selectVehicleToSell: 'ເລືອກລົດໃນສະຕ໋ອກທີ່ຈະຂາຍ',
    buyerInfo: 'ຂໍ້ມູນຜູ້ຊື້ / ລູກຄ້າ',
    buyerName: 'ຊື່ ແລະ ນາມສະກຸນ ລູກຄ້າ *',
    buyerPhone: 'ເບີໂທລະສັບຕິດຕໍ່ *',
    buyerAddress: 'ທີ່ຢູ່ / ບ້ານ, ເມືອງ, ແຂວງ',
    buyerIDPassport: 'ເລກບັດປະຊາຊົນ / Passport',
    paymentType: 'ຮູບແບບການຊຳລະເງິນ',
    paymentCash: 'ເງິນສົດ (Cash)',
    paymentTransfer: 'ໂອນເງິນຜ່ານທະນາຄານ (Bank Transfer)',
    paymentInstallments: 'ຜ່ອນຊຳລະ / ສິນເຊື່ອ (Installments)',
    sellingPrice: 'ລາຄາຂາຍລົດ',
    discountAmount: 'ສ່ວນຫຼຸດ (Discount)',
    netPaymentTotal: 'ຍອດເງິນສຸດທິທີ່ຕ້ອງຊຳລະ (Net Total)',
    confirmSaleAndDeduct: 'ຢືນຢັນການຂາຍ & ຕັດສະຕ໋ອກລົດ',
    saleCompletedSuccess: 'ອອກໃບບິນຂາຍລົດ ແລະ ຕັດສະຕ໋ອກສຳເລັດ!',
    printInvoiceBtn: 'ພິມໃບຮັບເງິນ / ໃບຂາຍ (Tax Invoice)',

    // Bills Management
    billsTitle: 'ບັນທຶກບິນ ແລະ ໃບຮັບທັງໝົດ (Bills & Invoices)',
    billsSubtitle: 'ລວມປະຫວັດໃບຂາຍລົດ (POS Invoices) ແລະ ໃບນຳເຂົ້າລົດ (Stock-In Receipts)',
    filterAllBills: 'ບິນທັງໝົດ',
    filterSaleBills: 'ໃບຂາຍລົດ (Sales)',
    filterImportBills: 'ໃບຮັບນຳເຂົ້າ (Stock-In)',
    billNumber: 'ເລກທີໃບບິນ',
    billDate: 'ວັນທີ / ເວລາ',
    billAmount: 'ມູນຄ່າລວມ',
    billType: 'ປະເພດບິນ',
    noBillsFound: 'ບໍ່ພົບລາຍການໃບບິນ',

    // Alerts
    alertsTitle: 'ແຈ້ງເຕືອນສະຕ໋ອກລົດ (Stock Inventory Alerts)',
    criticalStockAlert: 'ສະຕ໋ອກໝົດ (Critical Out of Stock)',
    warningStockAlert: 'ສະຕ໋ອກໃກ້ໝົດ (Low Stock Warning)',
    outOfStockWarning: 'ໝົດສະຕ໋ອກແລ້ວ ກະລຸນາສັ່ງນຳເຂົ້າເພີ່ມ',
    minThreshold: 'ຈຸດເຕືອນຂັ້ນຕ່ຳ',
    recommendedOrder: 'ຈຳນວນແນະນຳໃຫ້ນຳເຂົ້າ',
    updateThresholdBtn: 'ປັບຄ່າແຈ້ງເຕືອນ',

    // Users & Permissions
    usersTitle: 'ຈັດການຜູ້ໃຊ້ ແລະ ສິດການເຂົ້າເຖິງ (User Management & Roles)',
    usersSubtitle: 'ອະນຸມັດສະມາຊິກທີມ, ມອບສິດ Admin ຫຼື ຜູ້ໃຊ້ທົ່ວໄປ ແລະ ຄວບຄຸມລະບົບ',
    addUserBtn: '+ ເພີ່ມສະມາຊິກໃໝ່',
    memberName: 'ຊື່ສະມາຊິກ',
    memberRole: 'ສິດການໃຊ້ງານ',
    memberDepartment: 'ພະແນກ',
    memberStatus: 'ສະຖານະ',
    grantAdminPrivilege: 'ມອບສິດ Admin',
    activeStatus: 'ກຳລັງໃຊ້ງານ (Active)',
    suspendedStatus: 'ລະງັບຊົ່ວຄາວ (Suspended)',

    // Profile
    profileTitle: 'ໂປຣໄຟລ໌ຜູ້ໃຊ້ງານ (User Profile)',
    profileSubtitle: 'ຂໍ້ມູນບັນຊີ, ຕຳແໜ່ງ, ພະແນກ ແລະ ສິດການເຂົ້າເຖິງລະບົບ',
    accountDetails: 'ຂໍ້ມູນບັນຊີ',
    contactNumber: 'ເບີໂທລະສັບ',
    securityPermissions: 'ສິດທິຄວາມປອດໄພທີ່ໄດ້ຮັບ',

    // Currencies Modal
    currencyTitle: 'ຕັ້ງຄ່າສະກຸນເງິນ (Currencies)',
    currencySubtitle: 'ເລືອກ ແລະ ຈັດການສະກຸນເງິນໃນລະບົບ',
    baseCurrencyUSD: 'ສະກຸນເງິນຫຼັກ: ໂດລາສະຫະລັດ (USD $)',
    exchangeRateLAK: 'ອັດຕາແລກປ່ຽນ 1 USD -> ກີບ (LAK ₭)',
    exchangeRateTHB: 'ອັດຕາແລກປ່ຽນ 1 USD -> ບາດ (THB ฿)',
    saveRatesBtn: 'ບັນທຶກອັດຕາແລກປ່ຽນ',

    // Auth & Login
    authOnline: 'ONLINE',
    authSystemTitle: 'ລະບົບຈັດການ AVATR AUTO',
    authSignInTitle: 'ເຂົ້າສູ່ລະບົບ (Sign In)',
    authSignUpTitle: 'ສ້າງບັນຊີໃໝ່ (Sign Up)',
    authSignInDesc: 'ເຂົ້າສູ່ລະບົບຈັດການ AVATR AUTO SERVICE',
    authSignUpDesc: 'ສ້າງບັນຊີຜູ້ໃຊ້ໃໝ່ ເພື່ອເຂົ້າຮ່ວມທີມງານ AVATR',
    authEmailOrPhone: 'ອີເມວ ຫຼື ເບີໂທລະສັບ (Email / Phone)',
    authPassword: 'ລະຫັດຜ່ານ (Password)',
    authConfirmPassword: 'ຢືນຢັນລະຫັດຜ່ານ (Confirm Password)',
    authFullName: 'ຊື່ ແລະ ນາມສະກຸນ (Full Name) *',
    authRememberMe: 'ຈົດຈຳການເຂົ້າສູ່ລະບົບ (Remember Me)',
    authNoAccount: 'ຍັງບໍ່ມີບັນຊີ? ສ້າງບັນຊີໃໝ່',
    authHaveAccount: 'ມີບັນຊີແລ້ວ? ເຂົ້າສູ່ລະບົບ',
    authSignInBtn: 'ເຂົ້າສູ່ລະບົບ (Sign In)',
    authSignUpBtn: 'ສ້າງບັນຊີ ແລະ ເຂົ້າສູ່ລະບົບ (Register & Enter)',
    authValidEmail: 'ອີເມວຖືກຕ້ອງ',
    authPasswordMatch: 'ຕົງກັນ',
    authPasswordMismatch: 'ບໍ່ຕົງກັນ',
    authSecurityStrength: 'ຄວາມປອດໄພ:',
    authMatrixLightsOn: 'ໄຟໜ້າ Matrix ON',
    authMatrixLightsOff: 'ໄຟໜ້າ OFF',
    authBatterySpec: 'ແບັດເຕີຣີ',
    authAccelSpec: 'ອັດຕາເລັ່ງ',
    authPowerSpec: 'ພະລັງຂັບ',
    authSafetySpec: 'ຄວາມປອດໄພ',

    // Showroom Copy
    heroTitle: 'ອະນາຄົດແຫ່ງຍົນລະກຳໄຟຟ້າຊັ້ນສູງ',
    heroSubtitle: 'ປະສົບການຂັບຂີ່ລົດໄຟຟ້າ Minimal Luxury ລະດັບ Flagship ພ້ອມລະບົບອັດສະລິຍະ Huawei ADS 3.0 ແລະ ແບັດເຕີຣີ CATL',
    bookDriveCTA: 'ນັດໝາຍທົດລອງຂັບ (Book Test Drive)',
    exploreInventory: 'ເລືອກຊົມລົດພ້ອມສົ່ງມອບ',

    // Service highlights
    serviceHighlight1Title: 'ສູນວິເຄາະແບັດເຕີຣີ CATL ແຫ່ງດຽວ',
    serviceHighlight1Desc: 'ກວດວັດຄ່າ State of Health (SOH) ດ້ວຍຊອບແວສະເພາະ ພ້ອມຮັບປະກັນ 8 ປີ 160,000 km',
    serviceHighlight2Title: 'ອັບເກຣດ OTA & HarmonyOS Cockpit',
    serviceHighlight2Desc: 'ບໍລິການອັບເດດລະບົບຊ່ວຍຂັບອັດຕະໂນມັດ Huawei Qiankun ADS ແລະ ລະບົບແຜນທີ່ເສັ້ນທາງລາວ-ຈີນ',
    serviceHighlight3Title: 'ບໍລິການກູ້ໄພສຸກເສີນ 24 ຊົ່ວໂມງ',
    serviceHighlight3Desc: 'ລົດຊ່ວຍເຫຼືອສຸກເສີນ Mobile Service ພ້ອມທີມຊ່າງຊ່ຽວຊານປະຈຳນະຄອນຫຼວງວຽງຈັນ',

    // Dashboard Specific
    dashboardTitle: 'Dashboard ພາບລວມທຸລະກິດ',
    dashboardSubtitle: 'ຕິດຕາມລູກຄ້າ Walk-in / Online / Event ແລະ ສະຖານະຄັງລົດໃນສາງທຸກຂັ້ນຕອນ',
    consoleSubtitle: 'AVATR AUTO SERVICE MANAGEMENT CONSOLE',
    kpiTotalLeads: 'ລູກຄ້າທັງໝົດ',
    kpiTotalCars: 'ລົດໃນສາງທັງໝົດ',
    kpiRevenueTitle: 'ຍອດມູນຄ່າຂາຍ',
    readyForSale: 'ພ້ອມຂາຍ',
    manageCrmAction: 'ຈັດການຂໍ້ມູນລູກຄ້າ CRM',
    checkStockAction: 'ກວດເຊັກສະຕ໋ອກລົດ',
    viewBillsAction: 'ບັນທຶກບິນ',
    customerCategoryTitle: 'ສະແດງລູກຄ້າແບ່ງຕາມໝວດ (Walk in, Online, Event)',
    customerCategorySubtitle: 'ແຍກຊ່ອງທາງທີ່ລູກຄ້າຕິດຕໍ່ເຂົ້າມາ ເພື່ອຕິດຕາມການຂາຍໃຫ້ຖືກຕ້ອງ',
    viewAllDetails: 'ເບິ່ງລາຍລະອຽດທັງໝົດ',
    latestCustomers: 'ລູກຄ້າຫຼ້າສຸດ:',
    ratioLabel: 'ສັດສ່ວນ:',
    eventsAndPromotionsTitle: 'ສິນຄ້າ Event ແລະ ໂປຣໂມຊັນພິເສດ (Promotions & Events)',
    eventsAndPromotionsSubtitle: 'ລົດທີ່ນຳໄປຈັດສະແດງໃນງານ Event, ງານ Roadshow ແລະ ແຄມເປນຂອງແຖມພິເສດຫຼ້າສຸດ',
    viewEventStock: 'ເບິ່ງສະຕ໋ອກລົດ Event',
    openPosPromo: 'ເປີດບິນຂາຍ POS ໂປຣໂມຊັນ',
    noPromotionsTitle: 'ຍັງບໍ່ມີແຄມເປນ ຫຼື ໂປຣໂມຊັນພິເສດໃນຕອນນີ້',
    noPromotionsDesc: 'ທ່ານສາມາດເພີ່ມລົດແຄມເປນ, ງານ Event ແລະ ໂປຣໂມຊັນຕົວຈິງຜ່ານລະບົບສະຕັອກ (Stock-In)',
    inventoryStagesTitle: 'ສະຖານະຄັງລົດໃນສາງ (ລວມລົດ Event & ໂປຣໂມຊັນ)',
    inventoryStagesSubtitle: 'ຕິດຕາມລົດທຸກຄັນ ຕັ້ງແຕ່ນຳເຂົ້າ, PDI, ຈັດສະແດງໃນງານ Event ຈົນເຖິງສົ່ງມອບ',
    manageAllStock: 'ຈັດການຄັງສິນຄ້າທັງໝົດ',
    stage1Imported: '1. ນຳເຂົ້າ',
    stage1Desc: 'ມາຮອດດ່ານບໍ່ເຕັນ / ສາງດົງໂດກ ລໍຖ້າກຽມກວດ',
    stage2PDI: '2. ກຳລັງ PDI',
    stage2Desc: 'ກວດສອບ 68 ຈຸດ: ແບັດ CATL, LiDAR, OTA',
    stage3Ready: '3. ພ້ອມຂາຍ',
    stage3Desc: 'PDI ຜ່ານ 100%, ຈອດຢູ່ໂຊຣູມໃຫຍ່',
    stage4Reserved: '4. ຈອງແລ້ວ',
    stage4Desc: 'ລູກຄ້າວາງມັດຈຳ/ເຊັນສັນຍາແລ້ວ',
    stage5Event: '5. ງານ Event',
    stage5Desc: 'ຈັດສະແດງໃນງານ Motor Expo & Roadshow',
    stage6Promo: '6. ໂປຣໂມຊັນ',
    stage6Desc: 'ລົດແຄມເປນພິເສດ ດອກເບ້ຍ 0% & ຂອງແຖມ',
    noEventCarsNow: 'ບໍ່ມີລົດໃນງານຕອນນີ້',
    noPromoCarsNow: 'ບໍ່ມີລົດໂປຣຕອນນີ້',

    // Customer View Specific
    customerViewTitle: 'ລະບົບຈັດການລູກຄ້າ (Customers CRM)',
    customerViewSubtitle: 'ຖານຂໍ້ມູນລູກຄ້າ Walk-in, Online ແລະ Event ພ້ອມການຕິດຕາມສະຖານະການຂາຍ',
    assignedOfficer: 'ຜູ້ຮັບຜິດຊອບ:',
    inputFormHeader: 'ເພີ່ມຂໍ້ມູນລູກຄ້າໃໝ່ (Input Form)',
    customerTypeLabel: 'ປະເພດລູກຄ້າ (3 ໝວດ) *',
    customerNameLabel: 'ຊື່ ແລະ ນາມສະກຸນ *',
    customerPhoneLabel: 'ເບີໂທລະສັບ (Laos Mobile) *',
    customerEmailLabel: 'ອີເມວ (Email)',
    interestedModelLabel: 'ລຸ້ນລົດທີ່ສົນໃຈ *',
    priorityLabel: 'ລະດັບຄວາມດ່ວນ *',
    budgetLabel: 'ງົບປະມານປະມານການ',
    notesLabel: 'ໝາຍເຫດ / ຄວາມຕ້ອງການເພີ່ມເຕີມ',
    saveCustomerBtn: 'ບັນທຶກຂໍ້ມູນລູກຄ້າ',
    savedCustomerSuccess: 'ບັນທຶກລູກຄ້າໃໝ່ເຂົ້າລະບົບຮຽບຮ້ອຍແລ້ວ!',
    filterByStatus: 'ກັ່ນຕອງສະຖານະ:',
    statusAll: 'ທັງໝົດ',
    priorityHigh: 'ສູງ (High)',
    priorityMedium: 'ປານກາງ (Medium)',
    priorityLow: 'ທົ່ວໄປ (Low)',
    createQuoteAction: 'ອອກໃບສະເໜີລາຄາ',
    callCustomer: 'ໂທຫາລູກຄ້າ',
    whatsappCustomer: 'WhatsApp',
    noCustomersFound: 'ບໍ່ພົບຂໍ້ມູນລູກຄ້າທີ່ກົງກັບເງື່ອນໄຂ',

    // Inventory View Specific
    inventoryViewTitle: 'ຄັງສິນຄ້າ & ສະຕ໋ອກລົດ (Inventory)',
    inventoryViewSubtitle: 'ຈັດການລົດທັງໝົດ, ອັບເດດສະຖານະ PDI, ກຳນົດລາຄາ ແລະ ປະຫວັດການຂາຍ',
    tabStockList: 'ລາຍການສະຕ໋ອກລົດ (Inventory Stock)',
    tabStockHistory: 'ປະຫວັດການເຄື່ອນໄຫວ (Stock Movement Logs)',
    filterAllStatus: 'ສະຖານະທັງໝົດ',
    filterAllModels: 'ລຸ້ນລົດທັງໝົດ',
    filterAllEventPromo: 'ທຸກຮູບແບບ',
    filterEventOnly: 'ສະເພາະລົດ Event & ໂປຣ',
    filterStandardOnly: 'ລົດປົກກະຕິ',
    btnSellCar: 'ຂາຍລົດ (POS)',
    btnEditPrice: 'ແກ້ໄຂລາຄາ',
    btnDeleteCar: 'ລຶບລົດ',
    sellModalTitle: 'ຢືນຢັນການຂາຍລົດອອກຈາກສາງ',
    sellModalDesc: 'ບັນທຶກຂໍ້ມູນຜູ້ຊື້, ເລືອກຮູບແບບການຊຳລະ ແລະ ຕັດສະຕ໋ອກລົດອັດຕະໂນມັດ',
    editModalTitle: 'ແກ້ໄຂລາຄາ ແລະ ຂໍ້ມູນລົດ',
    editModalDesc: 'ປັບປ່ຽນລາຄາຂາຍ ແລະ ລາຍລະອຽດຂອງລົດຄັນນີ້',
    vehiclePriceStarting: 'ລາຄາເລີ່ມຕົ້ນ',
    pdiStatusLabel: 'ສະຖານະ PDI:',
    pdiPassedLabel: 'ຜ່ານ PDI ແລ້ວ',
    pdiPendingLabel: 'ລໍຖ້າ PDI',
    pdiFailedLabel: 'ບໍ່ຜ່ານ PDI',
    historyStockIn: 'ນຳເຂົ້າ (Stock-In)',
    historyStockOut: 'ຂາຍອອກ (Stock-Out)',
    noInventoryFound: 'ບໍ່ພົບລົດໃນສາງທີ່ກົງກັບເງື່ອນໄຂ',
    toastSaleSuccess: 'ຂາຍລົດ ແລະ ຕັດສະຕ໋ອກສຳເລັດ!',
    toastUpdateSuccess: 'ອັບເດດຂໍ້ມູນລົດສຳເລັດ!',
    toastDeleteSuccess: 'ລຶບລາຍການລົດອອກຈາກສາງແລ້ວ!',

    // Stock In View Specific
    stockInHeader: 'ປ້ອນນຳເຂົ້າລົດ (Stock-In Entry)',
    stockInHeaderSub: 'ບັນທຶກການຮັບລົດໃໝ່ເຂົ້າສາງ, ຂໍ້ມູນດ່ານພາສີ B01, ໃບຮັບ ແລະ ເພີ່ມສະຕ໋ອກອັດຕະໂນມັດ',
    basicInfoSection: '1. ຂໍ້ມູນລົດພື້ນຖານ (Vehicle Specifications)',
    customsSection: '2. ຂໍ້ມູນດ່ານພາສີ ແລະ ການຂົນສົ່ງ (Customs & Logistics)',
    pdiSection: '3. ການກວດກາຄຸນນະພາບ PDI (Quality Inspection)',
    customsDocNo: 'ເລກທີເອກະສານແຈ້ງພາສີ B01 / ໃບຂົນສົ່ງ',
    entryPort: 'ດ່ານນຳເຂົ້າ (Port of Entry)',
    pdiInspectorLabel: 'ຊ່າງກວດກາ PDI / ຊື່ຜູ້ກວດ',
    pdiNotesLabel: 'ຜົນການກວດກາ 68 ຈຸດ / ໝາຍເຫດ PDI',
    notesGeneral: 'ໝາຍເຫດທົ່ວໄປ',
    uploadCarImage: 'ອັບໂຫຼດຮູບພາບລົດ',
    imageUploadSuccess: 'ອັບໂຫຼດຮູບລົດຈາກອຸປະກອນສຳເລັດ!',
    generateRandomVinBtn: 'ສ້າງ VIN ອັດຕະໂນມັດ',
    quickSetDays: 'ວັນ',
    eventCampaignName: 'ຊື່ແຄມເປນ / ງານ Event',
    eventStartDateLabel: 'ວັນທີເລີ່ມງານ / ໂປຣ',
    eventEndDateLabel: 'ວັນທີສິ້ນສຸດງານ / ໂປຣ',
    eventLocationLabel: 'ສະຖານທີ່ຈັດງານ Event',
    promoDiscountUSDLabel: 'ມູນຄ່າສ່ວນຫຼຸດໂປຣໂມຊັນ (USD)',
    promoNotesLabel: 'ລາຍລະອຽດຂອງແຖມ ແລະ ເງື່ອນໄຂ',

    // POS Sales Specific
    posHeader: 'POS ຂາຍລົດຍົນ & ອອກໃບບິນ (Sales Billing)',
    posHeaderSub: 'ລະບົບອອກໃບສັ່ງຊື້/ໃບຂາຍລົດ, ຄຳນວນສ່ວນຫຼຸດ, ຕັດສະຕ໋ອກ ແລະ ບັນທຶກລາຍຮັບທັນທີ',
    companyBankTransfer: 'ໂອນເງິນຜ່ານບັນຊີບໍລິສັດ AVATR',
    scanQrToPay: 'ສະແກນ QR Code ເພື່ອຊຳລະເງິນ',
    bankAccountName: 'ຊື່ບັນຊີ:',
    bankAccountNumber: 'ເລກບັນຊີ:',
    bankBranch: 'ສາຂາ:',
    cashPaymentDesc: 'ຊຳລະດ້ວຍເງິນສົດເຕັມຈຳນວນທີ່ໂຊຣູມ',
    installmentLoanDesc: 'ຜ່ອນຊຳລະຜ່ານທະນາຄານຮ່ວມມື (BCEL, JDB, LDB)',
    downPaymentLabel: 'ເງິນດາວน์ (Down Payment)',
    loanTermMonths: 'ໄລຍະເວລາຜ່ອນ (ເດືອນ)',
    monthlyInstallment: 'ຄ່າງວດປະມານການຕໍ່ເດືອນ',
    companySealSignature: 'ລາຍເຊັນ ແລະ ກາປະທັບບໍລິສັດ',
    customerSignature: 'ລາຍເຊັນລູກຄ້າ / ຜູ້ຊື້',
    salesRepresentative: 'ທີ່ປຶກສາການຂາຍ:',
    invoiceThankYou: 'ຂອບໃຈທີ່ເລືອກໃຊ້ບໍລິການ AVATR AUTO SERVICE!',

    // Bills Specific
    billsHeader: 'ບັນທຶກບິນ ແລະ ໃບຮັບທັງໝົດ (Bills & Invoices)',
    billsHeaderSub: 'ລວມປະຫວັດໃບຂາຍລົດ (POS Invoices) ແລະ ໃບນຳເຂົ້າລົດ (Stock-In Receipts)',
    printBillBtn: 'ສັ່ງພິມໃບບິນ',
    deleteBillBtn: 'ລຶບໃບບິນ',
    confirmDeleteBill: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບໃບບິນນີ້?',
    billTotalSalesRevenue: 'ມູນຄ່າຂາຍລວມ:',
    billTotalImportValuation: 'ມູນຄ່ານຳເຂົ້າລວມ:',

    // Stock Alerts Specific
    alertsHeader: 'ແຈ້ງເຕືອນສະຕ໋ອກລົດ (Stock Inventory Alerts)',
    alertsHeaderSub: 'ກວດສອບລົດທີ່ໝົດສະຕ໋ອກ ຫຼື ໃກ້ໝົດ ເພື່ອວາງແຜນນຳເຂົ້າໃຫ້ທັນເວລາ',
    criticalZeroStock: 'ໝົດສະຕ໋ອກ (0 ຄັນ)',
    lowStockThreshold: 'ໃກ້ໝົດ (ຕ່ຳກວ່າເກນ)',
    restockModalTitle: 'ເພີ່ມສະຕ໋ອກລົດ (Restock Entry)',
    restockQuantity: 'ຈຳນວນທີ່ຕ້ອງການນຳເຂົ້າເພີ່ມ:',
    restockBtnConfirm: 'ຢືນຢັນການເພີ່ມສະຕ໋ອກ',
    toastRestockSuccess: 'ເພີ່ມສະຕ໋ອກລົດສຳເລັດຮຽບຮ້ອຍແລ້ວ!',

    // Modals Specific
    modalAddLeadTitle: 'ເພີ່ມລູກຄ້າໃໝ່ເຂົ້າລະບົບ CRM',
    modalAddLeadSub: 'ມອບໝາຍໃຫ້: ທີມງານຂາຍ AVATR',
    modalQuoteTitle: 'ໃບສະເໜີລາຄາທາງການ (Official Luxury Quotation)',
    modalServiceTitle: 'ນັດໝາຍສ້ອມບຳລຸງ avatrAutoService',
    modalServiceSub: 'ສູນບໍລິການແບັດເຕີຣີ CATL & ລະບົບໄຟຟ້າວຽງຈັນ',
    modalTestDriveTitle: 'ນັດໝາຍທົດລອງຂັບ AVATR',
    modalTestDriveSub: 'ສູນບໍລິການ AVATR ຫຼັກ 3 ທ່າເດື່ອ',
    modalVehicleSpecs: 'ຂໍ້ມູນສະເພາະຍານຍົນ',
    modalPrint: 'ສັ່ງພິມ',
    modalClose: 'ປິດ',

    // Theme & Password Change
    themeMode: 'ໂໝດສະແດງຜົນ',
    darkMode: 'ໂໝດມືດ (Dark)',
    lightMode: 'ໂໝດສະຫວ່າງ (Light)',
    changePasswordBtn: 'ປ່ຽນລະຫັດຜ່ານ',
    currentPasswordLabel: 'ລະຫັດຜ່ານປັດຈຸບັນ',
    newPasswordLabel: 'ລະຫັດຜ່ານໃໝ່',
    confirmPasswordLabel: 'ຢືນຢັນລະຫັດຜ່ານໃໝ່',
    passwordMismatchError: 'ລະຫັດຜ່ານໃໝ່ບໍ່ກົງກັນ ກະລຸນາກວດສອບຄືນ',
    passwordSuccessMsg: 'ປ່ຽນລະຫັດຜ່ານສຳເລັດຮຽບຮ້ອຍແລ້ວ!',
    userGovernanceTitle: 'ຈັດການບັນຊີຜູ້ໃຊ້ & ມອບສິດ',
    manageUsersFromProfileBtn: 'ຈັດການຜູ້ໃຊ້ & ມອບສິດໃນລະບົບ',
  },

  en: {
    brandName: 'AVATR AUTO SERVICE',
    subBrand: 'Luxury EV Client Management & Showroom Platform',
    tagline: 'Emotional Luxury & Smart EV Mobility',
    directorTitle: 'Senior EV Executive & Management',
    directorName: 'AVATR Management Team',
    contactDirect: '020 55575537',

    switchDashboard: 'Executive CRM Dashboard',
    switchShowroom: 'Digital Showroom (Client View)',

    navHome: 'Home',
    navAbout: 'About Us',
    navServices: 'Services',
    navPortfolio: 'Portfolio',
    navCatalog: 'Catalog',
    navPricing: 'Pricing',
    navFaq: 'FAQ',
    navContact: 'Contact Us',

    // Sidebar Groups & Items
    groupSalesCRM: 'SALES & CRM',
    groupInventory: 'INVENTORY & STOCK',
    groupFinanceAdmin: 'FINANCE & ADMIN',
    navDashboard: 'Dashboard Overview',
    navPOS: 'Vehicle Sales POS',
    navPOSSub: 'Invoicing & Stock Deduction',
    navCustomers: 'Customers (CRM)',
    navInventory: 'Vehicle Inventory',
    navStockIn: 'Stock-In Entry',
    navStockInSub: 'Receiving & Goods Receipts',
    navAlerts: 'Stock Alerts',
    navBills: 'Bills & Invoices',
    navUsers: 'User Governance',
    navProfile: 'User Profile',
    navCurrencies: 'Currencies & Rates',
    navLogout: 'Sign Out',
    languageLabel: 'Language:',
    badgeSale: 'Sale',
    badgeImport: 'Import',

    // Top Header Titles & Actions
    headerDashboard: 'Dashboard • Executive Overview',
    headerCustomers: 'CRM Customers • Database & Tracking',
    headerInventory: 'AVATR Inventory • Live Stock Management',
    headerStockIn: 'Stock-In Entry • Vehicle Import',
    headerPOS: 'Vehicle Sales POS • Billing & Invoicing',
    headerBills: 'Bills & Invoices • Sales & Receiving Logs',
    headerAlerts: 'Stock Alerts • Low Inventory Warnings',
    headerUsers: 'User Governance • Role Privileges (Admin)',
    headerProfile: 'User Profile • Account Information',
    quickPOSBtn: '+ Sell Car (POS)',
    quickStockInBtn: '+ Stock-In Entry',
    roleSuperAdmin: 'Admin',
    roleBranchAdmin: 'Branch Admin',
    roleSales: 'Sales Specialist',
    roleTechnician: 'PDI & CATL Technician',
    roleGeneralUser: 'General User',
    switchRoleBtn: 'Switch Role',
    supabaseDatabase: 'Supabase Database',
    offlineSync: 'Offline Persistence',
    profileTooltip: 'View User Profile',
    currencyTooltip: 'Select or configure currencies',
    timeframeSelector: 'Timeframe:',
    tfDay: 'Day',
    tfWeek: 'Week',
    tfMonth: 'Month',
    tfYear: 'Year',
    catWalkIn: 'Walk-in Leads',
    catOnline: 'Online Leads',
    catEvent: 'Event Leads',

    totalLeads: 'Total Active Leads',
    testDrivesScheduled: 'Test Drives Scheduled',
    activeServices: 'In-Service Bays / Battery Diagnostic',
    monthlyDeliveries: 'Monthly Deliveries',
    pipelineValue: 'Pipeline Forecast Value',
    conversionRate: 'Sales Conversion SLA',

    tabOverview: 'Executive Overview',
    tabPipeline: 'CRM Pipeline (Kanban)',
    tabTestDrives: 'Test Drive Calendar',
    tabServiceBays: 'avatrAutoService Workshop',
    tabCalculator: 'Financing & Loan Estimator',

    addNewLead: 'Add New Lead',
    bookTestDrive: 'Book Test Drive',
    requestService: 'Schedule Service',
    calculateLoan: 'Calculate Loan',
    viewDetails: 'View Details',
    callNow: 'Direct Call',
    whatsappChat: 'WhatsApp Chat',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    exportQuote: 'Generate Quotation',
    searchPlaceholder: 'Search anything...',
    filterAll: 'All',
    save: 'Save',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error occurred',
    unitCars: 'Vehicles',
    unitBills: 'Invoices',
    unitItems: 'Items',
    unitPeople: 'People',

    statusNew: 'New Inquiry',
    statusContacted: 'Contacted',
    statusTestDrive: 'Test Drive',
    statusNegotiation: 'Negotiation / Quote',
    statusDelivered: 'Delivered / Closed',
    statusLost: 'Cancelled / Inactive',

    // Inventory & Stock
    stockAll: 'All Inventory',
    stockAvailable: 'Ready for Delivery',
    stockReserved: 'Reserved',
    stockSold: 'Delivered (Sold)',
    stockPdiPending: 'PDI Inspection Pending',
    stockPdiPassed: 'PDI Passed',
    tableModel: 'Model',
    tableColor: 'Color / Plate',
    tableVin: 'VIN Number',
    tablePrice: 'Price',
    tableStock: 'Qty',
    tableStatus: 'Status',
    tableActions: 'Actions',
    addVehicle: 'Add New Vehicle',
    importVehicles: 'Import Vehicles',

    // Stock In Form
    stockInTitle: 'Stock-In Entry (New Vehicle Reception)',
    stockInSubtitle: 'Record incoming shipments, generate stock-in receipts and increment warehouse stock automatically',
    supplierName: 'Origin / Supplier Name',
    warehouseDest: 'Destination Warehouse',
    vehicleModelSelect: 'Select Vehicle Model',
    trimSpec: 'Trim & Equipment Package',
    bodyColor: 'Exterior / Body Color',
    vinNumber: 'VIN (17 Digits)',
    engineNumber: 'Motor / Engine Number',
    plateNumber: 'License / Temporary Plate',
    importCostUSD: 'Import Cost (USD)',
    sellingPriceUSD: 'Target Selling Price (USD)',
    quantityUnits: 'Quantity to Import',
    importDate: 'Import Date',
    saveStockInBtn: 'Save Stock-In & Update Inventory',
    printStockInReceipt: 'Print Stock-In Receipt',

    // POS Sales
    posTitle: 'Vehicle Sales POS & Billing',
    posSubtitle: 'Create sales orders, apply discounts, deduct inventory and record transactions instantly',
    selectVehicleToSell: 'Select Available Vehicle in Stock',
    buyerInfo: 'Buyer / Customer Information',
    buyerName: 'Full Name of Buyer *',
    buyerPhone: 'Contact Phone Number *',
    buyerAddress: 'Residential Address / Province',
    buyerIDPassport: 'National ID / Passport Number',
    paymentType: 'Payment Method',
    paymentCash: 'Cash Payment',
    paymentTransfer: 'Bank Transfer (QR / Wire)',
    paymentInstallments: 'Financing / Installments',
    sellingPrice: 'Vehicle Selling Price',
    discountAmount: 'Discount Amount',
    netPaymentTotal: 'Net Total Payable',
    confirmSaleAndDeduct: 'Confirm Sale & Deduct Stock',
    saleCompletedSuccess: 'Sale invoice created and vehicle stock deducted successfully!',
    printInvoiceBtn: 'Print Sales Tax Invoice',

    // Bills Management
    billsTitle: 'All Bills & Invoices Records',
    billsSubtitle: 'Comprehensive archive of POS Sales Invoices and Stock-In Receiving Receipts',
    filterAllBills: 'All Bills',
    filterSaleBills: 'Sales Invoices',
    filterImportBills: 'Stock-In Receipts',
    billNumber: 'Invoice #',
    billDate: 'Date & Time',
    billAmount: 'Total Amount',
    billType: 'Type',
    noBillsFound: 'No invoices or bills found',

    // Alerts
    alertsTitle: 'Inventory Stock Alerts',
    criticalStockAlert: 'Critical Out of Stock',
    warningStockAlert: 'Low Stock Warning',
    outOfStockWarning: 'Vehicle out of stock. Please initiate stock-in replenishment',
    minThreshold: 'Low Threshold Limit',
    recommendedOrder: 'Recommended Reorder Qty',
    updateThresholdBtn: 'Update Alerts',

    // Users & Permissions
    usersTitle: 'User Governance & Role Permissions',
    usersSubtitle: 'Approve team members, grant Super Admin or General User privileges and control system access',
    addUserBtn: '+ Add New Member',
    memberName: 'Member Name',
    memberRole: 'Access Role',
    memberDepartment: 'Department',
    memberStatus: 'Status',
    grantAdminPrivilege: 'Grant Super Admin Access',
    activeStatus: 'Active',
    suspendedStatus: 'Suspended',

    // Profile
    profileTitle: 'User Profile & Settings',
    profileSubtitle: 'Account credentials, role assignment, department and security permission overview',
    accountDetails: 'Account Credentials',
    contactNumber: 'Phone Number',
    securityPermissions: 'Granted Security Privileges',

    // Currencies Modal
    currencyTitle: 'Currencies Setup',
    currencySubtitle: 'Select and manage currencies in the system',
    baseCurrencyUSD: 'Base Currency: US Dollar (USD $)',
    exchangeRateLAK: 'Exchange Rate 1 USD -> Lao Kip (LAK ₭)',
    exchangeRateTHB: 'Exchange Rate 1 USD -> Thai Baht (THB ฿)',
    saveRatesBtn: 'Save Exchange Rates',

    // Auth & Login
    authOnline: 'ONLINE',
    authSystemTitle: 'AVATR AUTO MANAGEMENT SYSTEM',
    authSignInTitle: 'Sign In',
    authSignUpTitle: 'Sign Up',
    authSignInDesc: 'Sign in to AVATR AUTO SERVICE Executive System',
    authSignUpDesc: 'Create a new user account to join the AVATR team',
    authEmailOrPhone: 'Email Address or Phone Number',
    authPassword: 'Password',
    authConfirmPassword: 'Confirm Password',
    authFullName: 'Full Name *',
    authRememberMe: 'Remember Me on this device',
    authNoAccount: "Don't have an account? Sign Up",
    authHaveAccount: 'Already have an account? Sign In',
    authSignInBtn: 'Sign In to Cockpit',
    authSignUpBtn: 'Register & Enter Cockpit',
    authValidEmail: 'Valid Email Format',
    authPasswordMatch: 'Passwords match',
    authPasswordMismatch: 'Passwords do not match',
    authSecurityStrength: 'Password Strength:',
    authMatrixLightsOn: 'Matrix Headlights ON',
    authMatrixLightsOff: 'Headlights OFF',
    authBatterySpec: 'Battery Range',
    authAccelSpec: '0-100 km/h',
    authPowerSpec: 'Peak Power',
    authSafetySpec: 'Safety Grade',

    heroTitle: 'Pure Emotional Luxury Electric Vehicles',
    heroSubtitle: 'Minimal luxury automotive engineering powered by Huawei Qiankun ADS 3.0 and CATL high-voltage battery architecture.',
    bookDriveCTA: 'Schedule VIP Test Drive with AVATR Laos',
    exploreInventory: 'Explore Vehicle Inventory',

    serviceHighlight1Title: 'Authorized CATL High-Voltage Battery Lab',
    serviceHighlight1Desc: 'State of Health (SOH) diagnostic analysis backed by 8-year / 160,000 km battery warranty.',
    serviceHighlight2Title: 'OTA Firmware & HarmonyOS Hub',
    serviceHighlight2Desc: 'Direct over-the-air calibrations for autonomous driving systems and high-res Laos maps.',
    serviceHighlight3Title: '24/7 Premium Roadside Rescue',
    serviceHighlight3Desc: 'Mobile emergency roadside technician fleet serving Vientiane and nationwide corridors.',

    // Dashboard Specific
    dashboardTitle: 'Executive Business Dashboard',
    dashboardSubtitle: 'Monitor Walk-in / Online / Event leads and comprehensive vehicle inventory stages',
    consoleSubtitle: 'AVATR AUTO SERVICE MANAGEMENT CONSOLE',
    kpiTotalLeads: 'Total Active Leads',
    kpiTotalCars: 'Total Inventory Cars',
    kpiRevenueTitle: 'Total Sales Revenue',
    readyForSale: 'Ready for Sale',
    manageCrmAction: 'Manage CRM Pipeline',
    checkStockAction: 'Check Vehicle Inventory',
    viewBillsAction: 'View Invoices',
    customerCategoryTitle: 'Customer Breakdown by Category (Walk in, Online, Event)',
    customerCategorySubtitle: 'Differentiate inbound communication channels for high-converting sales execution',
    viewAllDetails: 'View All Details',
    latestCustomers: 'Latest Leads:',
    ratioLabel: 'Share Ratio:',
    eventsAndPromotionsTitle: 'Event Vehicles & Active Promotions',
    eventsAndPromotionsSubtitle: 'Display vehicles at Motor Expos, roadshows, and exclusive luxury privilege campaigns',
    viewEventStock: 'View Event Stock',
    openPosPromo: 'Open POS Promo Invoice',
    noPromotionsTitle: 'No active campaigns or promotions at the moment',
    noPromotionsDesc: 'You can register campaign vehicles and promotional events directly through Stock-In entry',
    inventoryStagesTitle: 'Warehouse Inventory Flow (Including Events & Promos)',
    inventoryStagesSubtitle: 'Track every vehicle from import arrival, PDI inspection, exhibition to final handover',
    manageAllStock: 'Manage All Inventory',
    stage1Imported: '1. Imported',
    stage1Desc: 'Arrived at Boten border / Dongdok depot awaiting inspection',
    stage2PDI: '2. In PDI Check',
    stage2Desc: '68-point verification: CATL battery, LiDAR & OTA',
    stage3Ready: '3. Ready for Sale',
    stage3Desc: '100% PDI certified, stationed at flagship showroom',
    stage4Reserved: '4. Reserved',
    stage4Desc: 'Deposit placed / sales agreement signed',
    stage5Event: '5. Event Display',
    stage5Desc: 'Featured in Motor Expos & VIP roadshows',
    stage6Promo: '6. Promotion',
    stage6Desc: 'Campaign vehicles with 0% APR financing & gifts',
    noEventCarsNow: 'No vehicles at events currently',
    noPromoCarsNow: 'No promotional vehicles currently',

    // Customer View Specific
    customerViewTitle: 'Customer Relationship Management (CRM)',
    customerViewSubtitle: 'Central database for Walk-in, Online, and Event leads with sales stage tracking',
    assignedOfficer: 'Assigned Officer:',
    inputFormHeader: 'Add New Customer (Input Form)',
    customerTypeLabel: 'Customer Category (3 Types) *',
    customerNameLabel: 'Full Name *',
    customerPhoneLabel: 'Phone Number (Laos Mobile) *',
    customerEmailLabel: 'Email Address',
    interestedModelLabel: 'Interested Vehicle Model *',
    priorityLabel: 'Lead Priority *',
    budgetLabel: 'Estimated Budget',
    notesLabel: 'Notes / Special Requests',
    saveCustomerBtn: 'Save Customer Lead',
    savedCustomerSuccess: 'New customer lead added successfully!',
    filterByStatus: 'Filter by Status:',
    statusAll: 'All Statuses',
    priorityHigh: 'High Priority',
    priorityMedium: 'Medium Priority',
    priorityLow: 'Low Priority',
    createQuoteAction: 'Create Quotation',
    callCustomer: 'Direct Call',
    whatsappCustomer: 'WhatsApp',
    noCustomersFound: 'No customer records match your filter criteria',

    // Inventory View Specific
    inventoryViewTitle: 'Vehicle Inventory & Stock Management',
    inventoryViewSubtitle: 'Manage vehicle inventory, update PDI statuses, configure prices, and review movement history',
    tabStockList: 'Vehicle Inventory Stock',
    tabStockHistory: 'Stock Movement Logs',
    filterAllStatus: 'All Statuses',
    filterAllModels: 'All Models',
    filterAllEventPromo: 'All Categories',
    filterEventOnly: 'Event & Promo Only',
    filterStandardOnly: 'Standard Showroom',
    btnSellCar: 'Sell Vehicle (POS)',
    btnEditPrice: 'Edit Pricing',
    btnDeleteCar: 'Delete Vehicle',
    sellModalTitle: 'Confirm Vehicle Sale & Stock Out',
    sellModalDesc: 'Enter buyer details, select payment method, and automatically deduct vehicle from inventory',
    editModalTitle: 'Edit Vehicle Pricing & Information',
    editModalDesc: 'Update selling price and specifications for this inventory unit',
    vehiclePriceStarting: 'Starting Price',
    pdiStatusLabel: 'PDI Status:',
    pdiPassedLabel: 'PDI Certified',
    pdiPendingLabel: 'PDI Pending',
    pdiFailedLabel: 'PDI Defect',
    historyStockIn: 'Stock-In (Import)',
    historyStockOut: 'Stock-Out (Sale)',
    noInventoryFound: 'No inventory vehicles match the criteria',
    toastSaleSuccess: 'Vehicle sold and inventory deducted successfully!',
    toastUpdateSuccess: 'Vehicle information updated successfully!',
    toastDeleteSuccess: 'Vehicle record deleted from inventory!',

    // Stock In View Specific
    stockInHeader: 'Vehicle Stock-In Entry',
    stockInHeaderSub: 'Register newly arrived vehicles, customs B01 docs, goods receipts, and auto-update stock',
    basicInfoSection: '1. Vehicle Specifications',
    customsSection: '2. Customs & Logistics Declaration',
    pdiSection: '3. Quality Inspection & PDI Certification',
    customsDocNo: 'Customs Declaration B01 / Waybill Number',
    entryPort: 'Port of Entry',
    pdiInspectorLabel: 'PDI Certified Inspector Name',
    pdiNotesLabel: '68-point Inspection Notes',
    notesGeneral: 'General Remarks',
    uploadCarImage: 'Upload Vehicle Photo',
    imageUploadSuccess: 'Vehicle image uploaded successfully!',
    generateRandomVinBtn: 'Generate Standard VIN',
    quickSetDays: 'days',
    eventCampaignName: 'Campaign / Event Name',
    eventStartDateLabel: 'Campaign Start Date',
    eventEndDateLabel: 'Campaign End Date',
    eventLocationLabel: 'Event Venue Location',
    promoDiscountUSDLabel: 'Promotional Discount (USD)',
    promoNotesLabel: 'Complimentary Perks & Terms',

    // POS Sales Specific
    posHeader: 'Vehicle Sales POS & Invoicing',
    posHeaderSub: 'Generate purchase orders/invoices, apply discounts, deduct inventory, and record receipts',
    companyBankTransfer: 'AVATR Corporate Bank Transfer',
    scanQrToPay: 'Scan QR Code for Instant Settlement',
    bankAccountName: 'Account Name:',
    bankAccountNumber: 'Account Number:',
    bankBranch: 'Bank Branch:',
    cashPaymentDesc: 'Full cash payment settlement at showroom cashier',
    installmentLoanDesc: 'Banking partner auto loan installment (BCEL, JDB, LDB)',
    downPaymentLabel: 'Down Payment',
    loanTermMonths: 'Loan Term (Months)',
    monthlyInstallment: 'Estimated Monthly Payment',
    companySealSignature: 'Authorized Signature & Corporate Seal',
    customerSignature: 'Customer / Buyer Signature',
    salesRepresentative: 'Sales Specialist:',
    invoiceThankYou: 'Thank you for choosing AVATR AUTO SERVICE!',

    // Bills Specific
    billsHeader: 'Official Bills & Invoices Archive',
    billsHeaderSub: 'Consolidated sales invoices (POS Invoices) and goods receiving logs (Stock-In Receipts)',
    printBillBtn: 'Print Invoice',
    deleteBillBtn: 'Delete Record',
    confirmDeleteBill: 'Are you sure you want to delete this invoice record?',
    billTotalSalesRevenue: 'Total Sales Revenue:',
    billTotalImportValuation: 'Total Import Valuation:',

    // Stock Alerts Specific
    alertsHeader: 'Stock Inventory Alerts & Restock',
    alertsHeaderSub: 'Monitor out-of-stock and low-stock models to optimize import procurement schedules',
    criticalZeroStock: 'Out of Stock (0 Units)',
    lowStockThreshold: 'Low Stock Warning',
    restockModalTitle: 'Restock Vehicle Inventory',
    restockQuantity: 'Procurement Quantity to Restock:',
    restockBtnConfirm: 'Confirm Restock & Increase Stock',
    toastRestockSuccess: 'Vehicle inventory restocked successfully!',

    // Modals Specific
    modalAddLeadTitle: 'Add New CRM Lead',
    modalAddLeadSub: 'Assigned to: AVATR Sales Specialists',
    modalQuoteTitle: 'Official Luxury Quotation',
    modalServiceTitle: 'Schedule Auto Service',
    modalServiceSub: 'CATL High-Voltage Battery Lab & Vientiane EV Center',
    modalTestDriveTitle: 'Book AVATR VIP Test Drive',
    modalTestDriveSub: 'AVATR Center Lak 3 Thadeua',
    modalVehicleSpecs: 'Technical Specifications',
    modalPrint: 'Print',
    modalClose: 'Close',

    // Theme & Password Change
    themeMode: 'Theme Mode',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    changePasswordBtn: 'Change Password',
    currentPasswordLabel: 'Current Password',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm New Password',
    passwordMismatchError: 'New passwords do not match',
    passwordSuccessMsg: 'Password updated successfully!',
    userGovernanceTitle: 'User Governance & Roles',
    manageUsersFromProfileBtn: 'Manage Users & Permissions',
  },

  th: {
    brandName: 'AVATR AUTO SERVICE',
    subBrand: 'ระบบจัดการลูกค้าและโชว์รูมรถยนต์ไฟฟ้าระดับพรีเมียม',
    tagline: 'Emotional Luxury & Smart EV Mobility',
    directorTitle: 'ฝ่ายบริหาร & ที่ปรึกษาการขาย',
    directorName: 'AVATR Executive Team',
    contactDirect: '020 55575537',

    // View Switcher
    switchDashboard: 'ระบบ Dashboard จัดการลูกค้า',
    switchShowroom: 'โชว์รูมรถ AVATR (Client Portal)',

    // Nav items
    navHome: 'หน้าหลัก (Home)',
    navAbout: 'เกี่ยวกับเรา (About)',
    navServices: 'บริการซ่อมบำรุง (Services)',
    navPortfolio: 'ผลงานการส่งมอบ (Portfolio)',
    navCatalog: 'รุ่นรถทั้งหมด (Catalog)',
    navPricing: 'ราคา & ตารางผ่อน (Pricing)',
    navFaq: 'คำถามที่พบบ่อย (FAQ)',
    navContact: 'ติดต่อเรา (Contact)',

    // Sidebar Groups & Items
    groupSalesCRM: 'งานขาย & ลูกค้า',
    groupInventory: 'คลังสินค้า & สต็อก',
    groupFinanceAdmin: 'การเงิน & บริหาร',
    navDashboard: 'Dashboard (ภาพรวม)',
    navPOS: 'POS ขายรถยนต์',
    navPOSSub: 'ออกบิล & ตัดสต็อก',
    navCustomers: 'ลูกค้า (CRM)',
    navInventory: 'สต็อกรถยนต์ (Stock)',
    navStockIn: 'บันทึกนำเข้ารถ (Stock-In)',
    navStockInSub: 'รับรถ & ออกใบรับ',
    navAlerts: 'แจ้งเตือนสต็อก',
    navBills: 'บันทึกบิล & ใบรับ',
    navUsers: 'อนุมัติ & สิทธิ์สมาชิก',
    navProfile: 'โปรไฟล์ส่วนตัว',
    navCurrencies: 'สกุลเงิน (Currencies)',
    navLogout: 'ออกจากระบบ',
    languageLabel: 'ภาษา:',
    badgeSale: 'ขาย',
    badgeImport: 'นำเข้า',

    // Top Header Titles & Actions
    headerDashboard: 'Dashboard • ภาพรวมระบบ',
    headerCustomers: 'ลูกค้า CRM • ฐานข้อมูล & ติดตามงานขาย',
    headerInventory: 'สต็อกรถ AVATR • คลังสินค้าทั้งหมด',
    headerStockIn: 'บันทึกนำเข้ารถ • Stock-In Entry',
    headerPOS: 'POS ขายรถยนต์ • ออกใบเสร็จ & ตัดสต็อก',
    headerBills: 'บันทึกบิลทั้งหมด • ใบรับ & ใบขาย',
    headerAlerts: 'แจ้งเตือนสต็อก • ใกล้หมด & วางแผนนำเข้า',
    headerUsers: 'ອນຸມັດສະມາຊິກ • ກຳນົດສິດ (Admin)',
    headerProfile: 'โปรไฟล์ผู้ใช้ • ข้อมูลบัญชี',
    quickPOSBtn: '+ ขายรถ (POS)',
    quickStockInBtn: '+ นำเข้ารถยนต์',
    roleSuperAdmin: 'Admin',
    roleBranchAdmin: 'Admin สาขา',
    roleSales: 'ที่ปรึกษาการขาย',
    roleTechnician: 'ช่างตรวจ PDI & CATL',
    roleGeneralUser: 'ผู้ใช้งานทั่วไป',
    switchRoleBtn: 'เปลี่ยนสิทธิ์',
    supabaseDatabase: 'Supabase Database',
    offlineSync: 'Offline Persistence',
    profileTooltip: 'ดูโปรไฟล์ส่วนตัว',
    currencyTooltip: 'เลือกหรือตั้งค่าสกุลเงิน',
    timeframeSelector: 'ช่วงเวลา:',
    tfDay: 'วัน (Day)',
    tfWeek: 'สัปดาห์ (Week)',
    tfMonth: 'เดือน (Month)',
    tfYear: 'ปี (Year)',
    catWalkIn: 'ลูกค้า Walk-in',
    catOnline: 'ลูกค้า Online',
    catEvent: 'ลูกค้า Event',

    // Dashboard Stats
    totalLeads: 'ลูกค้าเป้าหมายทั้งหมด',
    testDrivesScheduled: 'นัดหมายทดลองขับ',
    activeServices: 'กำลังซ่อมบำรุง / ตรวจแบตเตอรี่',
    monthlyDeliveries: 'ยอดส่งมอบรถเดือนนี้',
    pipelineValue: 'มูลค่างานขายใน Pipeline',
    conversionRate: 'อัตราการปิดการขาย',

    // Dashboard Tabs
    tabOverview: 'ภาพรวมระบบ',
    tabPipeline: 'จัดการลูกค้า (CRM Pipeline)',
    tabTestDrives: 'ตารางทดลองขับ',
    tabServiceBays: 'ศูนย์บริการ avatrAutoService',
    tabCalculator: 'คำนวณเงินดาวน์ & ค่างวด',

    // Actions & Common
    addNewLead: 'เพิ่มลูกค้าใหม่',
    bookTestDrive: 'จองทดลองขับ',
    requestService: 'นัดหมายซ่อมบำรุง',
    calculateLoan: 'คำนวณสินเชื่อ',
    viewDetails: 'ดูรายละเอียด',
    callNow: 'โทรด่วน',
    whatsappChat: 'แชท WhatsApp',
    saveChanges: 'บันทึกข้อมูล',
    cancel: 'ยกเลิก',
    exportQuote: 'พิมพ์ใบเสนอราคา (PDF/Print)',
    searchPlaceholder: 'ค้นหา...',
    filterAll: 'ทั้งหมด',
    save: 'บันทึก',
    confirm: 'ยืนยัน',
    delete: 'ลบ',
    edit: 'แก้ไข',
    close: 'ปิด',
    loading: 'กำลังโหลด...',
    success: 'สำเร็จ',
    error: 'เกิดข้อผิดพลาด',
    unitCars: 'คัน',
    unitBills: 'ฉบับ',
    unitItems: 'รายการ',
    unitPeople: 'คน',

    // Statuses
    statusNew: 'สอบถามใหม่',
    statusContacted: 'ติดต่อแล้ว',
    statusTestDrive: 'นัดทดลองขับ',
    statusNegotiation: 'เจรจา / เสนอราคา',
    statusDelivered: 'ส่งมอบสำเร็จ',
    statusLost: 'ยกเลิก / พลาดโอกาส',

    // Inventory & Stock
    stockAll: 'สต็อกทั้งหมด',
    stockAvailable: 'พร้อมส่งมอบ / พร้อมขาย',
    stockReserved: 'จองแล้ว',
    stockSold: 'ส่งมอบแล้ว (Sold)',
    stockPdiPending: 'รอ PDI ตรวจเช็ค',
    stockPdiPassed: 'ผ่าน PDI แล้ว',
    tableModel: 'รุ่นรถ',
    tableColor: 'สี / ทะเบียน',
    tableVin: 'เลขตัวถัง (VIN)',
    tablePrice: 'ราคา',
    tableStock: 'จำนวน',
    tableStatus: 'สถานะ',
    tableActions: 'จัดการ',
    addVehicle: 'เพิ่มรถใหม่',
    importVehicles: 'นำเข้ารถยนต์',

    // Stock In Form
    stockInTitle: 'บันทึกนำเข้ารถ (Stock-In Entry)',
    stockInSubtitle: 'บันทึกการรับรถใหม่เข้าคลัง ออกใบรับ Stock-In และเพิ่มสต็อกอัตโนมัติ',
    supplierName: 'แหล่งที่มา / ผู้จัดจำหน่าย (Supplier)',
    warehouseDest: 'คลังสินค้าปลายทาง (Destination Warehouse)',
    vehicleModelSelect: 'เลือกรุ่นรถยนต์ (Vehicle Model)',
    trimSpec: 'รุ่นย่อย / ออปชัน (Trim & Options)',
    bodyColor: 'สีตัวถัง (Body Color)',
    vinNumber: 'เลขตัวถัง (VIN 17 หลัก)',
    engineNumber: 'เลขมอเตอร์ไฟฟ้า (Motor No)',
    plateNumber: 'หมายเลขทะเบียน / ป้ายชั่วคราว',
    importCostUSD: 'ต้นทุนนำเข้า (Cost USD)',
    sellingPriceUSD: 'ราคาขายตั้งไว้ (Selling Price USD)',
    quantityUnits: 'จำนวนรถที่นำเข้า (Quantity)',
    importDate: 'วันที่นำเข้า',
    saveStockInBtn: 'บันทึกการนำเข้า & เพิ่มสต็อก',
    printStockInReceipt: 'พิมพ์ใบรับสินค้า (Stock-In Receipt)',

    // POS Sales
    posTitle: 'POS ขายรถยนต์ & ออกใบเสร็จ (Sales Billing)',
    posSubtitle: 'ระบบออกใบสั่งซื้อ/ใบขายรถ คำนวณส่วนลด ตัดสต็อก และบันทึกรายรับทันที',
    selectVehicleToSell: 'เลือกรถในสต็อกที่จะขาย',
    buyerInfo: 'ข้อมูลผู้ซื้อ / ลูกค้า',
    buyerName: 'ชื่อ และ นามสกุล ลูกค้า *',
    buyerPhone: 'เบอร์โทรศัพท์ติดต่อ *',
    buyerAddress: 'ที่อยู่ / บ้าน, เมือง, แขวง/จังหวัด',
    buyerIDPassport: 'เลขบัตรประชาชน / Passport',
    paymentType: 'รูปแบบการชำระเงิน',
    paymentCash: 'เงินสด (Cash)',
    paymentTransfer: 'โอนเงินผ่านธนาคาร (Bank Transfer)',
    paymentInstallments: 'ผ่อนชำระ / สินเชื่อ (Installments)',
    sellingPrice: 'ราคาขายรถยนต์',
    discountAmount: 'ส่วนลด (Discount)',
    netPaymentTotal: 'ยอดเงินสุทธิที่ต้องชำระ (Net Total)',
    confirmSaleAndDeduct: 'ยืนยันการขาย & ตัดสต็อกรถยนต์',
    saleCompletedSuccess: 'ออกใบเสร็จขายรถและตัดสต็อกสำเร็จเรียบร้อย!',
    printInvoiceBtn: 'พิมพ์ใบเสร็จรับเงิน / ใบขาย (Tax Invoice)',

    // Bills Management
    billsTitle: 'บันทึกบิลและใบรับทั้งหมด (Bills & Invoices)',
    billsSubtitle: 'รวมประวัติใบขายรถ (POS Invoices) และใบบันทึกนำเข้ารถ (Stock-In Receipts)',
    filterAllBills: 'บิลทั้งหมด',
    filterSaleBills: 'ใบขายรถยนต์ (Sales)',
    filterImportBills: 'ใบรับนำเข้า (Stock-In)',
    billNumber: 'เลขที่เอกสาร / บิล',
    billDate: 'วันที่ / เวลา',
    billAmount: 'มูลค่ารวม',
    billType: 'ประเภทบิล',
    noBillsFound: 'ไม่พบรายการบิล',

    // Alerts
    alertsTitle: 'แจ้งเตือนสต็อกรถยนต์ (Stock Inventory Alerts)',
    criticalStockAlert: 'สินค้าหมดสต็อก (Critical Out of Stock)',
    warningStockAlert: 'สต็อกใกล้หมด (Low Stock Warning)',
    outOfStockWarning: 'หมดสต็อกแล้ว กรุณาวางแผนสั่งนำเข้าเพิ่มเติม',
    minThreshold: 'เกณฑ์แจ้งเตือนขั้นต่ำ',
    recommendedOrder: 'จำนวนที่แนะนำให้นำเข้า',
    updateThresholdBtn: 'ปรับค่าการแจ้งเตือน',

    // Users & Permissions
    usersTitle: 'จัดการผู้ใช้และสิทธิ์การเข้าถึง (User Management & Roles)',
    usersSubtitle: 'อนุมัติสมาชิกทีม กำหนดสิทธิ์ Super Admin หรือผู้ใช้ทั่วไป และควบคุมระบบ',
    addUserBtn: '+ เพิ่มสมาชิกใหม่',
    memberName: 'ชื่อสมาชิก',
    memberRole: 'สิทธิ์การใช้งาน',
    memberDepartment: 'แผนก / ฝ่าย',
    memberStatus: 'สถานะ',
    grantAdminPrivilege: 'มอบสิทธิ์ Super Admin',
    activeStatus: 'กำลังใช้งาน (Active)',
    suspendedStatus: 'ระงับชั่วคราว (Suspended)',

    // Profile
    profileTitle: 'โปรไฟล์ผู้ใช้งาน (User Profile)',
    profileSubtitle: 'ข้อมูลบัญชี ตำแหน่ง แผนก และสิทธิ์การเข้าถึงระบบ',
    accountDetails: 'ข้อมูลบัญชี',
    contactNumber: 'เบอร์โทรศัพท์',
    securityPermissions: 'สิทธิ์ความปลอดภัยที่ได้รับ',

    // Currencies Modal
    currencyTitle: 'ຕັ້ງຄ່າສະກຸນເງິນ (Currencies)',
    currencySubtitle: 'ເລືອກ ແລະ ຈັດການສະກຸນເງິນໃນລະບົບ',
    baseCurrencyUSD: 'สกุลเงินหลัก: ดอลลาร์สหรัฐ (USD $)',
    exchangeRateLAK: 'อัตราแลกเปลี่ยน 1 USD -> กีบ (LAK ₭)',
    exchangeRateTHB: 'อัตราแลกเปลี่ยน 1 USD -> บาท (THB ฿)',
    saveRatesBtn: 'บันทึกอัตราแลกเปลี่ยน',

    // Auth & Login
    authOnline: 'ONLINE',
    authSystemTitle: 'ระบบจัดการ AVATR AUTO',
    authSignInTitle: 'เข้าสู่ระบบ (Sign In)',
    authSignUpTitle: 'สร้างบัญชีใหม่ (Sign Up)',
    authSignInDesc: 'เข้าสู่ระบบจัดการ AVATR AUTO SERVICE',
    authSignUpDesc: 'สร้างบัญชีผู้ใช้ใหม่เพื่อเข้าร่วมทีมงาน AVATR',
    authEmailOrPhone: 'อีเมล หรือ เบอร์โทรศัพท์ (Email / Phone)',
    authPassword: 'รหัสผ่าน (Password)',
    authConfirmPassword: 'ยืนยันรหัสผ่าน (Confirm Password)',
    authFullName: 'ชื่อ และ นามสกุล (Full Name) *',
    authRememberMe: 'จดจำการเข้าสู่ระบบ (Remember Me)',
    authNoAccount: 'ยังไม่มีบัญชี? สร้างบัญชีใหม่',
    authHaveAccount: 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ',
    authSignInBtn: 'เข้าสู่ระบบ (Sign In)',
    authSignUpBtn: 'สร้างบัญชี และ เข้าสู่ระบบ (Register & Enter)',
    authValidEmail: 'รูปแบบอีเมลถูกต้อง',
    authPasswordMatch: 'รหัสผ่านตรงกัน',
    authPasswordMismatch: 'รหัสผ่านไม่ตรงกัน',
    authSecurityStrength: 'ความปลอดภัย:',
    authMatrixLightsOn: 'ไฟหน้า Matrix ON',
    authMatrixLightsOff: 'ไฟหน้า OFF',
    authBatterySpec: 'แบตเตอรี่',
    authAccelSpec: 'อัตราเร่ง',
    authPowerSpec: 'กำลังขับ',
    authSafetySpec: 'ความปลอดภัย',

    // Showroom Copy
    heroTitle: 'อนาคตแห่งยนตรกรรมไฟฟ้าระดับพรีเมียม',
    heroSubtitle: 'สัมผัสประสบการณ์ขับขี่ Minimal Luxury ระดับ Flagship พร้อมระบบอัจฉริยะ Huawei ADS 3.0 และแบตเตอรี่ CATL',
    bookDriveCTA: 'นัดหมายทดลองขับ (Book Test Drive)',
    exploreInventory: 'ชมรถยนต์พร้อมส่งมอบ',

    // Service highlights
    serviceHighlight1Title: 'ศูนย์วิเคราะห์แบตเตอรี่ CATL มาตรฐานระดับสากล',
    serviceHighlight1Desc: 'ตรวจวัดค่า State of Health (SOH) ด้วยซอฟต์แวร์เฉพาะ พร้อมรับประกัน 8 ปี 160,000 กม.',
    serviceHighlight2Title: 'อัปเกรด OTA & HarmonyOS Cockpit',
    serviceHighlight2Desc: 'บริการอัปเดตระบบช่วยขับอัตโนมัติ Huawei Qiankun ADS และระบบแผนที่นำทาง',
    serviceHighlight3Title: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง',
    serviceHighlight3Desc: 'รถช่วยเหลือฉุกเฉิน Mobile Service พร้อมทีมช่างผู้เชี่ยวชาญพร้อมดูแลตลอด 24 ชม.',

    // Dashboard Specific
    dashboardTitle: 'Dashboard ภาพรวมธุรกิจ',
    dashboardSubtitle: 'ติดตามลูกค้า Walk-in / Online / Event และสถานะสต็อกรถยนต์ในคลังทุกขั้นตอน',
    consoleSubtitle: 'AVATR AUTO SERVICE MANAGEMENT CONSOLE',
    kpiTotalLeads: 'ลูกค้าทั้งหมด',
    kpiTotalCars: 'รถยนต์ในคลังทั้งหมด',
    kpiRevenueTitle: 'ยอดมูลค่าขาย',
    readyForSale: 'พร้อมขาย',
    manageCrmAction: 'จัดการข้อมูลลูกค้า CRM',
    checkStockAction: 'ตรวจเช็คสต็อกรถยนต์',
    viewBillsAction: 'บันทึกบิล',
    customerCategoryTitle: 'แสดงลูกค้าแบ่งตามหมวด (Walk in, Online, Event)',
    customerCategorySubtitle: 'แยกช่องทางที่ลูกค้าติดต่อเข้ามา เพื่อติดตามงานขายได้อย่างมีประสิทธิภาพ',
    viewAllDetails: 'ดูรายละเอียดทั้งหมด',
    latestCustomers: 'ลูกค้าล่าสุด:',
    ratioLabel: 'สัดส่วน:',
    eventsAndPromotionsTitle: 'สินค้า Event และ โปรโมชั่นพิเศษ (Promotions & Events)',
    eventsAndPromotionsSubtitle: 'รถที่นำไปจัดแสดงในงาน Event, Roadshow และแคมเปญของแถมพิเศษล่าสุด',
    viewEventStock: 'ดูสต็อกรถ Event',
    openPosPromo: 'เปิดบิลขาย POS โปรโมชั่น',
    noPromotionsTitle: 'ยังไม่มีแคมเปญหรือโปรโมชั่นพิเศษในขณะนี้',
    noPromotionsDesc: 'คุณสามารถเพิ่มรถแคมเปญ งาน Event และโปรโมชั่นจริงผ่านระบบนำเข้าสต็อก (Stock-In)',
    inventoryStagesTitle: 'สถานะคลังรถยนต์ (รวมรถ Event & โปรโมชั่น)',
    inventoryStagesSubtitle: 'ติดตามรถทุกคัน ตั้งแต่นำเข้า, PDI, จัดแสดงในงาน Event จนถึงส่งมอบลูกค้า',
    manageAllStock: 'จัดการคลังสินค้าทั้งหมด',
    stage1Imported: '1. นำเข้า',
    stage1Desc: 'มาถึงด่านบ่อเต็น / คลังดงโดก รอเตรียมตรวจสภาพ',
    stage2PDI: '2. กำลัง PDI',
    stage2Desc: 'ตรวจสอบ 68 จุด: แบตเตอรี่ CATL, LiDAR, OTA',
    stage3Ready: '3. พร้อมขาย',
    stage3Desc: 'PDI ผ่าน 100%, จอดพร้อมจำหน่ายที่โชว์รูมใหญ่',
    stage4Reserved: '4. จองแล้ว',
    stage4Desc: 'ลูกค้าวางเงินมัดจำ/เซ็นสัญญาแล้ว',
    stage5Event: '5. งาน Event',
    stage5Desc: 'จัดแสดงในงาน Motor Expo & Roadshow',
    stage6Promo: '6. โปรโมชั่น',
    stage6Desc: 'รถแคมเปญพิเศษ ดอกเบี้ย 0% & ของแถมพิเศษ',
    noEventCarsNow: 'ไม่มีรถในงาน Event ในขณะนี้',
    noPromoCarsNow: 'ไม่มีรถโปรโมชั่นในขณะนี้',

    // Customer View Specific
    customerViewTitle: 'ระบบจัดการลูกค้า (Customers CRM)',
    customerViewSubtitle: 'ฐานข้อมูลลูกค้า Walk-in, Online และ Event พร้อมการติดตามสถานะการขายอย่างเป็นระบบ',
    assignedOfficer: 'ผู้รับผิดชอบ:',
    inputFormHeader: 'เพิ่มข้อมูลลูกค้าใหม่ (Input Form)',
    customerTypeLabel: 'ประเภทลูกค้า (3 หมวด) *',
    customerNameLabel: 'ชื่อ และ นามสกุล *',
    customerPhoneLabel: 'เบอร์โทรศัพท์ติดต่อ *',
    customerEmailLabel: 'อีเมล (Email)',
    interestedModelLabel: 'รุ่นรถที่สนใจ *',
    priorityLabel: 'ระดับความสำคัญ *',
    budgetLabel: 'งบประมาณโดยประมาณ',
    notesLabel: 'หมายเหตุ / ความต้องการเพิ่มเติม',
    saveCustomerBtn: 'บันทึกข้อมูลลูกค้า',
    savedCustomerSuccess: 'บันทึกลูกค้าใหม่เข้าสู่ระบบเรียบร้อยแล้ว!',
    filterByStatus: 'กรองสถานะ:',
    statusAll: 'ทั้งหมด',
    priorityHigh: 'สูง (High)',
    priorityMedium: 'ปานกลาง (Medium)',
    priorityLow: 'ทั่วไป (Low)',
    createQuoteAction: 'ออกใบเสนอราคา',
    callCustomer: 'โทรหาลูกค้า',
    whatsappCustomer: 'WhatsApp',
    noCustomersFound: 'ไม่พบข้อมูลลูกค้าที่ตรงกับเงื่อนไข',

    // Inventory View Specific
    inventoryViewTitle: 'คลังสินค้า & สต็อกรถยนต์ (Inventory)',
    inventoryViewSubtitle: 'จัดการรถทั้งหมด อัปเดตสถานะ PDI กำหนดราคา และประวัติความเคลื่อนไหวสต็อก',
    tabStockList: 'รายการสต็อกรถยนต์ (Inventory Stock)',
    tabStockHistory: 'ประวัติการเคลื่อนไหวสต็อก (Stock Movement Logs)',
    filterAllStatus: 'สถานะทั้งหมด',
    filterAllModels: 'รุ่นรถทั้งหมด',
    filterAllEventPromo: 'ทุกรูปแบบ',
    filterEventOnly: 'เฉพาะรถ Event & โปรโมชั่น',
    filterStandardOnly: 'รถมาตรฐานโชว์รูม',
    btnSellCar: 'ขายรถ (POS)',
    btnEditPrice: 'แก้ไขราคา',
    btnDeleteCar: 'ลบรถ',
    sellModalTitle: 'ยืนยันการขายรถยนต์ออกจากสต็อก',
    sellModalDesc: 'บันทึกข้อมูลผู้ซื้อ เลือกรูปแบบการชำระเงิน และตัดสต็อกอัตโนมัติ',
    editModalTitle: 'แก้ไขราคา และ ข้อมูลรถยนต์',
    editModalDesc: 'ปรับเปลี่ยนราคาจำหน่ายและรายละเอียดของรถคันนี้',
    vehiclePriceStarting: 'ราคาเริ่มต้น',
    pdiStatusLabel: 'สถานะ PDI:',
    pdiPassedLabel: 'ผ่าน PDI แล้ว',
    pdiPendingLabel: 'รอ PDI',
    pdiFailedLabel: 'ไม่ผ่าน PDI',
    historyStockIn: 'นำเข้า (Stock-In)',
    historyStockOut: 'จำหน่ายออก (Stock-Out)',
    noInventoryFound: 'ไม่พบรถในคลังที่ตรงกับเงื่อนไข',
    toastSaleSuccess: 'จำหน่ายรถและตัดสต็อกสำเร็จเรียบร้อย!',
    toastUpdateSuccess: 'อัปเดตข้อมูลรถยนต์สำเร็จ!',
    toastDeleteSuccess: 'ลบรายการรถยนต์ออกจากสต็อกแล้ว!',

    // Stock In View Specific
    stockInHeader: 'บันทึกนำเข้ารถ (Stock-In Entry)',
    stockInHeaderSub: 'บันทึกการรับรถใหม่เข้าคลัง ข้อมูลด่านศุลกากร B01 ใบรับสินค้า และเพิ่มสต็อกอัตโนมัติ',
    basicInfoSection: '1. ข้อมูลรถยนต์พื้นฐาน (Vehicle Specifications)',
    customsSection: '2. ข้อมูลด่านศุลกากรและการขนส่ง (Customs & Logistics)',
    pdiSection: '3. การตรวจสอบคุณภาพ PDI (Quality Inspection)',
    customsDocNo: 'เลขที่เอกสารสำแดงศุลกากร B01 / ใบขนส่ง',
    entryPort: 'ด่านนำเข้า (Port of Entry)',
    pdiInspectorLabel: 'ช่างผู้ตรวจสอบ PDI / ผู้ตรวจเช็ค',
    pdiNotesLabel: 'ผลการตรวจเช็ค 68 จุด / หมายเหตุ PDI',
    notesGeneral: 'หมายเหตุทั่วไป',
    uploadCarImage: 'อัปโหลดรูปภาพรถยนต์',
    imageUploadSuccess: 'อัปโหลดรูปภาพรถจากอุปกรณ์สำเร็จ!',
    generateRandomVinBtn: 'สุ่มสร้าง VIN อัตโนมัติ',
    quickSetDays: 'วัน',
    eventCampaignName: 'ชื่อแคมเปญ / งาน Event',
    eventStartDateLabel: 'วันที่เริ่มงาน / โปรโมชั่น',
    eventEndDateLabel: 'วันที่สิ้นสุดงาน / โปรโมชั่น',
    eventLocationLabel: 'สถานที่จัดงาน Event',
    promoDiscountUSDLabel: 'มูลค่าส่วนลดโปรโมชั่น (USD)',
    promoNotesLabel: 'รายละเอียดของแถมและเงื่อนไข',

    // POS Sales Specific
    posHeader: 'POS ขายรถยนต์ & ออกใบเสร็จ (Sales Billing)',
    posHeaderSub: 'ระบบออกใบสั่งซื้อ/ใบขายรถ คำนวณส่วนลด ตัดสต็อก และบันทึกรายรับทันที',
    companyBankTransfer: 'โอนเงินผ่านบัญชีบริษัท AVATR',
    scanQrToPay: 'สแกน QR Code เพื่อชำระเงิน',
    bankAccountName: 'ชื่อบัญชี:',
    bankAccountNumber: 'เลขที่บัญชี:',
    bankBranch: 'สาขา:',
    cashPaymentDesc: 'ชำระด้วยเงินสดเต็มจำนวนที่โชว์รูม',
    installmentLoanDesc: 'ผ่อนชำระผ่านธนาคารพันธมิตร (BCEL, JDB, LDB)',
    downPaymentLabel: 'เงินดาวน์ (Down Payment)',
    loanTermMonths: 'ระยะเวลาผ่อนชำระ (เดือน)',
    monthlyInstallment: 'ค่างวดประมาณการต่อเดือน',
    companySealSignature: 'ลายเซ็นและตราประทับบริษัท',
    customerSignature: 'ลายเซ็นลูกค้า / ผู้ซื้อ',
    salesRepresentative: 'ที่ปรึกษาการขาย:',
    invoiceThankYou: 'ขอบพระคุณที่ไว้วางใจเลือกใช้บริการ AVATR AUTO SERVICE!',

    // Bills Specific
    billsHeader: 'บันทึกบิลและเอกสารทั้งหมด (Bills & Invoices)',
    billsHeaderSub: 'รวมประวัติใบเสร็จรับเงินขายรถ (POS Invoices) และใบรับนำเข้ารถ (Stock-In Receipts)',
    printBillBtn: 'สั่งพิมพ์บิล',
    deleteBillBtn: 'ลบบิล',
    confirmDeleteBill: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการบิลนี้?',
    billTotalSalesRevenue: 'มูลค่าขายรวม:',
    billTotalImportValuation: 'มูลค่านำเข้ารวม:',

    // Stock Alerts Specific
    alertsHeader: 'แจ้งเตือนสต็อกรถยนต์ (Stock Inventory Alerts)',
    alertsHeaderSub: 'ตรวจสอบรถที่หมดสต็อกหรือใกล้หมด เพื่อวางแผนการนำเข้าให้ทันเวลา',
    criticalZeroStock: 'หมดสต็อก (0 คัน)',
    lowStockThreshold: 'ใกล้หมด (ต่ำกว่าเกณฑ์)',
    restockModalTitle: 'เพิ่มสต็อกรถยนต์ (Restock Entry)',
    restockQuantity: 'จำนวนที่ต้องการนำเข้าเพิ่ม:',
    restockBtnConfirm: 'ยืนยันการเพิ่มสต็อก',
    toastRestockSuccess: 'เพิ่มสต็อกรถยนต์สำเร็จเรียบร้อยแล้ว!',

    // Modals Specific
    modalAddLeadTitle: 'เพิ่มลูกค้าใหม่เข้าสู่ระบบ CRM',
    modalAddLeadSub: 'มอบหมายให้: ทีมงานฝ่ายขาย AVATR',
    modalQuoteTitle: 'ใบเสนอราคาอย่างเป็นทางการ (Official Luxury Quotation)',
    modalServiceTitle: 'นัดหมายซ่อมบำรุง avatrAutoService',
    modalServiceSub: 'ศูนย์บริการแบตเตอรี่ CATL & ระบบไฟฟ้าเวียงจันทน์',
    modalTestDriveTitle: 'นัดหมายทดลองขับ AVATR',
    modalTestDriveSub: 'ศูนย์บริการ AVATR หลัก 3 ท่าเดื่อ',
    modalVehicleSpecs: 'ข้อมูลเฉพาะทางเทคนิค',
    modalPrint: 'สั่งพิมพ์',
    modalClose: 'ปิด',

    // Theme & Password Change
    themeMode: 'โหมดการแสดงผล',
    darkMode: 'โหมดมืด (Dark)',
    lightMode: 'โหมดสว่าง (Light)',
    changePasswordBtn: 'เปลี่ยนรหัสผ่าน',
    currentPasswordLabel: 'รหัสผ่านปัจจุบัน',
    newPasswordLabel: 'รหัสผ่านใหม่',
    confirmPasswordLabel: 'ยืนยันรหัสผ่านใหม่',
    passwordMismatchError: 'รหัสผ่านใหม่ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง',
    passwordSuccessMsg: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว!',
    userGovernanceTitle: 'จัดการบัญชีผู้ใช้ & สิทธิ์การใช้งาน',
    manageUsersFromProfileBtn: 'จัดการผู้ใช้ & สิทธิ์สมาชิก',
  },
};
