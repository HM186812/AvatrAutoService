import type { DealershipConfig, InventoryItem, InvoiceBillRecord, SystemUser, VehicleModel } from './types';
import { isAdminRole } from './utils/roles';
import { isSupabaseConfigured, requireSupabase, supabase } from './backend/client';
import {
  deactivateStaffProfile,
  deleteInventoryItem,
  deleteVehicleModel,
  getSignedInStaff,
  saveBillRecord,
  saveDealershipSettingsPatch,
  saveInventoryItem,
  saveStaffProfile,
  saveVehicleModel,
  uploadDealershipAsset,
} from './backend/data';

export { isSupabaseConfigured, requireSupabase, supabase };
export const db = supabase;
export const auth = supabase?.auth ?? null;
export const storage = supabase?.storage ?? null;

async function currentStaffId() {
  if (!isSupabaseConfigured) return 'user-admin-01';
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('A signed-in staff account is required.');
  return data.user.id;
}

export async function saveInventoryItemToSupabase(item: InventoryItem) {
  await saveInventoryItem(item);
}

export async function deleteInventoryItemFromSupabase(vin: string) {
  await deleteInventoryItem(vin);
}

export async function saveBillToSupabase(bill: InvoiceBillRecord, vehicle?: InventoryItem) {
  await saveBillRecord(bill, await currentStaffId(), vehicle);
}

export async function saveVehicleModelToSupabase(model: VehicleModel, actorId?: string) {
  await saveVehicleModel(model, actorId || await currentStaffId());
}

export async function deleteVehicleModelFromSupabase(modelId: string) {
  await deleteVehicleModel(modelId);
}

export async function saveDealershipConfigToSupabase(config: Partial<DealershipConfig>) {
  await saveDealershipSettingsPatch(config as Record<string, unknown>, await currentStaffId());
}

export async function saveUserToSupabase(user: SystemUser) {
  if (user.status === 'suspended') {
    await deactivateStaffProfile(user.id);
    return;
  }
  await saveStaffProfile(user);
}

export async function getUserFromSupabase(userId: string): Promise<SystemUser | null> {
  try {
    return await getSignedInStaff(userId);
  } catch {
    return null;
  }
}

export async function deleteUserFromSupabase(userId: string) {
  await deactivateStaffProfile(userId);
}

/** Admin-only: the company QR is shared with every account through dealership settings. */
function assertCanManageCompanyQr(staff: SystemUser) {
  if (!isAdminRole(staff)) {
    throw new Error('ສະເພາະ Admin ຈຶ່ງສາມາດປ່ຽນຮູບ QR ບໍລິສັດໄດ້');
  }
}

const qrStamp = (staff: SystemUser) => ({
  companyQrUpdatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  companyQrUpdatedBy: staff.name || 'Admin',
});

export async function resetCompanyQrCode(staff: SystemUser) {
  assertCanManageCompanyQr(staff);
  await saveDealershipSettingsPatch({ companyQrImageUrl: null, ...qrStamp(staff) }, staff.id);
}

export async function uploadCompanyQrCodeToStorage(file: File, staff: SystemUser) {
  assertCanManageCompanyQr(staff);
  if (!file.type.startsWith('image/')) throw new Error('ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ (JPG, PNG ຫຼື WebP)');
  if (!isSupabaseConfigured) {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
    if (!dataUrl) throw new Error('ອ່ານໄຟລ໌ຮູບບໍ່ໄດ້');
    await saveDealershipSettingsPatch({ companyQrImageUrl: dataUrl, uploadedBy: staff.id, ...qrStamp(staff) }, staff.id);
    return dataUrl;
  }
  const { url } = await uploadDealershipAsset(file, 'qr');
  await saveDealershipSettingsPatch({ companyQrImageUrl: url, uploadedBy: staff.id, ...qrStamp(staff) }, staff.id);
  return url;
}
