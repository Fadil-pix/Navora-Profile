// ============================================================================
// Data & Firebase Layer (Firestore + Auth) dengan fallback Demo Lokal
// ============================================================================
import { firebaseConfig, APP_CONFIG, isFirebaseConfigured } from '../config/firebase-config.js';

let app = null;
let db = null;
let auth = null;
let fsMod = null;
let authMod = null;
let initialized = false;

const LOCAL_KEY = 'navora_clients_db_v1';
const DEMO_ADMIN_KEY = 'navora_demo_admin_session';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('navora_sync') : null;

export async function initBackend() {
  if (initialized) return { isFirebase: isFirebaseConfigured() };

  if (isFirebaseConfigured()) {
    const [{ initializeApp }, firestore, authPkg] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    ]);
    app = initializeApp(firebaseConfig);
    db = firestore.getFirestore(app);
    auth = authPkg.getAuth(app);
    fsMod = firestore;
    authMod = authPkg;
  } else {
    await seedLocalFromDataJson();
  }

  initialized = true;
  return { isFirebase: isFirebaseConfigured() };
}

async function seedLocalFromDataJson() {
  if (localStorage.getItem(LOCAL_KEY)) return;
  try {
    const res = await fetch('data/data.json');
    if (!res.ok) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({}));
      return;
    }
    const raw = await res.json();
    const seeded = {};
    const now = new Date().toISOString();
    for (const [id, p] of Object.entries(raw)) {
      seeded[id] = {
        id,
        nama: p.nama || '',
        jabatan: p.jabatan || '',
        foto: p.foto || '',
        email: p.email || '',
        whatsapp: p.whatsapp || '',
        instagram: p.instagram || '',
        tiktok: p.tiktok || '',
        facebook: p.facebook || '',
        youtube: p.youtube || '',
        linkedin: p.linkedin || '',
        status: 'completed',
        paymentStatus: 'paid',
        paymentAmount: APP_CONFIG.defaultCardPrice,
        paymentMethod: 'Tunai',
        adminRead: true,
        createdAt: now,
        updatedAt: now
      };
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(seeded));
  } catch {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({}));
  }
}

function readLocalAll() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalAll(map) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  if (channel) channel.postMessage({ type: 'clients_updated', at: Date.now() });
}

// ---- Helpers ----

export function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `user-${Date.now().toString(36)}`;
}

export function normalizeWhatsapp(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

export function getProfileUrl(id) {
  const url = new URL('profil.html', window.location.href);
  url.searchParams.set('id', id);
  return url.toString();
}

export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(Number(amount || 0));
}

