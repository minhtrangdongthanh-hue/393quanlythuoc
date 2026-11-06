import express from 'express';
import os from 'os';
import { durableRequests } from './src/server/durableRequests.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServerAuthStore, sanitizeUserForClient } from './src/server/authService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = process.env.SCHOOL_DATA_DIR || (process.env.VERCEL ? path.join(os.tmpdir(), 'dongthanh-data') : SEED_DATA_DIR);
if (process.env.VERCEL) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const name of ['auth_accounts.json', 'school_state.json']) {
    const target = path.join(DATA_DIR, name);
    if (!fs.existsSync(target) && fs.existsSync(path.join(SEED_DATA_DIR, name))) {
      fs.copyFileSync(path.join(SEED_DATA_DIR, name), target);
    }
  }
}
const authStore = new ServerAuthStore(DATA_DIR);
const STATE_FILE = path.join(DATA_DIR, 'school_state.json');
const FIREBASE_CONFIG_FILE = path.join(__dirname, 'firebase-applet-config.json');
const FIRESTORE_SYNC_TOKEN = 'THCS_DONG_THANH_2026_V1';

let firebaseConfig: { projectId?: string; firestoreDatabaseId?: string; apiKey?: string } | null = null;
try {
  if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
    firebaseConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf-8'));
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json:', err);
}

function getFirestoreChunkUrl(chunkId: string): string | null {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return null;
  }
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/schoolSync/${chunkId}?key=${firebaseConfig.apiKey}`;
}

async function readFirestoreChunkServer(chunkId: string): Promise<any | null> {
  const url = getFirestoreChunkUrl(chunkId);
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const doc = await res.json();
    const payloadStr = doc?.fields?.payloadJson?.stringValue;
    if (!payloadStr) return null;
    return {
      payload: JSON.parse(payloadStr),
      updatedAt: doc?.fields?.updatedAt?.stringValue || null,
      revision: Number(doc?.fields?.revision?.integerValue ?? doc?.fields?.revision?.doubleValue ?? 0),
      chunkCount: Number(doc?.fields?.chunkCount?.integerValue ?? doc?.fields?.chunkCount?.doubleValue ?? 0),
    };
  } catch {
    return null;
  }
}

async function writeFirestoreChunkServer(
  chunkId: string,
  payloadObj: any,
  revision = 1,
  chunkCount?: number
): Promise<boolean> {
  const url = getFirestoreChunkUrl(chunkId);
  if (!url) return false;
  try {
    const payloadJson = JSON.stringify(payloadObj);
    if (payloadJson.length > 890000) {
      console.warn(`Chunk ${chunkId} exceeds 890KB (${payloadJson.length} bytes), skipping write`);
      return false;
    }
    const fields: Record<string, any> = {
      syncToken: { stringValue: FIRESTORE_SYNC_TOKEN },
      updatedAt: { stringValue: new Date().toISOString() },
      payloadJson: { stringValue: payloadJson },
      revision: { integerValue: String(Math.max(1, Math.floor(Number(revision) || 1))) },
    };
    if (typeof chunkCount === 'number') {
      fields.chunkCount = { integerValue: String(Math.max(0, Math.floor(chunkCount))) };
    }
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

function loadServerState() {
  ensureDataDir();
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      if (raw && raw.trim()) {
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.warn('Failed to read school_state.json:', err);
  }
  return null;
}

function saveServerState(state) {
  ensureDataDir();
  try {
    const tmpFile = `${STATE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state), 'utf-8');
    fs.renameSync(tmpFile, STATE_FILE);
    return true;
  } catch (err) {
    console.warn('Failed to write school_state.json:', err);
    return false;
  }
}

function mergeById(existingArr, incomingArr, deletedIdSet) {
  const map = new Map();
  if (Array.isArray(existingArr)) {
    for (const item of existingArr) {
      if (item && item.id && (!deletedIdSet || !deletedIdSet.has(item.id))) {
        map.set(item.id, item);
      }
    }
  }
  if (Array.isArray(incomingArr)) {
    for (const item of incomingArr) {
      if (item && item.id && (!deletedIdSet || !deletedIdSet.has(item.id))) {
        const prev = map.get(item.id);
        if (!prev) {
          map.set(item.id, item);
        } else {
          const prevTime = new Date(prev.updatedAt || prev.lastUpdated || prev.createdAt || 0).getTime();
          const nextTime = new Date(item.updatedAt || item.lastUpdated || item.createdAt || 0).getTime();
          if (nextTime >= prevTime) {
            map.set(item.id, { ...prev, ...item });
          }
        }
      }
    }
  }
  return Array.from(map.values());
}

function normalizeServerUsersToTwoRoles(_usersArr?: any) {
  return authStore.getSanitizedUsers();
}

const DEFAULT_SANITARY_PRODUCTS_SERVER = [
  {
    id: 'sn-prod-01',
    name: 'BVS ban ngày siêu mỏng cánh (23cm)',
    brand: 'Diana Sensi Cool Fresh / Kotex',
    unit: 'miếng',
    stockQuantity: 120,
    minAlertThreshold: 30,
    notes: 'Dùng phổ biến ban ngày cho học sinh nữ khi đến chu kỳ đột xuất.',
    isActive: true,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'sn-prod-02',
    name: 'BVS ban đêm siêu thấm chống tràn (28-35cm)',
    brand: 'Kotex Night / Diana Night',
    unit: 'miếng',
    stockQuantity: 45,
    minAlertThreshold: 20,
    notes: 'Dùng cho các trường hợp khẩn cấp ra nhiều hoặc học sinh tham gia hoạt động ngoại khóa kéo dài.',
    isActive: true,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'sn-prod-03',
    name: 'BVS hàng ngày kháng khuẩn mặt bông (15cm)',
    brand: 'Diana Daily / Kotex Cool',
    unit: 'miếng',
    stockQuantity: 60,
    minAlertThreshold: 20,
    notes: 'Dùng đầu/cuối chu kỳ hoặc vệ sinh học đường.',
    isActive: true,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'sn-prod-04',
    name: 'BVS Laurier Super Slimguard (Nhật Bản)',
    brand: 'Laurier (Nhật bản)',
    unit: 'miếng',
    stockQuantity: 400,
    minAlertThreshold: 30,
    notes: 'Dành cho các em có làn da nhạy cảm hoặc dễ kích ứng.',
    isActive: true,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'sn-prod-05',
    name: 'BVS Diana Sensi Cool Fresh 23cm (Nhập kho tài trợ)',
    brand: 'Diana Sensi',
    unit: 'miếng',
    stockQuantity: 80,
    minAlertThreshold: 20,
    notes: 'Nhập kho tài trợ 10 gói x 8 miếng quy đổi thành 80 miếng.',
    isActive: true,
    createdAt: '2026-11-03T08:00:00.000Z',
  },
];

let cachedState = loadServerState();
if (cachedState) {
  if (Array.isArray(cachedState.users)) {
    cachedState.users = normalizeServerUsersToTwoRoles(cachedState.users);
  }
  if ((!cachedState.sanitaryProducts || cachedState.sanitaryProducts.length === 0) && !cachedState.sanitaryProductsCleaned) {
    cachedState.sanitaryProducts = [...DEFAULT_SANITARY_PRODUCTS_SERVER];
  }
}

const DEMO_TEACHER_BY_CLASS: Record<string, string> = {
  '6/1': 'Cô Nguyễn Thị Lan',
  '6/2': 'Thầy Trần Minh Tuấn',
  '7/1': 'Cô Lê Thị Mai',
  '7/2': 'Cô Hoàng Thị Hoa',
  '7/3': 'Thầy Phạm Văn Nam',
  '8/1': 'Cô Vũ Thu Hương',
  '8/2': 'Thầy Đặng Quang Huy',
  '9/1': 'Cô Bùi Thanh Thảo',
  '9/2': 'Thầy Ngô Quốc Bảo',
};

