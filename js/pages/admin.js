import { APP_CONFIG, isFirebaseConfigured } from '../config/firebase-config.js';
import {
  initBackend,
  observeAdminAuth,
  loginAdmin,
  logoutAdmin,
  subscribeClients,
  saveClient,
  updateClientFields,
  deleteClient,
  compressImage,
  slugify,
  formatRupiah,
  getProfileUrl
} from '../services/db.js';

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

let allClients = [];
let currentFilter = 'all';
let searchQuery = '';
let unsubscribeClients = null;
let knownIds = new Set();
let isFirstSnapshot = true;
let activePrintClientId = null;

// ---- Auth & Boot ----

async function boot() {
  const { isFirebase } = await initBackend();
  if (!isFirebase) {
    document.getElementById('login-demo-note').classList.remove('hidden');
  }

  observeAdminAuth((user) => {
    if (user) {
      loginView.classList.add('hidden');
      dashboardView.classList.remove('hidden');
      document.getElementById('admin-email-label').textContent = user.email;
      const modeBadge = document.getElementById('db-mode-badge');
      modeBadge.textContent = isFirebaseConfigured() ? 'FIREBASE LIVE' : 'DEMO LOKAL';
      startRealtimeListener();
    } else {
      dashboardView.classList.add('hidden');
      loginView.classList.remove('hidden');
      if (unsubscribeClients) {
        unsubscribeClients();
        unsubscribeClients = null;
      }
      isFirstSnapshot = true;
      knownIds.clear();
    }
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    await loginAdmin(email, password);
  } catch (err) {
    loginError.textContent = err.message || 'Gagal login. Periksa email & kata sandi.';
    loginError.classList.remove('hidden');
  }
});

document.getElementById('btn-logout').addEventListener('click', () => logoutAdmin());

// ---- Real-time Firestore / Demo Listener ----

async function startRealtimeListener() {
  if (unsubscribeClients) return;
  unsubscribeClients = await subscribeClients((list) => {
    // Deteksi pelanggan baru yang baru sampai tahap QR Code
    if (!isFirstSnapshot) {
      for (const c of list) {
        if (!knownIds.has(c.id) && c.status === 'pending_print') {
          showToast(
            `Pesanan QR Baru: ${c.nama}`,
            `ID "${c.id}" siap dicetak & pembayaran.`
          );
          playNotificationBeep();
        }
      }
    }
    isFirstSnapshot = false;
    knownIds = new Set(list.map((c) => c.id));
    allClients = list;
    renderStats();
    renderNotifications();
    renderTable();
  });
}

function playNotificationBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // ignore audio block
  }
}

function showToast(title, body) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'cream-card rounded-2xl p-4 border-2 border-[var(--ink)] bg-[var(--lime)] rise flex items-start gap-3';
  el.innerHTML = `
    <span class="w-2.5 h-2.5 rounded-full bg-[var(--purple)] mt-1 shrink-0 animate-ping"></span>
    <div class="min-w-0 flex-1">
      <p class="font-display font-700 text-sm">${escapeHtml(title)}</p>
      <p class="text-xs text-[var(--ink-soft)] mt-0.5">${escapeHtml(body)}</p>
    </div>
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), 5500);
}

// ---- Stats & Notifications ----

function renderStats() {
  const total = allClients.length;
  const pending = allClients.filter((c) => c.status === 'pending_print').length;
  const unpaid = allClients.filter((c) => c.paymentStatus !== 'paid').length;
  const revenue = allClients
    .filter((c) => c.paymentStatus === 'paid')
    .reduce((sum, c) => sum + Number(c.paymentAmount || 0), 0);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-unpaid').textContent = unpaid;
  document.getElementById('stat-revenue').textContent = formatRupiah(revenue);
}

function renderNotifications() {
  const unread = allClients.filter((c) => !c.adminRead || c.status === 'pending_print');
  const badge = document.getElementById('notif-badge');
  const listEl = document.getElementById('notif-list');

  const unreadCount = allClients.filter((c) => c.adminRead === false).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  if (unread.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-[var(--ink-soft)] text-center py-4">Semua pesanan sudah diproses.</p>`;
    return;
  }

  listEl.innerHTML = unread
    .map(
      (c) => `
      <div class="rounded-xl bg-white p-3 border border-black/15 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="font-display font-700 text-xs truncate">${escapeHtml(c.nama)} <span class="font-mono text-[10px] text-[var(--purple)]">(${escapeHtml(c.id)})</span></p>
          <p class="text-[11px] text-[var(--ink-soft)]">QR Code siap, menunggu cetak</p>
        </div>
        <button data-action="print" data-id="${escapeHtml(c.id)}" class="btn-lime rounded-lg px-2.5 py-1.5 text-[11px] font-700 shrink-0">Cetak</button>
      </div>
    `
    )
    .join('');
}

