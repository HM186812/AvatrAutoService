// =============================================================
// LAO PDR ADMINISTRATIVE DIVISIONS (18 PROVINCES & DISTRICTS)
// ຖານຂໍ້ມູນແຂວງ, ເມືອງ ແລະ ບ້ານ ຄົບຖ້ວນທົ່ວປະເທດລາວ
// =============================================================

export interface LaoDistrict {
  nameLo: string;
  nameEn: string;
  popularVillages: string[];
}

export interface LaoProvince {
  id: string;
  nameLo: string;
  nameEn: string;
  districts: LaoDistrict[];
}

export const LAO_PROVINCES: LaoProvince[] = [
  {
    id: 'vte_cap',
    nameLo: 'ນະຄອນຫຼວງວຽງຈັນ',
    nameEn: 'Vientiane Capital',
    districts: [
      {
        nameLo: 'ເມືອງ ຈັນທະບູລີ',
        nameEn: 'Chanthabuly',
        popularVillages: ['ບ້ານ ສີຫອມ', 'ບ້ານ ອານຸ', 'ບ້ານ ດົງໝ້ຽງ', 'ບ້ານ ທົ່ງຂັນຄຳ', 'ບ້ານ ຫົວຂົວ', 'ບ້ານ ໂພນຕ້ອງສະຫວາດ'],
      },
      {
        nameLo: 'ເມືອງ ສີໂຄດຕະບອງ',
        nameEn: 'Sikhottabong',
        popularVillages: ['ບ້ານ ສີໄຄ', 'ບ້ານ ວັດໄຕໃຫຍ່', 'ບ້ານ ໜອງແຕ່ງ', 'ບ້ານ ໜອງໜ້ຽວ', 'ບ້ານ ໂນນແກ້ວ', 'ບ້ານ ຫຼັກ 5'],
      },
      {
        nameLo: 'ເມືອງ ໄຊເສດຖາ',
        nameEn: 'Xaysettha',
        popularVillages: ['ບ້ານ ໂພນໄຊ', 'ບ້ານ ໜອງບອນ', 'ບ້ານ ໂພນພະເນົາ', 'ບ້ານ ທາດຫຼວງ', 'ບ້ານ ໂນນສະຫວ່າງ', 'ບéານ ໜອງໄຮ'],
      },
      {
        nameLo: 'ເມືອງ ສີສັດຕະນາກ',
        nameEn: 'Sisattanak',
        popularVillages: ['ບ້ານ ທ່າເດື່ອ ຫຼັກ 3', 'ບ້ານ ດົງປາລານ', 'ບ້ານ ບຶງຂະຫຍອງ', 'ບ້ານ ໂພນສະຫວັນ', 'ບ້ານ ວັດນາກ', 'ບ້ານ ສົກປ່າຫຼວງ'],
      },
      {
        nameLo: 'ເມືອງ ນາຊາຍທອງ',
        nameEn: 'Naxaithong',
        popularVillages: ['ບ້ານ ນາຊາຍທອງເໜືອ', 'ບ້ານ ນາຊາຍທອງໃຕ້', 'ບ້ານ ຫົວຂົວ', 'ບ້ານ ຊຽງຄວນ'],
      },
      {
        nameLo: 'ເມືອງ ໄຊທານີ',
        nameEn: 'Xaythany',
        popularVillages: ['ບ້ານ ດົງໂດກ', 'ບ້ານ ຕານມີໄຊ', 'ບ້ານ ໂຄກສະອາດ', 'ບ້ານ ໄຊ', 'ບ້ານ ໄຮຄຳ', 'ບ້ານ ດົງໝາກຄາຍ'],
      },
      {
        nameLo: 'ເມືອງ ຫາດຊາຍຟອງ',
        nameEn: 'Hadxayfong',
        popularVillages: ['ບ້ານ ດົງຄຳຊ້າງ', 'ບ້ານ ທ່ານາແລ້ງ', 'ບ້ານ ໜອງແຫ້ວ', 'ບ້ານ ຫາດຊາຍຂາວ', 'ບ້ານ ປາກຖາງ'],
      },
      {
        nameLo: 'ເມືອງ ສັງທອງ',
        nameEn: 'Sangthong',
        popularVillages: ['ບ້ານ ເພຍລາດ', 'ບ້ານ ຫີນສິ່ວ', 'ບ້ານ ປາກຕອນ'],
      },
      {
        nameLo: 'ເມືອງ ປາກງື່ມ',
        nameEn: 'Pakngum',
        popularVillages: ['ບ້ານ ປາກງື່ມ', 'ບ້ານ ທ່າກົກໄຮ', 'ບ້ານ ດອນແຍງ'],
      },
    ],
  },
  {
    id: 'lpq',
    nameLo: 'ແຂວງ ຫຼວງພະບາງ',
    nameEn: 'Luang Prabang',
    districts: [
      { nameLo: 'ເມືອງ ຫຼວງພະບາງ', nameEn: 'Luang Prabang', popularVillages: ['ບ້ານ ຊຽງທອງ', 'ບ້ານ ປ່າຂາມ', 'ບ້ານ ພູວາວ'] },
      { nameLo: 'ເມືອງ ຊຽງເງິນ', nameEn: 'Xiengngeun', popularVillages: ['ບ້ານ ຊຽງເງິນ', 'ບ້ານ ນ້ຳຄານ'] },
      { nameLo: 'ເມືອງ ນານ', nameEn: 'Nan', popularVillages: ['ບ້ານ ນານເໜືອ', 'ບ້ານ ນານໃຕ້'] },
      { nameLo: 'ເມືອງ ປາກອູ', nameEn: 'Pak Ou', popularVillages: ['ບ້ານ ປາກອູ', 'ບ້ານ ຖ້ຳຕິ່ງ'] },
      { nameLo: 'ເມືອງ ນ້ຳບາກ', nameEn: 'Nambak', popularVillages: ['ບ້ານ ນ້ຳບາກ', 'ບ້ານ ໜອງຂຽວ'] },
      { nameLo: 'ເມືອງ ງອຍ', nameEn: 'Ngoy', popularVillages: ['ບ້ານ ເມືອງງອຍເກົ່າ', 'ບ້ານ ຫາດສາ'] },
      { nameLo: 'ເມືອງ ປາກແຊງ', nameEn: 'Pakxeng', popularVillages: ['ບ້ານ ປາກແຊງ', 'ບ້ານ ໂພນໄຊ'] },
      { nameLo: 'ເມືອງ ໂພນໄຊ', nameEn: 'Phonxay', popularVillages: ['ບ້ານ ໂພນໄຊ', 'ບ້ານ ສົບແຈມ'] },
      { nameLo: 'ເມືອງ ຈອມເພັດ', nameEn: 'Chomphet', popularVillages: ['ບ້ານ ຈອມເພັດ', 'ບ້ານ ຊຽງແມນ'] },
      { nameLo: 'ເມືອງ ວຽງຄຳ', nameEn: 'Viengkham', popularVillages: ['ບ້ານ ວຽງຄຳ', 'ບ້ານ ໂພນທອງ'] },
      { nameLo: 'ເມືອງ ພູຄູນ', nameEn: 'Phoukhoun', popularVillages: ['ບ້ານ ສາມແຍກພູຄູນ', 'ບ້ານ ນ້ຳອຸ່ນ'] },
      { nameLo: 'ເມືອງ ໂພນທອງ', nameEn: 'Phonthong', popularVillages: ['ບ້ານ ໂພນທອງ', 'ບ້ານ ນາໝໍ້'] },
    ],
  },
  {
    id: 'cps',
    nameLo: 'ແຂວງ ຈຳປາສັກ',
    nameEn: 'Champasak',
    districts: [
      { nameLo: 'ເມືອງ ປາກເຊ', nameEn: 'Pakse', popularVillages: ['ບ້ານ ໂພນສະຫວັນ', 'ບ້ານ ປາກເຊໃຫຍ່', 'ບ້ານ ສະໜາມໄຊ', 'ບ້ານ ດົງຈອງ'] },
      { nameLo: 'ເມືອງ ຊະນະສົມບູນ', nameEn: 'Sanasomboun', popularVillages: ['ບ້ານ ຊະນະສົມບູນ', 'ບ້ານ ຫ້ວຍທົ່ງ'] },
      { nameLo: 'ເມືອງ ບາຈຽງຈະເລີນສຸກ', nameEn: 'Bachiangchaleunsook', popularVillages: ['ບ້ານ ຫຼັກ 21', 'ບ້ານ ໜອງຫີນ'] },
      { nameLo: 'ເມືອງ ປາກຊ່ອງ', nameEn: 'Paksong', popularVillages: ['ບ້ານ ປາກຊ່ອງກາງ', 'ບ້ານ ຫຼັກ 35', 'ບ້ານ ຫ້ວຍບັງກ້ຽງ'] },
      { nameLo: 'ເມືອງ ປະທຸມພອນ', nameEn: 'Pathoumphone', popularVillages: ['ບ້ານ ທ່າໂພ', 'ບ້ານ ຫົວເຊໂດນ'] },
      { nameLo: 'ເມືອງ ໂພນທອງ', nameEn: 'Phonthong', popularVillages: ['ບ້ານ ຊ່ອງເມັກ (ວັງເຕົ່າ)', 'ບ້ານ ໜອງຫອຍ'] },
      { nameLo: 'ເມືອງ ຈຳປາສັກ', nameEn: 'Champasak', popularVillages: ['ບ້ານ ວັດພູ', 'ບ້ານ ຈຳປາສັກເກົ່າ'] },
      { nameLo: 'ເມືອງ ສຸຂຸມາ', nameEn: 'Soukhoumma', popularVillages: ['ບ້ານ ສຸຂຸມາ', 'ບ້ານ ໜອງບົວ'] },
      { nameLo: 'ເມືອງ ມູນລະປະໂມກ', nameEn: 'Mounlapamok', popularVillages: ['ບ້ານ ມູນລະປະໂມກ', 'ບ້ານ ທ່າເດື່ອ'] },
      { nameLo: 'ເມືອງ ໂຂງ', nameEn: 'Khong', popularVillages: ['ບ້ານ ດອນໂຂງ', 'ບ້ານ ດອນເດດ', 'ບ້ານ ຄອນພະເພັງ'] },
    ],
  },
  {
    id: 'svk',
    nameLo: 'ແຂວງ ສະຫວັນນະເຂດ',
    nameEn: 'Savannakhet',
    districts: [
      { nameLo: 'ນະຄອນ ໄກສອນ ພົມວິຫານ', nameEn: 'Kaysone Phomvihane', popularVillages: ['ບ້ານ ໄຊຍະພູມ', 'ບ້ານ ທ່າແຮ່', 'ບ້ານ ໂພນສະຫວ່າງ', 'ບ້ານ ລັດຕະນະລັງສີ'] },
      { nameLo: 'ເມືອງ ອຸທຸມພອນ', nameEn: 'Outhoumphone', popularVillages: ['ບ້ານ ເຊໂນ', 'ບ້ານ ດົງໝາກໄຟ'] },
      { nameLo: 'ເມືອງ ອາດສະພັງທອງ', nameEn: 'Atsaphangthong', popularVillages: ['ບ້ານ ດົງເຫັນ', 'ບ້ານ ນາທາມ'] },
      { nameLo: 'ເມືອງ ພິນ', nameEn: 'Phine', popularVillages: ['ບ້ານ ພິນ', 'ບ້ານ ດົງໂພນ'] },
      { nameLo: 'ເມືອງ ເຊໂປນ', nameEn: 'Sepon', popularVillages: ['ບ້ານ ເຊໂປນ', 'ບ້ານ ແດນສະຫວັນ (ດ່ານລາວ-ຫວຽດ)'] },
      { nameLo: 'ເມືອງ ນອງ', nameEn: 'Nong', popularVillages: ['ບ້ານ ນອງ', 'ບ້ານ ອາລັອກ'] },
      { nameLo: 'ເມືອງ ທ່າປາງທອງ', nameEn: 'Thapangthong', popularVillages: ['ບ້ານ ທ່າປາງທອງ', 'ບ້ານ ນາໂດນ'] },
      { nameLo: 'ເມືອງ ສອງຄອນ', nameEn: 'Songkhone', popularVillages: ['ບ້ານ ລະຫານ້ຳ', 'ບ້ານ ທ່າສະໂນ'] },
      { nameLo: 'ເມືອງ ຈຳພອນ', nameEn: 'Champhone', popularVillages: ['ບ້ານ ແກ້ງກອກ', 'ບ້ານ ດົງໜອງໂລມ'] },
      { nameLo: 'ເມືອງ ຊົນນະບູລີ', nameEn: 'Xonbuly', popularVillages: ['ບ້ານ ຊົນນະບູລີ', 'ບ້ານ ໜອງບົວ'] },
      { nameLo: 'ເມືອງ ໄຊບູລີ', nameEn: 'Xaybuly', popularVillages: ['ບ້ານ ໄຊບູລີ', 'ບ້ານ ທ່າຄັນທອງ'] },
      { nameLo: 'ເມືອງ ວີລະບູລີ', nameEn: 'Vilabuly', popularVillages: ['ບ້ານ ວີລະບູລີ', 'ບ້ານ ບໍ່ຄຳເຊໂປນ'] },
      { nameLo: 'ເມືອງ ອາດສະພອນ', nameEn: 'Atsaphone', popularVillages: ['ບ້ານ ອາດສະພອນ', 'ບ້ານ ໜອງແກ'] },
      { nameLo: 'ເມືອງ ໄຊພູທອງ', nameEn: 'Xayphouthong', popularVillages: ['ບ້ານ ໄຊພູທອງ', 'ບ້ານ ທ່າໂພ'] },
      { nameLo: 'ເມືອງ ພະລານໄຊ', nameEn: 'Phalanxay', popularVillages: ['ບ້ານ ພະລານໄຊ', 'ບ້ານ ດົງສະຫວ່າງ'] },
    ],
  },
  {
    id: 'vte_prov',
    nameLo: 'ແຂວງ ວຽງຈັນ',
    nameEn: 'Vientiane Province',
    districts: [
      { nameLo: 'ເມືອງ ໂພນໂຮງ', nameEn: 'Phonhong', popularVillages: ['ບ້ານ ໂພນໂຮງ', 'ບ້ານ ໂພນຄຳ', 'ບ້ານ ຫຼັກ 52'] },
      { nameLo: 'ເມືອງ ທຸລະຄົມ', nameEn: 'Thoulakhom', popularVillages: ['ບ້ານ ບ້ານເກິນ', 'ບ້ານ ໄຮ່', 'ບ້ານ ໂພນໄຊ'] },
      { nameLo: 'ເມືອງ ແກ້ວອຸດົມ', nameEn: 'Keo Oudom', popularVillages: ['ບ້ານ ນ້ຳງື່ມ (ເຂື່ອນນ້ຳງື່ມ)', 'ບ້ານ ທ່າລາດ'] },
      { nameLo: 'ເມືອງ ກາສີ', nameEn: 'Kasi', popularVillages: ['ບ້ານ ກາສີ', 'ບ້ານ ນ້ຳຄູນ'] },
      { nameLo: 'ເມືອງ ວັງວຽງ', nameEn: 'Vangvieng', popularVillages: ['ບ້ານ ວັງວຽງກາງ', 'ບ້ານ ຫ້ວຍສະງາວ', 'ບ້ານ ຖ້ຳຊ້າງ', 'ບ້ານ ສີສະຫວ່າງ'] },
      { nameLo: 'ເມືອງ ເຟືອງ', nameEn: 'Feuang', popularVillages: ['ບ້ານ ອ່າງນ້ຳຕົກເຟືອງ', 'ບ້ານ ດົງ', 'ບ້ານ ຫີນເຫີບເໜືອ'] },
      { nameLo: 'ເມືອງ ຊະນະຄາມ', nameEn: 'Xanakham', popularVillages: ['ບ້ານ ຊະນະຄາມ', 'ບ້ານ ປາກມາວ'] },
      { nameLo: 'ເມືອງ ແມດ', nameEn: 'Mad', popularVillages: ['ບ້ານ ແມດ', 'ບ້ານ ນ້ຳແຈ້ງ'] },
      { nameLo: 'ເມືອງ ຫີນເຫີບ', nameEn: 'Hinheup', popularVillages: ['ບ້ານ ຫີນເຫີບ', 'ບ້ານ ນ້ຳລິກ'] },
      { nameLo: 'ເມືອງ ໝື່ນ', nameEn: 'Meun', popularVillages: ['ບ້ານ ໝື່ນ', 'ບ້ານ ໜອງບົວ'] },
    ],
  },
  {
    id: 'kmm',
    nameLo: 'ແຂວງ ຄຳມ່ວນ',
    nameEn: 'Khammouane',
    districts: [
      { nameLo: 'ເມືອງ ທ່າແຂກ', nameEn: 'Thakhek', popularVillages: ['ບ້ານ ທ່າແຂກກາງ', 'ບ້ານ ໜອງບົວ', 'ບ້ານ ຈອມເພັດ', 'ບ້ານ ດົງກະເຍົາ'] },
      { nameLo: 'ເມືອງ ມະຫາໄຊ', nameEn: 'Mahaxay', popularVillages: ['ບ້ານ ມະຫາໄຊ', 'ບ້ານ ຖ້ຳນາງແອ່ນ'] },
      { nameLo: 'ເມືອງ ໜອງບົກ', nameEn: 'Nongbok', popularVillages: ['ບ້ານ ໜອງບົກ', 'ບ້ານ ດົງຂວາງ'] },
      { nameLo: 'ເມືອງ ຫີນບູນ', nameEn: 'Hinboun', popularVillages: ['ບ້ານ ກອງລໍ (ຖ້ຳກອງລໍ)', 'ບ້ານ ນາຫີນ'] },
      { nameLo: 'ເມືອງ ຍົມມະລາດ', nameEn: 'Yommalath', popularVillages: ['ບ້ານ ຍົມມະລາດ', 'ບ້ານ ນ້ຳເທີນ'] },
      { nameLo: 'ເມືອງ ບົວລະພາ', nameEn: 'Bualapha', popularVillages: ['ບ້ານ ບົວລະພາ', 'ບ້ານ ເຊບັ້ງໄຟ'] },
      { nameLo: 'ເມືອງ ນາກາຍ', nameEn: 'Nakai', popularVillages: ['ບ້ານ ນາກາຍ', 'ບ້ານ ອ່າງນ້ຳເທີນ 2'] },
      { nameLo: 'ເມືອງ ເຊບັ້ງໄຟ', nameEn: 'Sebangphay', popularVillages: ['ບ້ານ ເຊບັ້ງໄຟ', 'ບ້ານ ທ່າຂອນເຂີນ'] },
      { nameLo: 'ເມືອງ ໄຊບົວທອງ', nameEn: 'Xaybuathong', popularVillages: ['ບ້ານ ໄຊບົວທອງ', 'ບ້ານ ດົງສະຫວັນ'] },
      { nameLo: 'ເມືອງ ຄູນຄຳ', nameEn: 'Khounkham', popularVillages: ['ບ້ານ ຄູນຄຳ', 'ບ້ານ ພູໄຮ'] },
    ],
  },
  {
    id: 'blx',
    nameLo: 'ແຂວງ ບໍລິຄຳໄຊ',
    nameEn: 'Bolikhamxay',
    districts: [
      { nameLo: 'ເມືອງ ປາກຊັນ', nameEn: 'Paksan', popularVillages: ['ບ້ານ ປາກຊັນເໜືອ', 'ບ້ານ ປາກຊັນໃຕ້', 'ບ້ານ ໂພນໄຊ', 'ບ້ານ ໂພນສະຫວັນ'] },
      { nameLo: 'ເມືອງ ທ່າພະບາດ', nameEn: 'Thaphabath', popularVillages: ['ບ້ານ ພະບາດໂພນສັນ', 'ບ້ານ ຫ້ວຍເລິກ'] },
      { nameLo: 'ເມືອງ ປາກກະດິງ', nameEn: 'Pakkading', popularVillages: ['ບ້ານ ປາກກະດິງ', 'ບ້ານ ໜອງຫອຍ'] },
      { nameLo: 'ເມືອງ ບໍລິຄັນ', nameEn: 'Bolikhan', popularVillages: ['ບ້ານ ບໍລິຄັນ', 'ບ້ານ ນ້ຳຄວຍ'] },
      { nameLo: 'ເມືອງ ຄຳເກີດ', nameEn: 'Khamkeut', popularVillages: ['ບ້ານ ຫຼັກ 20', 'ບ້ານ ນ້ຳພາວ (ດ່ານນ້ຳພາວ)'] },
      { nameLo: 'ເມືອງ ວຽງທອງ', nameEn: 'Viengthong', popularVillages: ['ບ້ານ ວຽງທອງ', 'ບ້ານ ນ້ຳຍາງ'] },
      { nameLo: 'ເມືອງ ໄຊຈຳພອນ', nameEn: 'Xaychamphone', popularVillages: ['ບ້ານ ໄຊຈຳພອນ', 'ບ້ານ ພູກອກ'] },
    ],
  },
  {
    id: 'xyb',
    nameLo: 'ແຂວງ ໄຊຍະບູລີ',
    nameEn: 'Xayabury',
    districts: [
      { nameLo: 'ເມືອງ ໄຊຍະບູລີ', nameEn: 'Xayabury', popularVillages: ['ບ້ານ ນາໄຮ່', 'ບ້ານ ດອນແກ້ວ', 'ບ້ານ ສີເມືອງ', 'ບ້ານ ປ່າຂາມ'] },
      { nameLo: 'ເມືອງ ຄອບ', nameEn: 'Khop', popularVillages: ['ບ້ານ ຄອບ', 'ບ້ານ ປາງປອຍ'] },
      { nameLo: 'ເມືອງ ຮົງສາ', nameEn: 'Hongsa', popularVillages: ['ບ້ານ ຮົງສາ (ໂຮງໄຟຟ້າຮົງສາ)', 'ບ້ານ ສິມມະໂນ'] },
      { nameLo: 'ເມືອງ ເງິນ', nameEn: 'Ngeun', popularVillages: ['ບ້ານ ເງິນ (ດ່ານສາກົນນ້ຳເງິນ)', 'ບ້ານ ກອກ'] },
      { nameLo: 'ເມືອງ ຊຽງຮ່ອນ', nameEn: 'Xienghone', popularVillages: ['ບ້ານ ຊຽງຮ່ອນ', 'ບ້ານ ໂພນສະຫວັນ'] },
      { nameLo: 'ເມືອງ ພຽງ', nameEn: 'Phiang', popularVillages: ['ບ້ານ ພຽງ', 'ບ້ານ ນາຊຳ'] },
      { nameLo: 'ເມືອງ ປາກລາຍ', nameEn: 'Paklay', popularVillages: ['ບ້ານ ປາກລາຍ', 'ບ້ານ ນາສັກ'] },
      { nameLo: 'ເມືອງ ແກ່ນທ້າວ', nameEn: 'Kenethao', popularVillages: ['ບ້ານ ແກ່ນທ້າວ', 'ບ້ານ ໝາກນາວ'] },
      { nameLo: 'ເມືອງ ບໍ່ແຕນ', nameEn: 'Botene', popularVillages: ['ບ້ານ ບໍ່ແຕນ', 'ບ້ານ ປາກຫ້ວຍ'] },
      { nameLo: 'ເມືອງ ທົ່ງມີໄຊ', nameEn: 'Thongmyxay', popularVillages: ['ບ້ານ ທົ່ງມີໄຊ', 'ບ້ານ ໜອງແຂມ'] },
      { nameLo: 'ເມືອງ ໄຊສະຖານ', nameEn: 'Xaysathan', popularVillages: ['ບ້ານ ໄຊສະຖານ', 'ບ້ານ ດອນຕານ'] },
    ],
  },
  {
    id: 'xkh',
    nameLo: 'ແຂວງ ຊຽງຂວາງ',
    nameEn: 'Xiengkhouang',
    districts: [
      { nameLo: 'ເມືອງ ແປກ', nameEn: 'Paek', popularVillages: ['ບ້ານ ໂພນສະຫວັນ', 'ບ້ານ ທົ່ງໄຫຫີນ', 'ບ້ານ ນາຫອຍ'] },
      { nameLo: 'ເມືອງ ຄຳ', nameEn: 'Kham', popularVillages: ['ບ້ານ ຄຳ', 'ບ້ານ ບໍ່ນ້ຳຮ້ອນ'] },
      { nameLo: 'ເມືອງ ໜອງແຮດ', nameEn: 'Nonghed', popularVillages: ['ບ້ານ ໜອງແຮດ', 'ບ້ານ ນ້ຳກ່ານ (ດ່ານນ້ຳກ່ານ)'] },
      { nameLo: 'ເມືອງ ກຸດ', nameEn: 'Khoune', popularVillages: ['ບ້ານ ເມືອງຄູນເກົ່າ', 'ບ້ານ ວັດເພຍວັດ'] },
      { nameLo: 'ເມືອງ ໝອກໃໝ່', nameEn: 'Morkmay', popularVillages: ['ບ້ານ ໝອກໃໝ່', 'ບ້ານ ພູສັນ'] },
      { nameLo: 'ເມືອງ ພູກູດ', nameEn: 'Phou Kood', popularVillages: ['ບ້ານ ພູກູດ', 'ບ້ານ ສຸຍແກ້ງ'] },
      { nameLo: 'ເມືອງ ຜາໄຊ', nameEn: 'Phaxay', popularVillages: ['ບ້ານ ຜາໄຊ', 'ບ້ານ ນາຊານ'] },
    ],
  },
  {
    id: 'hou',
    nameLo: 'ແຂວງ ຫົວພັນ',
    nameEn: 'Huaphanh',
    districts: [
      { nameLo: 'ເມືອງ ຊຳເໜືອ', nameEn: 'Xamneua', popularVillages: ['ບ້ານ ພັນໄຊ', 'ບ້ານ ນາເລົ່າ', 'ບ້ານ ໂພນໄຊ', 'ບ້ານ ໜອງຄ້າງ'] },
      { nameLo: 'ເມືອງ ຊຽງຄໍ້', nameEn: 'Xiengkhor', popularVillages: ['ບ້ານ ຊຽງຄໍ້', 'ບ້ານ ສົບຮາວ'] },
      { nameLo: 'ເມືອງ ຮ້ຽມ', nameEn: 'Hiem', popularVillages: ['ບ້ານ ຮ້ຽມ', 'ບ້ານ ນ້ຳເນີນ'] },
      { nameLo: 'ເມືອງ ວຽງໄຊ', nameEn: 'Viengxay', popularVillages: ['ບ້ານ ຖ້ຳຜູ້ນຳວຽງໄຊ', 'ບ້ານ ນາໄກ່'] },
      { nameLo: 'ເມືອງ ຫົວເມືອງ', nameEn: 'Huameuang', popularVillages: ['ບ້ານ ຫົວເມືອງ', 'ບ້ານ ນ້ຳປຸ່ນ'] },
      { nameLo: 'ເມືອງ ຊຳໃຕ້', nameEn: 'Xamtay', popularVillages: ['ບ້ານ ຊຳໃຕ້', 'ບ້ານ ຜາແດງ'] },
      { nameLo: 'ເມືອງ ສົບເບົາ', nameEn: 'Sop Bao', popularVillages: ['ບ້ານ ສົບເບົາ', 'ບ້ານ ປາຮ່າງ (ດ່ານປາຮ່າງ)'] },
      { nameLo: 'ເມືອງ ແອດ', nameEn: 'Et', popularVillages: ['ບ້ານ ແອດ', 'ບ້ານ ນ້ຳມ້າ'] },
      { nameLo: 'ເມືອງ ກວັນ', nameEn: 'Kuan', popularVillages: ['ບ້ານ ກວັນ', 'ບ້ານ ນາຫາງ'] },
      { nameLo: 'ເມືອງ ຊ່ອນ', nameEn: 'Xon', popularVillages: ['ບ້ານ ຊ່ອນ', 'ບ້ານ ນ້ຳຄັ້ນ'] },
    ],
  },
  {
    id: 'psl',
    nameLo: 'ແຂວງ ຜົ້ງສາລີ',
    nameEn: 'Phongsaly',
    districts: [
      { nameLo: 'ເມືອງ ຜົ້ງສາລີ', nameEn: 'Phongsaly', popularVillages: ['ບ້ານ ພູຟ້າ', 'ບ້ານ ຜົ້ງສາລີກາງ', 'ບ້ານ ຫົວຂົວ'] },
      { nameLo: 'ເມືອງ ໃໝ່', nameEn: 'May', popularVillages: ['ບ້ານ ໃໝ່', 'ບ້ານ ນ້ຳອູ'] },
      { nameLo: 'ເມືອງ ຂວາ', nameEn: 'Khoua', popularVillages: ['ບ້ານ ເມືອງຂວາ', 'ບ້ານ ປາກນ້ຳອູ'] },
      { nameLo: 'ເມືອງ ສຳພັນ', nameEn: 'Samphan', popularVillages: ['ບ້ານ ສຳພັນ', 'ບ້ານ ນ້ຳຫາງ'] },
      { nameLo: 'ເມືອງ ບຸນເໜືອ', nameEn: 'Boon Neua', popularVillages: ['ບ້ານ ບຸນເໜືອ', 'ບ້ານ ສະໜາມບິນບຸນເໜືອ'] },
      { nameLo: 'ເມືອງ ຍອດອູ', nameEn: 'Yot Ou', popularVillages: ['ບ້ານ ຍອດອູ', 'ບ້ານ ລານຕຸຍ (ດ່ານຊາຍແດນຈີນ)'] },
      { nameLo: 'ເມືອງ ບຸນໃຕ້', nameEn: 'Boon Tay', popularVillages: ['ບ້ານ ບຸນໃຕ້', 'ບ້ານ ນ້ຳລາງ'] },
    ],
  },
  {
    id: 'lnt',
    nameLo: 'ແຂວງ ຫຼວງນ້ຳທາ',
    nameEn: 'Luang Namtha',
    districts: [
      { nameLo: 'ເມືອງ ຫຼວງນ້ຳທາ', nameEn: 'Luang Namtha', popularVillages: ['ບ້ານ ຫຼວງ', 'ບ້ານ ຂອນ', 'ບ້ານ ວຽງເໜືອ', 'ບ້ານ ທົ່ງໃຈເໜືອ'] },
      { nameLo: 'ເມືອງ ສິງ', nameEn: 'Sing', popularVillages: ['ບ້ານ ສິງ', 'ບ້ານ ທາດຊຽງຕື້', 'ບ້ານ ບໍ່ແຮ່'] },
      { nameLo: 'ເມືອງ ລອງ', nameEn: 'Long', popularVillages: ['ບ້ານ ລອງ', 'ບ້ານ ຫ້ວຍລອງ'] },
      { nameLo: 'ເມືອງ ວຽງພູຄາ', nameEn: 'Viengphoukha', popularVillages: ['ບ້ານ ວຽງພູຄາ', 'ບ້ານ ນ້ຳແພ່ງ'] },
      { nameLo: 'ເມືອງ ນາແລ', nameEn: 'Nale', popularVillages: ['ບ້ານ ນາແລ', 'ບ້ານ ຫົວເຊ'] },
    ],
  },
  {
    id: 'odx',
    nameLo: 'ແຂວງ ອຸດົມໄຊ',
    nameEn: 'Oudomxay',
    districts: [
      { nameLo: 'ເມືອງ ໄຊ', nameEn: 'Xay', popularVillages: ['ບ້ານ ບ້ານໄຊ', 'ບ້ານ ໂພນໄຊ', 'ບ້ານ ໜອງແມງດາ', 'ບ້ານ ຫ້ວຍຂຸມ'] },
      { nameLo: 'ເມືອງ ຫຼາ', nameEn: 'La', popularVillages: ['ບ້ານ ເມືອງຫຼາ', 'ບ້ານ ພະເຈົ້າສິງຄຳ'] },
      { nameLo: 'ເມືອງ ນາໝໍ້', nameEn: 'Namo', popularVillages: ['ບ້ານ ນາໝໍ້', 'ບ້ານ ບໍ່ເຕັນ (ດ່ານສາກົນບໍ່ເຕັນ)'] },
      { nameLo: 'ເມືອງ ງາ', nameEn: 'Nga', popularVillages: ['ບ້ານ ເມືອງງາ', 'ບ້ານ ນ້ຳງາ'] },
      { nameLo: 'ເມືອງ ແບ່ງ', nameEn: 'Beng', popularVillages: ['ບ້ານ ເມືອງແບ່ງ', 'ບ້ານ ໜອງບົວ'] },
      { nameLo: 'ເມືອງ ຮຸນ', nameEn: 'Houn', popularVillages: ['ບ້ານ ເມືອງຮຸນ', 'ບ້ານ ທ່າຊວງ'] },
      { nameLo: 'ເມືອງ ປາກແບ່ງ', nameEn: 'Pakbeng', popularVillages: ['ບ້ານ ປາກແບ່ງ', 'ບ້ານ ທ່າເຮືອປາກແບ່ງ'] },
    ],
  },
  {
    id: 'bke',
    nameLo: 'ແຂວງ ບໍ່ແກ້ວ',
    nameEn: 'Bokeo',
    districts: [
      { nameLo: 'ເມືອງ ຫ້ວຍຊາຍ', nameEn: 'Houayxay', popularVillages: ['ບ້ານ ຫ້ວຍຊາຍເໜືອ', 'ບ້ານ ຫ້ວຍຊາຍໃຕ້', 'ບ້ານ ໃຫຍ່ໂພນໄຊ', 'ບ້ານ ຂົວມິດຕະພາບ 4'] },
      { nameLo: 'ເມືອງ ຕົ້ນເຜິ້ງ', nameEn: 'Tonpheung', popularVillages: ['ບ້ານ ສາມຫຼ່ຽມທອງຄຳ', 'ບ້ານ ຕົ້ນເຜິ້ງ', 'ບ້ານ ນ້ຳເກິ່ງ'] },
      { nameLo: 'ເມືອງ ເມິງ', nameEn: 'Meung', popularVillages: ['ບ້ານ ເມືອງເມິງ', 'ບ້ານ ຫ້ວຍຊວງ'] },
      { nameLo: 'ເມືອງ ຜາອຸດົມ', nameEn: 'Pha Oudom', popularVillages: ['ບ້ານ ຜາອຸດົມ', 'ບ້ານ ທ່າຟ້າ'] },
      { nameLo: 'ເມືອງ ປາກທາ', nameEn: 'Paktha', popularVillages: ['ບ້ານ ປາກທາ', 'ບ້ານ ຫ້ວຍກ້ານ'] },
    ],
  },
  {
    id: 'slv',
    nameLo: 'ແຂວງ ສາລະວັນ',
    nameEn: 'Salavan',
    districts: [
      { nameLo: 'ເມືອງ ສາລະວັນ', nameEn: 'Salavan', popularVillages: ['ບ້ານ ສາລະວັນກາງ', 'ບ້ານ ໂພນສະອາດ', 'ບ້ານ ບຶງໄຊ'] },
      { nameLo: 'ເມືອງ ຕະໂອ້ຍ', nameEn: 'Ta Oi', popularVillages: ['ບ້ານ ຕະໂອ້ຍ', 'ບ້ານ ອາຊຽງ'] },
      { nameLo: 'ເມືອງ ຕຸ້ມລານ', nameEn: 'Toumlan', popularVillages: ['ບ້ານ ຕຸ້ມລານ', 'ບ້ານ ຫົວເຊ'] },
      { nameLo: 'ເມືອງ ລະຄອນເພັງ', nameEn: 'Lakhonepheng', popularVillages: ['ບ້ານ ລະຄອນເພັງ', 'ບ້ານ ດອນຊາດ'] },
      { nameLo: 'ເມືອງ ວາປີ', nameEn: 'Vapy', popularVillages: ['ບ້ານ ວາປີ', 'ບ້ານ ທ່າໂຄກ'] },
      { nameLo: 'ເມືອງ ຄົງເຊໂດນ', nameEn: 'Khongxedone', popularVillages: ['ບ້ານ ຄົງເຊໂດນ', 'ບ້ານ ໜອງບົວ'] },
      { nameLo: 'ເມືອງ ເລົ່າງາມ', nameEn: 'Lao Ngam', popularVillages: ['ບ້ານ ເລົ່າງາມ', 'ບ້ານ ຫຼັກ 38', 'ບ້ານ ຫ້ວຍຊາຍ'] },
      { nameLo: 'ເມືອງ ສະໝ້ວຍ', nameEn: 'Samouay', popularVillages: ['ບ້ານ ສະໝ້ວຍ', 'ບ້ານ ລາເລ (ດ່ານລາເລ)'] },
    ],
  },
  {
    id: 'sek',
    nameLo: 'ແຂວງ ເຊກອງ',
    nameEn: 'Sekong',
    districts: [
      { nameLo: 'ເມືອງ ລະມາມ', nameEn: 'Lamam', popularVillages: ['ບ້ານ ລະມາມໃຫຍ່', 'ບ້ານ ໂພນໄຊ', 'ບ້ານ ວັດຫຼວງ'] },
      { nameLo: 'ເມືອງ ກະລຶມ', nameEn: 'Kaleum', popularVillages: ['ບ້ານ ກະລຶມ', 'ບ້ານ ດາກປານ'] },
      { nameLo: 'ເມືອງ ດັກຈຶງ', nameEn: 'Dakcheung', popularVillages: ['ບ້ານ ດັກຈຶງ', 'ບ້ານ ຕາກ້າ (ດ່ານຕາກ້າ)'] },
      { nameLo: 'ເມືອງ ທ່າແຕງ', nameEn: 'Thateng', popularVillages: ['ບ້ານ ທ່າແຕງ', 'ບ້ານ ດົງສະໝໍ'] },
    ],
  },
  {
    id: 'atp',
    nameLo: 'ແຂວງ ອັດຕະປື',
    nameEn: 'Attapeu',
    districts: [
      { nameLo: 'ເມືອງ ສາມັກຄີໄຊ', nameEn: 'Samakkhixay', popularVillages: ['ບ້ານ ສາມັກຄີໄຊ', 'ບ້ານ ໂພນສະອາດ', 'ບ້ານ ທ່າຫີນ'] },
      { nameLo: 'ເມືອງ ໄຊເສດຖາ', nameEn: 'Xaysettha', popularVillages: ['ບ້ານ ວັດທາດ', 'ບ້ານ ໜອງລອຍ'] },
      { nameLo: 'ເມືອງ ສະໜາມໄຊ', nameEn: 'Sanamxay', popularVillages: ['ບ້ານ ສະໜາມໄຊ', 'ບ້ານ ຫິນລາດ'] },
      { nameLo: 'ເມືອງ ຊານໄຊ', nameEn: 'Sanxay', popularVillages: ['ບ້ານ ຊານໄຊ', 'ບ້ານ ພູເກືອ (ດ່ານສາກົນພູເກືອ)'] },
      { nameLo: 'ເມືອງ ພູວົງ', nameEn: 'Phouvong', popularVillages: ['ບ້ານ ພູວົງ', 'ບ້ານ ວັງຕັດ'] },
    ],
  },
  {
    id: 'xsb',
    nameLo: 'ແຂວງ ໄຊສົມບູນ',
    nameEn: 'Xaysomboun',
    districts: [
      { nameLo: 'ເມືອງ ອະນຸວົງ', nameEn: 'Anouvong', popularVillages: ['ບ້ານ ອະນຸວົງ', 'ບ້ານ ພູເບ້ຍ (ຍອດພູເບ້ຍ)', 'ບ້ານ ໂພນສະຫວ່າງ'] },
      { nameLo: 'ເມືອງ ລ້ອງແຈ້ງ', nameEn: 'Longchaeng', popularVillages: ['ບ້ານ ລ້ອງແຈ້ງ', 'ບ້ານ ສະໜາມບິນເກົ່າ'] },
      { nameLo: 'ເມືອງ ລ້ອງຊານ', nameEn: 'Longxan', popularVillages: ['ບ້ານ ລ້ອງຊານ', 'ບ້ານ ນ້ຳແຈ້ງ'] },
      { nameLo: 'ເມືອງ ຮົ່ມ', nameEn: 'Hom', popularVillages: ['ບ້ານ ຮົ່ມ', 'ບ້ານ ໜອງພະຍາ'] },
      { nameLo: 'ເມືອງ ທ່າໂທມ', nameEn: 'Thathom', popularVillages: ['ບ້ານ ທ່າໂທມ', 'ບ້ານ ປາກຍັນ'] },
    ],
  },
];