function normalizeClassKeyServer(name: any): string {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/^lớp\s*/i, '')
    .replace(/^lop\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[-.aA]/g, '/');
}

function isDemoClassServer(c: any): boolean {
  if (!c || typeof c !== 'object') return true;
  if (c.updatedAt) return false;
  const key = normalizeClassKeyServer(c.name);
  const demoTeacher = DEMO_TEACHER_BY_CLASS[key];
  if (!demoTeacher) return false;
  return (c.homeroomTeacher || '').trim() === demoTeacher;
}

function isOnlyDemoClassesServer(arr: any): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return true;
  if (arr.length > 9) return false;
  return arr.every((c) => isDemoClassServer(c));
}

function mergeSchoolClassesServer(existingClasses: any, incomingClasses: any, deletedClassSet: Set<string>) {
  const listA = Array.isArray(existingClasses) ? existingClasses : [];
  const listB = Array.isArray(incomingClasses) ? incomingClasses : [];

  const aOnlyDemo = isOnlyDemoClassesServer(listA);
  const bOnlyDemo = isOnlyDemoClassesServer(listB);

  // If one side has real school classes/GVCN and the other only has the 9 unmodified demo classes,
  // do not let the unmodified demo classes overwrite or pollute the real classes
  const effectiveA = !bOnlyDemo && aOnlyDemo ? [] : listA;
  const effectiveB = !aOnlyDemo && bOnlyDemo ? [] : listB;

  const byKey = new Map<string, any>();

  const upsertClass = (cls: any, isIncoming: boolean) => {
    if (!cls || !cls.name) return;
    const normKey = normalizeClassKeyServer(cls.name);
    if (!normKey) return;
    if (deletedClassSet && (deletedClassSet.has(cls.id) || deletedClassSet.has(normKey))) {
      return;
    }

    const prev = byKey.get(normKey);
    if (!prev) {
      byKey.set(normKey, { ...cls });
      return;
    }

    const prevIsDemo = isDemoClassServer(prev);
    const nextIsDemo = isDemoClassServer(cls);

    if (prevIsDemo && !nextIsDemo) {
      byKey.set(normKey, { ...prev, ...cls });
      return;
    }
    if (!prevIsDemo && nextIsDemo) {
      return;
    }

    const rawPrevUpdated = prev.updatedAt === '2026-09-15T08:00:00.000Z' ? '' : prev.updatedAt || '';
    const rawNextUpdated = cls.updatedAt === '2026-09-15T08:00:00.000Z' ? '' : cls.updatedAt || '';
    const prevTime = rawPrevUpdated ? new Date(rawPrevUpdated).getTime() || 0 : 0;
    const nextTime = rawNextUpdated ? new Date(rawNextUpdated).getTime() || 0 : 0;

    const prevTeacher = (prev.homeroomTeacher || '').trim();
    const nextTeacher = (cls.homeroomTeacher || '').trim();
    const prevPhone = (prev.teacherPhone || '').trim();
    const nextPhone = (cls.teacherPhone || '').trim();
    const prevRoom = (prev.room || '').trim();
    const nextRoom = (cls.room || '').trim();

    if (nextTime > prevTime || (nextTime === prevTime && isIncoming)) {
      const merged = {
        ...prev,
        ...cls,
        homeroomTeacher: nextTeacher || prevTeacher,
        teacherPhone: nextPhone || prevPhone,
        room: nextRoom || prevRoom,
        updatedAt: rawNextUpdated || rawPrevUpdated || undefined,
      };
      byKey.set(normKey, merged);
    } else {
      const merged = {
        ...cls,
        ...prev,
        homeroomTeacher: prevTeacher || nextTeacher,
        teacherPhone: prevPhone || nextPhone,
        room: prevRoom || nextRoom,
        updatedAt: rawPrevUpdated || rawNextUpdated || undefined,
      };
      byKey.set(normKey, merged);
    }
  };

  for (const c of effectiveA) upsertClass(c, false);
  for (const c of effectiveB) upsertClass(c, true);

  const result = Array.from(byKey.values());
  if (result.length === 0 && listA.length > 0 && deletedClassSet.size === 0) {
    return listA;
  }
  return result.sort((a, b) => {
    const gA = Number(a.grade) || 6;
    const gB = Number(b.grade) || 6;
    if (gA !== gB) return gA - gB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { numeric: true });
  });
}