document.getElementById('btn-notif').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('notif-drawer').classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  const drawer = document.getElementById('notif-drawer');
  if (!drawer.contains(e.target) && !e.target.closest('#btn-notif')) {
    drawer.classList.add('hidden');
  }
});

document.getElementById('btn-mark-all-read').addEventListener('click', async () => {
  const unread = allClients.filter((c) => c.adminRead === false);
  await Promise.all(unread.map((c) => updateClientFields(c.id, { adminRead: true })));
});

// ---- Table & Filtering ----

document.getElementById('filter-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach((b) => {
    b.className = 'filter-btn rounded-xl px-3.5 py-2 text-xs font-700 font-display bg-black/5 hover:bg-black/10';
  });
  btn.className = 'filter-btn active-filter rounded-xl px-3.5 py-2 text-xs font-700 font-display bg-[var(--ink)] text-[var(--lime)]';
  renderTable();
});

document.getElementById('search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderTable();
});

function renderTable() {
  const tbody = document.getElementById('clients-tbody');
  const filtered = allClients.filter((c) => {
    if (currentFilter !== 'all' && c.status !== currentFilter) return false;
    if (searchQuery) {
      const hay = `${c.id} ${c.nama} ${c.jabatan} ${c.email} ${c.whatsapp}`.toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-xs text-[var(--ink-soft)] font-mono">Tidak ada data pelanggan yang cocok.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((c) => {
      const statusPill = getStatusPill(c.status);
      const payPill =
        c.paymentStatus === 'paid'
          ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-700 bg-green-100 text-green-800 border border-green-300">Lunas · ${formatRupiah(c.paymentAmount)}</span>`
          : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-700 bg-amber-100 text-amber-900 border border-amber-300">Belum Bayar</span>`;

      return `
        <tr class="hover:bg-black/[0.02] transition">
          <td class="py-3.5 pr-4">
            <div class="flex items-center gap-3">
              <img src="${escapeHtml(c.foto || 'assets/img/man.jpg')}" alt="" class="w-11 h-11 rounded-xl object-cover border border-black/20 bg-[var(--lime)] shrink-0">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="font-display font-700 text-sm truncate">${escapeHtml(c.nama)}</p>
                  ${c.adminRead === false ? '<span class="w-2 h-2 rounded-full bg-[var(--purple)]" title="Pesanan Baru"></span>' : ''}
                </div>
                <p class="text-xs text-[var(--ink-soft)] truncate">${escapeHtml(c.jabatan)}</p>
                <p class="font-mono text-[10px] text-[var(--purple)]">ID: ${escapeHtml(c.id)}</p>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-3 text-xs">
            <p class="truncate max-w-[160px]">${escapeHtml(c.email || '-')}</p>
            <p class="font-mono text-[11px] text-[var(--ink-soft)]">${escapeHtml(c.whatsapp || '-')}</p>
          </td>
          <td class="py-3.5 px-3">${statusPill}</td>
          <td class="py-3.5 px-3">${payPill}</td>
          <td class="py-3.5 pl-3 text-right whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5">
              <button data-action="print" data-id="${escapeHtml(c.id)}" class="btn-lime rounded-lg px-2.5 py-1.5 text-[11px] font-700">Cetak ID</button>
              <button data-action="pay" data-id="${escapeHtml(c.id)}" class="btn-ink rounded-lg px-2.5 py-1.5 text-[11px] font-700">Bayar</button>
              <a href="${escapeHtml(getProfileUrl(c.id))}" target="_blank" class="rounded-lg px-2.5 py-1.5 text-[11px] font-700 border border-black/20 hover:bg-black/5">Web</a>
              <button data-action="edit" data-id="${escapeHtml(c.id)}" class="rounded-lg px-2.5 py-1.5 text-[11px] font-700 border border-black/20 hover:bg-black/5">Edit</button>
              <button data-action="delete" data-id="${escapeHtml(c.id)}" class="rounded-lg px-2.5 py-1.5 text-[11px] font-700 text-red-700 border border-red-300 hover:bg-red-50">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function getStatusPill(status) {
  if (status === 'completed') {
    return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-700 bg-purple-100 text-purple-900 border border-purple-300">Selesai</span>`;
  }
  if (status === 'printed') {
    return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-700 bg-blue-100 text-blue-900 border border-blue-300">Sudah Dicetak</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-700 bg-[var(--lime)] text-[var(--ink)] border border-[var(--ink)]">Menunggu Cetak</span>`;
}

// Delegated table & notification actions
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const client = allClients.find((c) => c.id === id);
  if (!client) return;

  if (action === 'print') {
    openPrintModal(client);
    if (client.adminRead === false) {
      updateClientFields(id, { adminRead: true });
    }
  } else if (action === 'pay') {
    openPaymentModal(client);
  } else if (action === 'edit') {
    openClientModal(client);
  } else if (action === 'delete') {
    if (confirm(`Hapus data pelanggan "${client.nama}" (${client.id})?`)) {
      await deleteClient(id);
    }
  }
});

// ---- Modal Tambah / Edit ----

const clientModal = document.getElementById('client-modal');
const adminClientForm = document.getElementById('admin-client-form');

document.getElementById('btn-add-client').addEventListener('click', () => openClientModal(null));
document.getElementById('btn-close-client-modal').addEventListener('click', () => clientModal.classList.add('hidden'));
document.getElementById('btn-cancel-client-modal').addEventListener('click', () => clientModal.classList.add('hidden'));

function openClientModal(client) {
  adminClientForm.reset();
  const isEdit = Boolean(client);
  document.getElementById('edit-mode').value = isEdit ? 'edit' : 'new';
  document.getElementById('modal-title').textContent = isEdit ? `Edit: ${client.nama}` : 'Tambah Pelanggan Baru';
  const slugInput = document.getElementById('m-slug');
  slugInput.readOnly = isEdit;

  if (isEdit) {
    document.getElementById('m-nama').value = client.nama || '';
    document.getElementById('m-jabatan').value = client.jabatan || '';
    slugInput.value = client.id;
    document.getElementById('m-foto-url').value = client.foto || '';
    document.getElementById('m-email').value = client.email || '';
    document.getElementById('m-whatsapp').value = client.whatsapp || '';
    document.getElementById('m-instagram').value = client.instagram || '';
    document.getElementById('m-tiktok').value = client.tiktok || '';
    document.getElementById('m-linkedin').value = client.linkedin || '';
    document.getElementById('m-youtube').value = client.youtube || '';
    document.getElementById('m-facebook').value = client.facebook || '';
  } else {
    document.getElementById('m-foto-url').value = 'assets/img/man.jpg';
  }
  clientModal.classList.remove('hidden');
}

document.getElementById('m-nama').addEventListener('input', (e) => {
  if (document.getElementById('edit-mode').value === 'new') {
    document.getElementById('m-slug').value = slugify(e.target.value);
  }
});

document.getElementById('m-foto-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  document.getElementById('m-foto-url').value = await compressImage(file, 480, 0.78);
});

adminClientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const isNew = document.getElementById('edit-mode').value === 'new';
  const id = slugify(document.getElementById('m-slug').value);
  const existing = allClients.find((c) => c.id === id);

  await saveClient(
    id,
    {
      nama: document.getElementById('m-nama').value,
      jabatan: document.getElementById('m-jabatan').value,
      foto: document.getElementById('m-foto-url').value || 'assets/img/man.jpg',
      email: document.getElementById('m-email').value,
      whatsapp: document.getElementById('m-whatsapp').value,
      instagram: document.getElementById('m-instagram').value,
      tiktok: document.getElementById('m-tiktok').value,
      linkedin: document.getElementById('m-linkedin').value,
      youtube: document.getElementById('m-youtube').value,
      facebook: document.getElementById('m-facebook').value,
      status: existing?.status || 'pending_print',
      paymentStatus: existing?.paymentStatus || 'unpaid',
      paymentAmount: existing?.paymentAmount ?? APP_CONFIG.defaultCardPrice,
      paymentMethod: existing?.paymentMethod || '',
      adminRead: true
    },
    { isNew }
  );

  clientModal.classList.add('hidden');
});

// ---- Modal Pembayaran ----

const paymentModal = document.getElementById('payment-modal');
document.getElementById('btn-close-payment').addEventListener('click', () => paymentModal.classList.add('hidden'));
document.getElementById('btn-cancel-payment').addEventListener('click', () => paymentModal.classList.add('hidden'));

function openPaymentModal(client) {
  document.getElementById('pay-client-id').value = client.id;
  document.getElementById('pay-client-name').textContent = `${client.nama} (${client.id})`;
  document.getElementById('pay-amount').value = client.paymentAmount || APP_CONFIG.defaultCardPrice;
  document.getElementById('pay-method').value = client.paymentMethod || 'Tunai';
  paymentModal.classList.remove('hidden');
}

document.getElementById('payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('pay-client-id').value;
  await updateClientFields(id, {
    paymentStatus: 'paid',
    paymentAmount: Number(document.getElementById('pay-amount').value || 0),
    paymentMethod: document.getElementById('pay-method').value,
    status: document.getElementById('pay-status-next').value,
    paidAt: new Date().toISOString(),
    adminRead: true
  });
  paymentModal.classList.add('hidden');
});

// ---- Modal Cetak ID Card ----

const printModal = document.getElementById('print-modal');
document.getElementById('btn-close-print').addEventListener('click', () => printModal.classList.add('hidden'));

function openPrintModal(client) {
  activePrintClientId = client.id;
  document.getElementById('print-id-tag').textContent = `ID: ${client.id}`;
  document.getElementById('print-photo').src = client.foto || 'assets/img/man.jpg';
  document.getElementById('print-name').textContent = client.nama || '-';
  document.getElementById('print-jabatan').textContent = client.jabatan || '-';
  document.getElementById('print-contact-info').textContent = client.email || client.whatsapp || client.id;

  const qrBox = document.getElementById('print-qr-box');
  qrBox.innerHTML = '';
  /* global QRCode */
  new QRCode(qrBox, {
    text: getProfileUrl(client.id),
    width: 78,
    height: 78,
    colorDark: '#15130F',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M
  });

  printModal.classList.remove('hidden');
}

document.getElementById('btn-do-print').addEventListener('click', () => {
  window.print();
});

document.getElementById('btn-mark-printed').addEventListener('click', async () => {
  if (!activePrintClientId) return;
  await updateClientFields(activePrintClientId, {
    status: 'printed',
    printedAt: new Date().toISOString(),
    adminRead: true
  });
  printModal.classList.add('hidden');
});

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  clientModal?.classList.add('hidden');
  paymentModal?.classList.add('hidden');
  printModal?.classList.add('hidden');
  document.getElementById('notif-drawer')?.classList.add('hidden');
});

boot();
