import type { DealershipConfig, InventoryItem, InvoiceBillRecord, SystemUser, VehicleModel } from './types';
import { isSupabaseConfigured, requireSupabase, supabase } from './backend/client';
import {
  deactivateStaffProfile,
  deleteBill,
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

export async function deleteBillFromSupabase(billId: string) {
  await deleteBill(billId);
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

export async function uploadCompanyQrCodeToStorage(file: File, staff: SystemUser) {
  if (!isSupabaseConfigured) {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
    await saveDealershipSettingsPatch({ companyQrImageUrl: dataUrl, uploadedBy: staff.id }, staff.id);
    return dataUrl;
  }
  const { url } = await uploadDealershipAsset(file, 'qr');
  await saveDealershipSettingsPatch({ companyQrImageUrl: url, uploadedBy: staff.id }, staff.id);
  return url;
}