function mergeSchoolState(existing, incoming) {
  if (!existing) {
    const firstState = {
      ...incoming,
      users: normalizeServerUsersToTwoRoles(incoming?.users),
      revision: 1,
      updatedAt: new Date().toISOString(),
    };
    return firstState;
  }

  const deletedVisitIds = Array.from(
    new Set([...(existing.deletedVisitIds || []), ...(incoming.deletedVisitIds || [])])
  ).filter((id) => id && !String(id).startsWith('KB-'));
  const deletedUserIds = Array.from(
    new Set([...(existing.deletedUserIds || []), ...(incoming.deletedUserIds || [])])
  );
  const deletedTxIds = Array.from(
    new Set([...(existing.deletedTxIds || []), ...(incoming.deletedTxIds || [])])
  );
  const deletedClassIds = Array.from(
    new Set([...(existing.deletedClassIds || []), ...(incoming.deletedClassIds || [])])
  );
  const deletedEventIds = Array.from(
    new Set([...(existing.deletedEventIds || []), ...(incoming.deletedEventIds || [])])
  );
  const deletedCheckupIds = Array.from(
    new Set([...(existing.deletedCheckupIds || []), ...(incoming.deletedCheckupIds || [])])
  );
  const deletedStudentIds = Array.from(
    new Set([...(existing.deletedStudentIds || []), ...(incoming.deletedStudentIds || [])])
  );
  const deletedStaffIds = Array.from(
    new Set([...(existing.deletedStaffIds || []), ...(incoming.deletedStaffIds || [])])
  );
  const deletedSanitaryProductIds = Array.from(
    new Set([...(existing.deletedSanitaryProductIds || []), ...(incoming.deletedSanitaryProductIds || [])])
  );
  const deletedSanitaryDispatchIds = Array.from(
    new Set([...(existing.deletedSanitaryDispatchIds || []), ...(incoming.deletedSanitaryDispatchIds || [])])
  );
  const deletedSanitaryImportIds = Array.from(
    new Set([...(existing.deletedSanitaryImportIds || []), ...(incoming.deletedSanitaryImportIds || [])])
  );

  const deletedVisitSet = new Set(deletedVisitIds);
  const deletedUserSet = new Set(deletedUserIds);
  const deletedTxSet = new Set(deletedTxIds);
  const deletedClassSet = new Set(deletedClassIds);
  const deletedEventSet = new Set(deletedEventIds);
  const deletedCheckupSet = new Set(deletedCheckupIds);
  const deletedStudentSet = new Set(deletedStudentIds);
  const deletedStaffSet = new Set(deletedStaffIds);
  const deletedSanitaryProductSet = new Set(deletedSanitaryProductIds);
  const deletedSanitaryDispatchSet = new Set(deletedSanitaryDispatchIds);
  const deletedSanitaryImportSet = new Set(deletedSanitaryImportIds);

  // 1. Merge Clinic Visits by ID (preserving all visits across machines except explicitly deleted ones)
  const mergedClinicVisits = mergeById(
    existing.clinicVisits,
    incoming.clinicVisits,
    deletedVisitSet
  ).sort((a, b) => {
    const tA = new Date(a.createdAt || `${a.visitDate || ''}T${a.timeIn || '00:00'}`).getTime() || 0;
    const tB = new Date(b.createdAt || `${b.visitDate || ''}T${b.timeIn || '00:00'}`).getTime() || 0;
    return tB - tA;
  });

  // 2. Merge Transactions by ID
  const mergedTransactions = mergeById(
    existing.transactions,
    incoming.transactions,
    deletedTxSet
  ).sort((a, b) => {
    const tA = new Date(a.date || a.createdAt || 0).getTime() || 0;
    const tB = new Date(b.date || b.createdAt || 0).getTime() || 0;
    return tB - tA;
  });

  // 3. Merge Inventory Checks, Disposals, Health Events, Health Checkups, Usage Records, Users
  const mergedInventoryChecks = mergeById(existing.inventoryChecks, incoming.inventoryChecks, null);
  const mergedDisposals = mergeById(existing.disposals, incoming.disposals, null);
  const mergedHealthEvents = mergeById(existing.healthEvents, incoming.healthEvents, deletedEventSet);
  const mergedHealthCheckups = mergeById(existing.healthCheckups, incoming.healthCheckups, deletedCheckupSet);
  const mergedUsageRecords = mergeById(existing.usageRecords, incoming.usageRecords, null);
  const mergedUsers = normalizeServerUsersToTwoRoles(incoming.users || existing.users);

  // 3.1 Merge Staff Members with deletion and update timestamp awareness
  const existingStaffTime = Number(existing.staffUpdatedAt || 0);
  const incomingStaffTime = Number(incoming.staffUpdatedAt || 0);
  const incomingStaffCount = Array.isArray(incoming.staffMembers) ? incoming.staffMembers.length : 0;
  const existingStaffCount = Array.isArray(existing.staffMembers) ? existing.staffMembers.length : 0;

  let mergedStaffMembers: any[] = [];
  if (incoming.staffCleaned && incomingStaffTime >= existingStaffTime) {
    mergedStaffMembers = [];
  } else if (incoming.replaceAllStaff && Array.isArray(incoming.staffMembers)) {
    mergedStaffMembers = incoming.staffMembers.filter((s: any) => s && !deletedStaffSet.has(s.id));
  } else if (
    incomingStaffCount > 0 &&
    (incomingStaffTime >= existingStaffTime || incomingStaffCount !== existingStaffCount)
  ) {
    mergedStaffMembers = mergeById(existing.staffMembers, incoming.staffMembers, deletedStaffSet);
  } else if (Array.isArray(incoming.staffMembers) && incomingStaffCount === 0 && incoming.staffCleaned) {
    mergedStaffMembers = [];
  } else {
    mergedStaffMembers = mergeById(existing.staffMembers, incoming.staffMembers, deletedStaffSet);
  }

  // 4. Inventory Batches & Medicines: prefer whichever side has newer inventoryUpdatedAt or more transactions
  const existingInvTime = Number(existing.inventoryUpdatedAt || 0);
  const incomingInvTime = Number(incoming.inventoryUpdatedAt || 0);
  const incomingTxCount = Array.isArray(incoming.transactions) ? incoming.transactions.length : 0;
  const existingTxCount = Array.isArray(existing.transactions) ? existing.transactions.length : 0;
  const incomingDispCompleted = Array.isArray(incoming.disposals)
    ? incoming.disposals.filter((d: any) => d && d.status === 'completed').length
    : 0;
  const existingDispCompleted = Array.isArray(existing.disposals)
    ? existing.disposals.filter((d: any) => d && d.status === 'completed').length
    : 0;

  const preferIncomingInventory =
    incomingInvTime >= existingInvTime ||
    incomingTxCount >= existingTxCount ||
    incomingDispCompleted > existingDispCompleted;

  const mergedBatches =
    preferIncomingInventory && Array.isArray(incoming.batches) && incoming.batches.length > 0
      ? incoming.batches
      : existing.batches || incoming.batches || [];

  const mergedMedicines =
    preferIncomingInventory && Array.isArray(incoming.medicines) && incoming.medicines.length > 0
      ? incoming.medicines
      : existing.medicines || incoming.medicines || [];

  // Always keep medicine totalStock in sync with mergedBatches
  for (const med of mergedMedicines) {
    if (med && med.id) {
      const medBatches = mergedBatches.filter((b: any) => b && b.medicineId === med.id);
      med.totalStock = medBatches.reduce((acc: number, b: any) => acc + (b.quantity || 0), 0);
    }
  }

  const mergedSupplies =
    preferIncomingInventory && Array.isArray(incoming.supplies) && incoming.supplies.length > 0
      ? incoming.supplies
      : existing.supplies || incoming.supplies || [];

  const mergedSuppliers =
    Array.isArray(incoming.suppliers) && incoming.suppliers.length > 0
      ? incoming.suppliers
      : existing.suppliers || [];

  // 5. Students, Health Profiles & Classes (GVCN)
  const existingStuTime = Number(existing.studentsUpdatedAt || 0);
  const incomingStuTime = Number(incoming.studentsUpdatedAt || 0);
  const existingClassesTime = Number(existing.classesUpdatedAt || 0);
  const incomingClassesTime = Number(incoming.classesUpdatedAt || 0);
  const existingStuCount = Array.isArray(existing.students) ? existing.students.length : 0;
  const incomingStuCount = Array.isArray(incoming.students) ? incoming.students.length : 0;

  let mergedStudents = existing.students || [];
  let mergedHealthProfiles = existing.healthProfiles || [];
  let realStudentsImported = Boolean(existing.realStudentsImported || incoming.realStudentsImported);
  let studentsCleaned = Boolean(incoming.studentsCleaned);

  if (
    incomingStuCount > existingStuCount ||
    (incomingStuTime >= existingStuTime && incomingStuCount > 0) ||
    (incoming.studentsCleaned && incomingStuTime >= existingStuTime) ||
    (Array.isArray(incoming.deletedStudentIds) && incoming.deletedStudentIds.length > (existing.deletedStudentIds?.length || 0))
  ) {
    mergedStudents = (incoming.students || []).filter((s) => s && !deletedStudentSet.has(s.id));
    mergedHealthProfiles = mergeById(existing.healthProfiles, incoming.healthProfiles, null).filter(
      (hp) => hp && !deletedStudentSet.has(hp.studentId)
    );
  } else {
    mergedStudents = (existing.students || []).filter((s) => s && !deletedStudentSet.has(s.id));
    mergedHealthProfiles = mergeById(incoming.healthProfiles, existing.healthProfiles, null).filter(
      (hp) => hp && !deletedStudentSet.has(hp.studentId)
    );
  }

  // Always merge classes & Homeroom Teachers (GVCN) intelligently so GVCN changes sync across all computers
  let mergedClasses = mergeSchoolClassesServer(existing.classes, incoming.classes, deletedClassSet);
  for (const c of mergedClasses) {
    c.totalStudents = mergedStudents.filter(
      (s) =>
        s &&
        (s.className === c.name ||
          normalizeClassKeyServer(s.className) === normalizeClassKeyServer(c.name))
    ).length || c.totalStudents || 0;
  }

  return {
    medicines: mergedMedicines,
    batches: mergedBatches,
    transactions: mergedTransactions,
    suppliers: mergedSuppliers,
    supplies: mergedSupplies,
    usageRecords: mergedUsageRecords,
    inventoryChecks: mergedInventoryChecks,
    disposals: mergedDisposals,
    settings: { ...(existing.settings || {}), ...(incoming.settings || {}) },
    sanitarySettings: { ...(existing.sanitarySettings || {}), ...(incoming.sanitarySettings || {}) },
    sanitaryProducts: (() => {
      const hasIncoming = Array.isArray(incoming.sanitaryProducts) && incoming.sanitaryProducts.length > 0;
      const hasExisting = Array.isArray(existing.sanitaryProducts) && existing.sanitaryProducts.length > 0;
      if (hasIncoming && hasExisting) {
        return mergeById(existing.sanitaryProducts, incoming.sanitaryProducts, null);
      }
      if (hasIncoming) {
        return incoming.sanitaryProducts;
      }
      if (hasExisting) {
        return existing.sanitaryProducts;
      }
      return [...DEFAULT_SANITARY_PRODUCTS_SERVER];
    })(),
    sanitaryDispatches: incoming.sanitaryDispatchesCleaned
      ? []
      : mergeById(existing.sanitaryDispatches, incoming.sanitaryDispatches, deletedSanitaryDispatchSet),
    sanitaryImports: incoming.sanitaryImportsCleaned
      ? []
      : mergeById(existing.sanitaryImports, incoming.sanitaryImports, deletedSanitaryImportSet),
    sanitaryProductsCleaned: false,
    sanitaryDispatchesCleaned: Boolean(incoming.sanitaryDispatchesCleaned && (!incoming.sanitaryDispatches || incoming.sanitaryDispatches.length === 0)),
    users: mergedUsers,
    staffMembers: mergedStaffMembers,
    students: mergedStudents,
    healthProfiles: mergedHealthProfiles,
    clinicVisits: mergedClinicVisits,
    healthEvents: mergedHealthEvents,
    healthCheckups: mergedHealthCheckups,
    classes: mergedClasses,
    deletedVisitIds,
    deletedUserIds,
    deletedTxIds,
    deletedClassIds,
    deletedEventIds,
    deletedCheckupIds,
    deletedStudentIds,
    deletedStaffIds,
    deletedSanitaryProductIds: (deletedSanitaryProductIds || []).filter((id) => !DEFAULT_SANITARY_PRODUCTS_SERVER.some((dp) => dp.id === id)),
    deletedSanitaryDispatchIds,
    deletedSanitaryImportIds,
    staffUpdatedAt: Math.max(existingStaffTime, incomingStaffTime, Date.now()),
    staffCleaned: Boolean(incoming.staffCleaned),
    realStudentsImported,
    studentsCleaned,
    inventoryUpdatedAt: Math.max(existingInvTime, incomingInvTime),
    studentsUpdatedAt: Math.max(existingStuTime, incomingStuTime),
    classesUpdatedAt: Math.max(existingClassesTime, incomingClassesTime),
    revision: Math.max(Number(existing.revision) || 0, Number(incoming.revision) || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}

let lastCloudPullAt = 0;
let isCloudPulling = false;
let lastPushedStudentsHash = '';

async function pushStateToCloudFirestore(state: any, forceStudents = false): Promise<void> {
  if (!state) return;
  const rev = Number(state.revision) || 1;
  try {
    // 1. Push classes & homeroom teachers (GVCN) chunk
    const classesPayload = {
      classes: state.classes || [],
      deletedClassIds: state.deletedClassIds || [],
      classesUpdatedAt: state.classesUpdatedAt || Date.now(),
    };
    await writeFirestoreChunkServer('thcs_dt_classes', classesPayload, rev);

    // 2. Push operational records chunk
    const operationalPayload = {
      medicines: state.medicines || [],
      batches: state.batches || [],
      transactions: state.transactions || [],
      suppliers: state.suppliers || [],
      supplies: state.supplies || [],
      usageRecords: state.usageRecords || [],
      inventoryChecks: state.inventoryChecks || [],
      disposals: state.disposals || [],
      settings: state.settings || {},
      sanitarySettings: state.sanitarySettings || {},
      sanitaryProducts: state.sanitaryProducts || [],
      sanitaryDispatches: state.sanitaryDispatches || [],
      sanitaryImports: state.sanitaryImports || [],
      users: state.users || [],
      staffMembers: state.staffMembers || [],
      clinicVisits: state.clinicVisits || [],
      healthEvents: state.healthEvents || [],
      healthCheckups: state.healthCheckups || [],
      deletedVisitIds: state.deletedVisitIds || [],
      deletedUserIds: state.deletedUserIds || [],
      deletedTxIds: state.deletedTxIds || [],
      deletedClassIds: state.deletedClassIds || [],
      deletedEventIds: state.deletedEventIds || [],
      deletedCheckupIds: state.deletedCheckupIds || [],
      deletedStudentIds: state.deletedStudentIds || [],
      deletedSanitaryProductIds: (state.deletedSanitaryProductIds || []).filter(
        (id: string) => !(state.sanitaryProducts || []).some((p: any) => p && p.id === id)
      ),
      deletedSanitaryDispatchIds: state.deletedSanitaryDispatchIds || [],
      deletedSanitaryImportIds: state.deletedSanitaryImportIds || [],
      sanitaryProductsCleaned: Boolean(
        state.sanitaryProductsCleaned && (!state.sanitaryProducts || state.sanitaryProducts.length === 0)
      ),
      sanitaryDispatchesCleaned: Boolean(
        state.sanitaryDispatchesCleaned && (!state.sanitaryDispatches || state.sanitaryDispatches.length === 0)
      ),
      staffUpdatedAt: state.staffUpdatedAt || Date.now(),
      staffCleaned: Boolean(state.staffCleaned),
      inventoryUpdatedAt: state.inventoryUpdatedAt || Date.now(),
      classesUpdatedAt: state.classesUpdatedAt || Date.now(),
      studentsUpdatedAt: state.studentsUpdatedAt || 0,
      realStudentsImported: Boolean(state.realStudentsImported),
      studentsCleaned: Boolean(state.studentsCleaned),
      revision: rev,
    };
    await writeFirestoreChunkServer('thcs_dt_operational', operationalPayload, rev);

    // 3. Push students & healthProfiles in 350-student chunks if changed
    const students = Array.isArray(state.students) ? state.students : [];
    const stuHash = `${students.length}_${state.studentsUpdatedAt || 0}_${Boolean(state.realStudentsImported)}`;
    if (forceStudents || stuHash !== lastPushedStudentsHash) {
      lastPushedStudentsHash = stuHash;
      const CHUNK_SIZE = 350;
      const chunkCount = Math.min(10, Math.ceil(students.length / CHUNK_SIZE));
      for (let i = 0; i < chunkCount; i++) {
        const slice = students.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await writeFirestoreChunkServer(`thcs_dt_students_${i}`, { students: slice, chunkIndex: i }, rev, chunkCount);
      }
      const metaPayload = {
        totalStudents: students.length,
        chunkCount,
        studentsUpdatedAt: state.studentsUpdatedAt || Date.now(),
        realStudentsImported: Boolean(state.realStudentsImported),
        studentsCleaned: Boolean(state.studentsCleaned),
        deletedStudentIds: state.deletedStudentIds || [],
        healthProfiles: Array.isArray(state.healthProfiles) ? state.healthProfiles.slice(0, 600) : [],
      };
      await writeFirestoreChunkServer('thcs_dt_students_meta', metaPayload, rev, chunkCount);
    }
  } catch (err) {
    console.warn('Cloud Firestore push notice:', err);
  }
}

async function pullStateFromCloudFirestore(force = false): Promise<boolean> {
  if (isCloudPulling) return false;
  if (!force && Date.now() - lastCloudPullAt < 15000 && cachedState) {
    return false;
  }
  isCloudPulling = true;
  lastCloudPullAt = Date.now();
  try {
    const [clsDoc, opDoc, stuMetaDoc] = await Promise.all([
      readFirestoreChunkServer('thcs_dt_classes'),
      readFirestoreChunkServer('thcs_dt_operational'),
      readFirestoreChunkServer('thcs_dt_students_meta'),
    ]);

    if (!clsDoc && !opDoc && !stuMetaDoc) {
      // Cloud Firestore has no schoolSync state yet; if we have local state, push it up to seed Cloud Firestore
      if (cachedState) {
        await pushStateToCloudFirestore(cachedState, true);
      }
      return false;
    }

    const cloudIncoming: Record<string, any> = {
      ...(opDoc?.payload || {}),
    };

    if (clsDoc?.payload) {
      if (Array.isArray(clsDoc.payload.classes)) {
        cloudIncoming.classes = clsDoc.payload.classes;
      }
      if (Array.isArray(clsDoc.payload.deletedClassIds)) {
        cloudIncoming.deletedClassIds = Array.from(
          new Set([...(cloudIncoming.deletedClassIds || []), ...clsDoc.payload.deletedClassIds])
        );
      }
      if (clsDoc.payload.classesUpdatedAt) {
        cloudIncoming.classesUpdatedAt = clsDoc.payload.classesUpdatedAt;
      }
    }

    if (stuMetaDoc?.payload) {
      const meta = stuMetaDoc.payload;
      cloudIncoming.studentsUpdatedAt = meta.studentsUpdatedAt || cloudIncoming.studentsUpdatedAt || 0;
      cloudIncoming.realStudentsImported = Boolean(meta.realStudentsImported || cloudIncoming.realStudentsImported);
      cloudIncoming.studentsCleaned = Boolean(meta.studentsCleaned);
      if (Array.isArray(meta.healthProfiles)) {
        cloudIncoming.healthProfiles = meta.healthProfiles;
      }
      if (Array.isArray(meta.deletedStudentIds)) {
        cloudIncoming.deletedStudentIds = Array.from(
          new Set([...(cloudIncoming.deletedStudentIds || []), ...meta.deletedStudentIds])
        );
      }

      const localStuCount = Array.isArray(cachedState?.students) ? cachedState.students.length : 0;
      const cloudTotalStu = Number(meta.totalStudents) || 0;
      const cloudChunkCount = Math.min(10, Number(meta.chunkCount || stuMetaDoc.chunkCount || 0));

      if (
        cloudChunkCount > 0 &&
        (cloudTotalStu > localStuCount ||
          Number(meta.studentsUpdatedAt || 0) > Number(cachedState?.studentsUpdatedAt || 0) ||
          !cachedState)
      ) {
        const chunkPromises = [];
        for (let i = 0; i < cloudChunkCount; i++) {
          chunkPromises.push(readFirestoreChunkServer(`thcs_dt_students_${i}`));
        }
        const chunkDocs = await Promise.all(chunkPromises);
        const allCloudStudents: any[] = [];
        for (const cDoc of chunkDocs) {
          if (cDoc?.payload && Array.isArray(cDoc.payload.students)) {
            allCloudStudents.push(...cDoc.payload.students);
          }
        }
        if (allCloudStudents.length > 0) {
          cloudIncoming.students = allCloudStudents;
        }
      }
    }

    const cloudRev = Math.max(
      Number(clsDoc?.revision || 0),
      Number(opDoc?.revision || 0),
      Number(stuMetaDoc?.revision || 0)
    );
    cloudIncoming.revision = cloudRev;

    // Protect sanitary products from being overwritten by stale or quota-frozen Cloud Firestore chunks
    if (
      (!cloudIncoming.sanitaryProducts || cloudIncoming.sanitaryProducts.length === 0) &&
      Array.isArray(cachedState?.sanitaryProducts) &&
      cachedState.sanitaryProducts.length > 0
    ) {
      cloudIncoming.sanitaryProducts = cachedState.sanitaryProducts;
      cloudIncoming.sanitaryProductsCleaned = false;
      cloudIncoming.deletedSanitaryProductIds = [];
    }

    const prevJson = cachedState
      ? JSON.stringify({
          c: cachedState.classes,
          v: cachedState.clinicVisits?.length,
          s: cachedState.students?.length,
          st: cachedState.staffMembers?.length,
          stu: cachedState.staffUpdatedAt,
          sp: cachedState.sanitaryProducts?.length,
        })
      : '';
    cachedState = mergeSchoolState(cachedState, cloudIncoming);
    if (cloudRev > cachedState.revision) {
      cachedState.revision = cloudRev;
    }
    const nextJson = JSON.stringify({
      c: cachedState.classes,
      v: cachedState.clinicVisits?.length,
      s: cachedState.students?.length,
      st: cachedState.staffMembers?.length,
      stu: cachedState.staffUpdatedAt,
      sp: cachedState.sanitaryProducts?.length,
    });
    if (prevJson !== nextJson) {
      saveServerState(cachedState);
    }
    return true;
  } catch (err) {
    console.warn('Cloud Firestore pull notice:', err);
    return false;
  } finally {
    isCloudPulling = false;
  }
}

export async function createApp(apiOnly = false) {
  const app = express();

  // Determine port: strictly prioritize process.env.PORT (e.g. Cloud Run PORT=3000 / PORT=8080), with CLI arg fallback, defaulting to 3000
  const portArgIndex = process.argv.indexOf('--port');
  const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
  const envPort = process.env.PORT ? Number(process.env.PORT) : null;
  const PORT = (envPort && !isNaN(envPort) && envPort > 0) ? envPort : (cliPort || 3000);

  app.use(express.json({ limit: '50mb' }));

  if (!apiOnly) pullStateFromCloudFirestore(true).catch(() => {});
  if (apiOnly) {
    app.use(durableRequests(
      () => ({ auth: authStore.exportSnapshot(), state: cachedState }),
      (snapshot) => { authStore.importSnapshot(snapshot.auth); cachedState = snapshot.state; }
    ));
  }

  // Helper to resolve base URL for setup/reset password links
  const getRequestBaseUrl = (req: express.Request): string => {
    const origin = req.headers.origin;
    if (origin && typeof origin === 'string') return origin;
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || `localhost:${PORT}`;
    return `${proto}://${host}`;
  };

  const setSessionCookie = (res: express.Response, token: string) => {
    res.setHeader(
      'Set-Cookie',
      `thcs_dt_session=${encodeURIComponent(token)}; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=86400`
    );
  };

  const clearSessionCookie = (res: express.Response) => {
    res.setHeader(
      'Set-Cookie',
      `thcs_dt_session=; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0`
    );
  };

  // --- AUTHENTICATION & ACCOUNT MANAGEMENT ENDPOINTS ---

  // 1. Login with Username/Email & Password (Bcrypt + Rate-limiting + Non-enumerating errors)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, password } = req.body || {};
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown';

      const result = await authStore.verifyLogin(String(identifier || ''), String(password || ''), ip);
      if (!result.ok) {
        res.status(result.status).json({ ok: false, error: result.error });
        return;
      }

      const sessionToken = authStore.createSession(result.account.id, req);
      setSessionCookie(res, sessionToken);

      if (cachedState) {
        cachedState.users = authStore.getSanitizedUsers();
        saveServerState(cachedState);
      }

      res.json({
        ok: true,
        token: sessionToken,
        user: sanitizeUserForClient(result.account),
        mustChangePassword: Boolean(result.account.mustChangePassword),
      });
    } catch (err) {
      console.error('Error in POST /api/auth/login:', err);
      res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi xử lý đăng nhập.' });
    }
  });

  // 2. Login via Google OAuth (verifies against member accounts on server)
  app.post('/api/auth/google', async (req, res) => {
    try {
      res.status(503).json({ ok: false, error: 'Đăng nhập Google chưa được cấu hình xác minh trên máy chủ. Vui lòng dùng tên đăng nhập và mật khẩu.' });
    } catch (err) {
      console.error('Error in POST /api/auth/google:', err);
      res.status(500).json({ ok: false, error: 'Lỗi xác thực tài khoản Google.' });
    }
  });

  // 3. Logout & invalidate server session
  app.post('/api/auth/logout', (req, res) => {
    const rawToken = authStore.extractRawTokenFromRequest(req);
    if (rawToken) {
      authStore.revokeSessionToken(rawToken);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // 4. Validate active session & fetch current user profile + permissions
  app.get('/api/auth/me', (req, res) => {
    const account = authStore.getAuthenticatedAccount(req);
    if (!account) {
      res.status(401).json({ ok: false, authenticated: false, error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
      return;
    }
    res.json({
      ok: true,
      authenticated: true,
      user: sanitizeUserForClient(account),
      mustChangePassword: Boolean(account.mustChangePassword),
      smtpConfigured: authStore.isSmtpConfigured(),
    });
  });

  // 5. Change own password (for logged-in users and mandatory first-login change)
  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const account = authStore.getAuthenticatedAccount(req);
      if (!account) {
        res.status(401).json({ ok: false, error: 'Vui lòng đăng nhập lại để đổi mật khẩu.' });
        return;
      }
      const { currentPassword, newPassword } = req.body || {};
      const result = await authStore.changeOwnPassword(
        account,
        String(currentPassword || ''),
        String(newPassword || '')
      );
      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      // Keep current session alive, revoke other sessions
      const currentRawToken = authStore.extractRawTokenFromRequest(req);
      authStore.revokeAllUserSessions(account.id, currentRawToken || undefined);

      if (cachedState) {
        cachedState.users = authStore.getSanitizedUsers();
        saveServerState(cachedState);
      }

      res.json({
        ok: true,
        user: sanitizeUserForClient(result.account),
        message: 'Đã cập nhật mật khẩu mới thành công!',
      });
    } catch (err) {
      console.error('Error in POST /api/auth/change-password:', err);
      res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi đổi mật khẩu.' });
    }
  });

  // 6. Forgot password request (Non-enumerating response + time-limited single-use link)
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { identifier } = req.body || {};
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown';
      const ipCheck = authStore.checkIpRateLimit(ip);
      if (!ipCheck.allowed) {
        res.status(429).json({
          ok: false,
          error: `Vui lòng thử lại sau ${ipCheck.retryAfterMinutes} phút.`,
        });
        return;
      }

      const account = authStore.findAccountByIdentifier(String(identifier || ''));
      const baseUrl = getRequestBaseUrl(req);
      let previewResetLink: string | null = null;
      let sentViaSmtp = false;

      if (account && account.status !== 'inactive') {
        account.pendingResetRequestAt = new Date().toISOString();
        const { link, expiresAt } = authStore.createSingleUseToken(account, 'reset', baseUrl);
        const mailResult = await authStore.sendAuthLinkEmail({
          to: account.email,
          username: account.username,
          fullName: account.fullName,
          type: 'reset',
          link,
          expiresAt,
        });
        sentViaSmtp = mailResult.sentViaSmtp;
        if (!authStore.isSmtpConfigured()) {
          previewResetLink = link;
        }
        if (cachedState) {
          cachedState.users = authStore.getSanitizedUsers();
          saveServerState(cachedState);
        }
      } else {
        authStore.recordIpFailedAttempt(ip);
      }

      // Non-enumerating safe response message
      res.json({
        ok: true,
        smtpConfigured: authStore.isSmtpConfigured(),
        sentViaSmtp,
        previewResetLink,
        message:
          'Nếu thông tin tài khoản hợp lệ, yêu cầu đặt lại mật khẩu đã được ghi nhận và gửi liên kết đặt lại (hiệu lực 30 phút, chỉ dùng 1 lần).',
      });
    } catch (err) {
      console.error('Error in POST /api/auth/forgot-password:', err);
      res.status(500).json({ ok: false, error: 'Không thể xử lý yêu cầu lúc này.' });
    }
  });

  // 7. Verify single-use password setup / reset token
  app.get('/api/auth/verify-token', (req, res) => {
    const token = String(req.query.token || '');
    const result = authStore.verifyResetOrSetupToken(token);
    if (!result.ok) {
      res.status(400).json({ ok: false, valid: false, error: result.error });
      return;
    }
    res.json({
      ok: true,
      valid: true,
      tokenType: result.tokenType,
      username: result.account.username,
      fullName: result.account.fullName,
      email: result.account.email,
      expiresAt: result.account.resetTokenExpiresAt,
    });
  });

  // 8. Complete password setup / reset using single-use token
  app.post('/api/auth/complete-reset', async (req, res) => {
    try {
      const { token, newPassword } = req.body || {};
      const result = await authStore.consumeTokenAndSetPassword(
        String(token || ''),
        String(newPassword || '')
      );
      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      const sessionToken = authStore.createSession(result.account.id, req);
      setSessionCookie(res, sessionToken);

      if (cachedState) {
        cachedState.users = authStore.getSanitizedUsers();
        saveServerState(cachedState);
      }

      res.json({
        ok: true,
        token: sessionToken,
        user: sanitizeUserForClient(result.account),
        message: 'Thiết lập mật khẩu thành công! Bạn đã được đăng nhập vào hệ thống.',
      });
    } catch (err) {
      console.error('Error in POST /api/auth/complete-reset:', err);
      res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi đặt lại mật khẩu.' });
    }
  });

  // --- ADMIN ACCOUNT MANAGEMENT ENDPOINTS (Server-side RBAC enforced) ---

  app.get('/api/users', (req, res) => {
    const actor = authStore.getAuthenticatedAccount(req);
    if (!actor) {
      res.status(401).json({ ok: false, error: 'Vui lòng đăng nhập để tiếp tục.' });
      return;
    }
    res.json({
      ok: true,
      users: authStore.getSanitizedUsers(),
      smtpConfigured: authStore.isSmtpConfigured(),
      outbox: authStore.hasServerPermission(actor, 'admin_only') ? authStore.getOutbox().slice(0, 30) : [],
    });
  });

  app.post('/api/users', async (req, res) => {
    try {
      const actor = authStore.getAuthenticatedAccount(req);
      if (!authStore.hasServerPermission(actor, 'admin_only')) {
        res.status(403).json({
          ok: false,
          error: 'Từ chối truy cập: Chỉ Quản trị viên mới có quyền tạo tài khoản thành viên.',
        });
        return;
      }

      const {
        username,
        fullName,
        email,
        phone,
        title,
        department,
        role,
        permissions,
        setupMode,
        tempPassword,
      } = req.body || {};

      const result = await authStore.createMemberAccount({
        username: String(username || ''),
        fullName: String(fullName || ''),
        email: String(email || ''),
        phone: String(phone || ''),
        title: String(title || ''),
        department: String(department || ''),
        role: role || 'medic',
        permissions,
        setupMode: setupMode === 'temp_password' ? 'temp_password' : 'link',
        tempPassword: tempPassword ? String(tempPassword) : undefined,
        baseUrl: getRequestBaseUrl(req),
      });

      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      if (cachedState) {
        cachedState.users = authStore.getSanitizedUsers();
        saveServerState(cachedState);
        pushStateToCloudFirestore(cachedState, false).catch(() => {});
      }

      res.json({
        ok: true,
        user: result.user,
        users: authStore.getSanitizedUsers(),
        setupLink: result.setupLink,
        expiresAt: result.expiresAt,
        sentViaSmtp: result.sentViaSmtp,
        smtpConfigured: authStore.isSmtpConfigured(),
      });
    } catch (err) {
      console.error('Error in POST /api/users:', err);
      res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi tạo tài khoản.' });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    try {
      const actor = authStore.getAuthenticatedAccount(req);
      if (!authStore.hasServerPermission(actor, 'admin_only')) {
        res.status(403).json({
          ok: false,
          error: 'Từ chối truy cập: Chỉ Quản trị viên mới có quyền cập nhật phân quyền tài khoản.',
        });
        return;
      }

      const targetId = req.params.id;
      const result = authStore.updateMemberAccount(targetId, req.body || {});
      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      if (cachedState) {
        cachedState.users = authStore.getSanitizedUsers();
        saveServerState(cachedState);
        pushStateToCloudFirestore(cachedState, false).catch(() => {});
      }

      res.json({
        ok: true,
        user: result.user,
        users: authStore.getSanitizedUsers(),
      });
    } catch (err) {
      console.error('Error in PUT /api/users/:id:', err);
      res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi cập nhật tài khoản.' });
    }
  });

  app.post('/api/users/:id/toggle-lock', (req, res) => {
    try {
      const actor = authStore.getAuthenticatedAccount(req);
      if (!actor || !authStore.hasServerPermission(actor, 'admin_only')) {
        res.status(403).json({
          ok: false,
          error: 'Từ chối truy cập: Chỉ Quản trị viên mới có quyền khóa/mở khóa tài khoản.',
        });
        return;
      }

      const targetId = req.params.id;
      const { lock } = req.body || {};
      const result = authStore.toggleLockAccount(
        targetId,
        actor.id,
        typeof lock === 'boolean' ? lock : undefined
      );
      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      if (cachedState) {
        cachedState.users = authStore.getSanitizedUsers();
        saveServerState(cachedState);
        pushStateToCloudFirestore(cachedState, false).catch(() => {});
      }

      res.json({
        ok: true,
        user: result.user,
        users: authStore.getSanitizedUsers(),
      });
    } catch (err) {
      console.error('Error in POST /api/users/:id/toggle-lock:', err);
      res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi khóa/mở khóa tài khoản.' });
    }
  });

  app.post('/api/users/:id/reset-password', async (req, res) => {
    try {
      const actor = authStore.getAuthenticatedAccount(req);
      if (!actor || !authStore.hasServerPermission(actor, 'admin_only')) {
        res.status(403).json({
          ok: false,
          error: 'Từ chối truy cập: Chỉ Quản trị viên mới có quyền đặt lại mật khẩu thành viên.',
        });
        return;
      }

      const targetId = req.params.id;
      const { mode, tempPassword } = req.body || {};
      const result = await authStore.adminResetPassword({
        targetId,
        mode: mode === 'temp_password' ? 'temp_password' : 'link',
        tempPassword: tempPassword ? String(tempPassword) : undefined,
        baseUrl: getRequestBaseUrl(req),
      });

      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      if (cachedState) {
        cachedState.users = authStore.getSanitizedUsers();
        saveServerState(cachedState);
      }

      res.json({
        ok: true,
        user: result.user,
        users: authStore.getSanitizedUsers(),
        resetLink: result.resetLink,
        expiresAt: result.expiresAt,
        sentViaSmtp: result.sentViaSmtp,
        smtpConfigured: authStore.isSmtpConfigured(),
      });
    } catch (err) {
      console.error('Error in POST /api/users/:id/reset-password:', err);
      res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi đặt lại mật khẩu.' });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    try {
      const actor = authStore.getAuthenticatedAccount(req);
      if (!actor || !authStore.hasServerPermission(actor, 'admin_only')) {
        res.status(403).json({
          ok: false,
          error: 'Từ chối truy cập: Chỉ Quản trị viên mới có quyền xóa tài khoản.',
        });
        return;
      }

      const targetId = req.params.id;
      const result = authStore.deleteMemberAccount(targetId, actor.id);
      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      if (cachedState) {
        cachedState.users = authStore.getSanitizedUsers();
        saveServerState(cachedState);
        pushStateToCloudFirestore(cachedState, false).catch(() => {});
      }

      res.json({
        ok: true,
        users: authStore.getSanitizedUsers(),
      });
    } catch (err) {
      console.error('Error in DELETE /api/users/:id:', err);
      res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi xóa tài khoản.' });
    }
  });

  // School records require a valid server session on every read and write.
  app.use(['/api/school-state', '/api/staff-members', '/api/clinic-visit'], (req, res, next) => {
    if (!authStore.getAuthenticatedAccount(req)) {
      res.status(401).json({ ok: false, error: 'Vui lòng đăng nhập để truy cập dữ liệu.' });
      return;
    }
    next();
  });

  // Lightweight health & revision check for multi-computer real-time sync
  app.get('/api/health', async (_req, res) => {
    if (!cachedState) {
      cachedState = loadServerState();
    }
    res.json({
      ok: true,
      hasData: Boolean(cachedState),
      revision: cachedState?.revision || 0,
      updatedAt: cachedState?.updatedAt || null,
      counts: {
        students: cachedState?.students?.length || 0,
        classes: cachedState?.classes?.length || 0,
        clinicVisits: cachedState?.clinicVisits?.length || 0,
        staffMembers: cachedState?.staffMembers?.length || 0,
        medicines: cachedState?.medicines?.length || 0,
        batches: cachedState?.batches?.length || 0,
        transactions: cachedState?.transactions?.length || 0,
      },
    });
  });

  // Get full shared school state for any computer opening the app link
  app.get('/api/school-state', async (_req, res) => {
    if (!cachedState) {
      cachedState = loadServerState();
    }
    await pullStateFromCloudFirestore(false);
    if (cachedState) {
      cachedState.users = authStore.getSanitizedUsers();
    }
    res.json({
      ok: true,
      hasData: Boolean(cachedState),
      state: cachedState,
    });
  });

  // Merge and save full or partial school state from a client computer (Enforces Server-Side RBAC)
  app.post('/api/school-state', async (req, res) => {
    try {
      const incomingRaw = req.body;
      if (!incomingRaw || typeof incomingRaw !== 'object') {
        res.status(400).json({ ok: false, error: 'Invalid payload' });
        return;
      }
      if (!cachedState) {
        cachedState = loadServerState();
      }

      // Server-side permission enforcement when session token is present
      const actor = authStore.getAuthenticatedAccount(req);
      const incoming = { ...incomingRaw };
      if (actor) {
        const canInventory =
          authStore.hasServerPermission(actor, 'canManageMedicine') ||
          authStore.hasServerPermission(actor, 'canManageTransactions') ||
          authStore.hasServerPermission(actor, 'canManageInventoryCheck');
        if (!canInventory && cachedState) {
          delete incoming.medicines;
          delete incoming.batches;
          delete incoming.transactions;
          delete incoming.supplies;
          delete incoming.suppliers;
          delete incoming.inventoryChecks;
          delete incoming.disposals;
          delete incoming.deletedTxIds;
          delete incoming.inventoryUpdatedAt;
        }
        if (!authStore.hasServerPermission(actor, 'canManageClinicVisits') && cachedState) {
          delete incoming.clinicVisits;
          delete incoming.usageRecords;
          delete incoming.deletedVisitIds;
        }
        if (!authStore.hasServerPermission(actor, 'canManageStudents') && cachedState) {
          delete incoming.students;
          delete incoming.healthProfiles;
          delete incoming.classes;
          delete incoming.healthEvents;
          delete incoming.healthCheckups;
          delete incoming.deletedStudentIds;
          delete incoming.deletedClassIds;
          delete incoming.deletedEventIds;
          delete incoming.deletedCheckupIds;
        }
        if (!authStore.hasServerPermission(actor, 'canManageSettings') && cachedState) {
          delete incoming.settings;
        }
      }

      cachedState = mergeSchoolState(cachedState, incoming);
      cachedState.users = authStore.getSanitizedUsers();
      saveServerState(cachedState);
      // Persist to Cloud Firestore in background so client receives an immediate response (<10ms)
      pushStateToCloudFirestore(cachedState, false).catch((err) => {
        console.warn('Background Cloud Firestore push notice:', err);
      });
      res.json({
        ok: true,
        revision: cachedState.revision,
        updatedAt: cachedState.updatedAt,
        counts: {
          students: cachedState.students?.length || 0,
          classes: cachedState.classes?.length || 0,
          clinicVisits: cachedState.clinicVisits?.length || 0,
          staffMembers: cachedState.staffMembers?.length || 0,
          batches: cachedState.batches?.length || 0,
          transactions: cachedState.transactions?.length || 0,
        },
      });
    } catch (err) {
      console.error('Error in POST /api/school-state:', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Dedicated instant endpoint for getting, adding, updating, importing, deleting staff members
  app.get('/api/staff-members', async (_req, res) => {
    if (!cachedState) {
      cachedState = loadServerState() || {};
    }
    await pullStateFromCloudFirestore(false);
    res.json({
      ok: true,
      count: cachedState?.staffMembers?.length || 0,
      staffUpdatedAt: cachedState?.staffUpdatedAt || null,
      staffMembers: cachedState?.staffMembers || [],
    });
  });

  app.post('/api/staff-members', async (req, res) => {
    try {
      const actor = authStore.getAuthenticatedAccount(req);
      if (
        actor &&
        !authStore.hasServerPermission(actor, 'canManageStudents') &&
        !authStore.hasServerPermission(actor, 'canManageClinicVisits') &&
        !authStore.hasServerPermission(actor, 'admin_only')
      ) {
        res.status(403).json({
          ok: false,
          error: 'Tài khoản của bạn không có quyền chỉnh sửa danh sách cán bộ/nhân viên.',
        });
        return;
      }
      const { action, staff, id, ids, staffMembers, replaceAll, oldIds } = req.body || {};
      if (!cachedState) {
        cachedState = loadServerState() || {};
      }
      await pullStateFromCloudFirestore(false);

      const deletedStaffIds = new Set(cachedState.deletedStaffIds || []);
      let staffList: any[] = Array.isArray(cachedState.staffMembers) ? [...cachedState.staffMembers] : [];

      if (action === 'delete' && id) {
        deletedStaffIds.add(id);
        staffList = staffList.filter((s) => s && s.id !== id);
      } else if (action === 'delete_multiple' && Array.isArray(ids)) {
        for (const targetId of ids) {
          if (targetId) deletedStaffIds.add(targetId);
        }
        const toDelete = new Set(ids);
        staffList = staffList.filter((s) => s && !toDelete.has(s.id));
      } else if (action === 'delete_all') {
        if (Array.isArray(oldIds)) {
          for (const targetId of oldIds) {
            if (targetId) deletedStaffIds.add(targetId);
          }
        }
        for (const s of staffList) {
          if (s?.id) deletedStaffIds.add(s.id);
        }
        staffList = [];
        cachedState.staffCleaned = true;
      } else if (action === 'add' && staff && staff.id) {
        deletedStaffIds.delete(staff.id);
        const idx = staffList.findIndex((s) => s && s.id === staff.id);
        if (idx !== -1) {
          staffList[idx] = { ...staffList[idx], ...staff };
        } else {
          staffList.push(staff);
        }
        cachedState.staffCleaned = false;
      } else if (action === 'update' && id) {
        const idx = staffList.findIndex((s) => s && s.id === id);
        if (idx !== -1) {
          staffList[idx] = { ...staffList[idx], ...(req.body.updates || staff || {}) };
        }
      } else if (action === 'import' && Array.isArray(staffMembers)) {
        cachedState.staffCleaned = false;
        if (replaceAll) {
          staffList = staffMembers;
        } else {
          staffList = mergeById(staffList, staffMembers, deletedStaffIds);
        }
      }

      cachedState.staffMembers = staffList;
      cachedState.deletedStaffIds = Array.from(deletedStaffIds);
      cachedState.staffUpdatedAt = Date.now();
      cachedState.revision = (Number(cachedState.revision) || 1) + 1;
      cachedState.updatedAt = new Date().toISOString();

      saveServerState(cachedState);
      pushStateToCloudFirestore(cachedState, false).catch((err) => {
        console.warn('Background Cloud Firestore push for staff notice:', err);
      });

      res.json({
        ok: true,
        count: cachedState.staffMembers.length,
        staffUpdatedAt: cachedState.staffUpdatedAt,
        staffMembers: cachedState.staffMembers,
      });
    } catch (err) {
      console.error('Error in POST /api/staff-members:', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Dedicated instant endpoint for saving/updating/deleting a clinic visit + deducted stock
  app.post('/api/clinic-visit', async (req, res) => {
    try {
      const actor = authStore.getAuthenticatedAccount(req);
      if (actor && !authStore.hasServerPermission(actor, 'canManageClinicVisits')) {
        res.status(403).json({
          ok: false,
          error: 'Tài khoản của bạn không có quyền thao tác với Sổ tiếp nhận khám & cấp thuốc.',
        });
        return;
      }
      const { action, visit, visitId, batches, medicines, transactions, supplies, healthProfile } = req.body || {};
      if (!cachedState) {
        cachedState = loadServerState() || {};
      }
      await pullStateFromCloudFirestore(false);

      const deletedVisitIds = new Set(cachedState.deletedVisitIds || []);
      let visits = Array.isArray(cachedState.clinicVisits) ? [...cachedState.clinicVisits] : [];

      if (action === 'delete' && visitId) {
        deletedVisitIds.add(visitId);
        visits = visits.filter((v) => v && v.id !== visitId);
      } else if (visit && visit.id) {
        deletedVisitIds.delete(visit.id);
        const idx = visits.findIndex((v) => v && v.id === visit.id);
        if (idx !== -1) {
          visits[idx] = { ...visits[idx], ...visit };
        } else {
          visits.unshift(visit);
        }
      }

      cachedState.clinicVisits = visits;
      cachedState.deletedVisitIds = Array.from(deletedVisitIds);

      if (Array.isArray(batches) && batches.length > 0) {
        cachedState.batches = batches;
      }
      if (Array.isArray(medicines) && medicines.length > 0) {
        cachedState.medicines = medicines;
      }
      if (Array.isArray(transactions)) {
        cachedState.transactions = mergeById(cachedState.transactions, transactions, new Set(cachedState.deletedTxIds || []));
      }
      if (Array.isArray(supplies) && supplies.length > 0) {
        cachedState.supplies = supplies;
      }
      if (healthProfile && healthProfile.id) {
        cachedState.healthProfiles = mergeById(cachedState.healthProfiles, [healthProfile], null);
      }

      const visitMs = visit?.createdAt ? new Date(visit.createdAt).getTime() : 0;
      cachedState.inventoryUpdatedAt =
        visitMs > 0 && !isNaN(visitMs)
          ? Math.max(Number(cachedState.inventoryUpdatedAt) || 0, visitMs)
          : Number(cachedState.inventoryUpdatedAt) || Date.now();
      cachedState.revision = (Number(cachedState.revision) || 0) + 1;
      cachedState.updatedAt = new Date().toISOString();

      saveServerState(cachedState);
      await pushStateToCloudFirestore(cachedState, false);
      res.json({
        ok: true,
        revision: cachedState.revision,
        updatedAt: cachedState.updatedAt,
        clinicVisitsCount: cachedState.clinicVisits.length,
      });
    } catch (err) {
      console.error('Error in POST /api/clinic-visit:', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ ok: false, error: 'Endpoint API không tồn tại.' });
  });

  if (apiOnly) return app;

  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

async function startServer() {
  const app = await createApp();
  const PORT = Number(process.env.PORT) || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`School Health Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

if (!process.env.VERCEL && process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((error) => { console.error(error); process.exitCode = 1; });
}