export function compressImage(file, maxSize = 480, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---- CRUD Pelanggan ----

export async function checkSlugExists(id) {
  await initBackend();
  const cleanId = slugify(id);
  if (isFirebaseConfigured()) {
    const snap = await fsMod.getDoc(fsMod.doc(db, 'clients', cleanId));
    return snap.exists();
  }
  const all = readLocalAll();
  return Boolean(all[cleanId]);
}

export async function getClientById(id) {
  await initBackend();
  const cleanId = (id || '').trim().toLowerCase();
  if (!cleanId) return null;

  if (isFirebaseConfigured()) {
    const snap = await fsMod.getDoc(fsMod.doc(db, 'clients', cleanId));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  } else {
    const all = readLocalAll();
    if (all[cleanId]) return all[cleanId];
  }

  // Fallback ke data.json untuk kompatibilitas profil bawaan
  try {
    const res = await fetch('data/data.json');
    if (res.ok) {
      const json = await res.json();
      if (json[cleanId]) return { id: cleanId, ...json[cleanId] };
    }
  } catch {
    // ignore
  }
  return null;
}

export async function saveClient(id, payload, { isNew = true } = {}) {
  await initBackend();
  const cleanId = slugify(id);
  const now = new Date().toISOString();

  const record = {
    id: cleanId,
    nama: (payload.nama || '').trim(),
    jabatan: (payload.jabatan || '').trim(),
    foto: payload.foto || 'assets/img/man.jpg',
    email: (payload.email || '').trim(),
    whatsapp: normalizeWhatsapp(payload.whatsapp),
    instagram: (payload.instagram || '').trim(),
    tiktok: (payload.tiktok || '').trim(),
    facebook: (payload.facebook || '').trim(),
    youtube: (payload.youtube || '').trim(),
    linkedin: (payload.linkedin || '').trim(),
    status: payload.status || 'pending_print',
    paymentStatus: payload.paymentStatus || 'unpaid',
    paymentAmount: Number(payload.paymentAmount ?? APP_CONFIG.defaultCardPrice),
    paymentMethod: payload.paymentMethod || '',
    adminRead: payload.adminRead ?? (isNew ? false : true),
    updatedAt: now
  };

  if (isNew) {
    record.createdAt = now;
    record.qrReadyAt = now;
  }

  if (isFirebaseConfigured()) {
    const ref = fsMod.doc(db, 'clients', cleanId);
    if (isNew) {
      await fsMod.setDoc(ref, {
        ...record,
        createdTimestamp: fsMod.serverTimestamp()
      });
    } else {
      await fsMod.updateDoc(ref, record);
    }
  } else {
    const all = readLocalAll();
    all[cleanId] = isNew ? record : { ...(all[cleanId] || {}), ...record };
    writeLocalAll(all);
  }

  return record;
}

export async function updateClientFields(id, fields) {
  await initBackend();
  const cleanId = (id || '').trim().toLowerCase();
  const patch = { ...fields, updatedAt: new Date().toISOString() };

  if (isFirebaseConfigured()) {
    await fsMod.updateDoc(fsMod.doc(db, 'clients', cleanId), patch);
  } else {
    const all = readLocalAll();
    if (all[cleanId]) {
      all[cleanId] = { ...all[cleanId], ...patch };
      writeLocalAll(all);
    }
  }
}

export async function deleteClient(id) {
  await initBackend();
  const cleanId = (id || '').trim().toLowerCase();
  if (isFirebaseConfigured()) {
    await fsMod.deleteDoc(fsMod.doc(db, 'clients', cleanId));
  } else {
    const all = readLocalAll();
    delete all[cleanId];
    writeLocalAll(all);
  }
}

export async function subscribeClients(callback) {
  await initBackend();

  if (isFirebaseConfigured()) {
    const q = fsMod.query(
      fsMod.collection(db, 'clients'),
      fsMod.orderBy('updatedAt', 'desc')
    );
    return fsMod.onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    });
  }

  // Mode Demo Lokal: emit awal + dengarkan BroadcastChannel & storage event
  const emit = () => {
    const all = readLocalAll();
    const list = Object.values(all).sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || '')
    );
    callback(list);
  };
  emit();

  const onStorage = (e) => {
    if (e.key === LOCAL_KEY) emit();
  };
  window.addEventListener('storage', onStorage);
  const onMsg = (e) => {
    if (e.data?.type === 'clients_updated') emit();
  };
  if (channel) channel.addEventListener('message', onMsg);

  return () => {
    window.removeEventListener('storage', onStorage);
    if (channel) channel.removeEventListener('message', onMsg);
  };
}

// ---- Auth Admin ----

export function observeAdminAuth(callback) {
  initBackend().then(({ isFirebase }) => {
    if (isFirebase) {
      authMod.onAuthStateChanged(auth, (user) => {
        callback(user ? { email: user.email, uid: user.uid, isDemo: false } : null);
      });
    } else {
      const saved = sessionStorage.getItem(DEMO_ADMIN_KEY);
      callback(saved ? JSON.parse(saved) : null);
    }
  });
}

export async function loginAdmin(email, password) {
  await initBackend();
  if (isFirebaseConfigured()) {
    const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
    return { email: cred.user.email, uid: cred.user.uid, isDemo: false };
  }
  // Demo mode: terima kredensial default atau apa saja yang tidak kosong
  if (!email || !password) throw new Error('Email dan kata sandi wajib diisi.');
  const user = { email, uid: 'demo-admin', isDemo: true };
  sessionStorage.setItem(DEMO_ADMIN_KEY, JSON.stringify(user));
  return user;
}

export async function logoutAdmin() {
  await initBackend();
  if (isFirebaseConfigured()) {
    await authMod.signOut(auth);
  } else {
    sessionStorage.removeItem(DEMO_ADMIN_KEY);
  }
}
