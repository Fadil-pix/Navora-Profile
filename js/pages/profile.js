import { getClientById, getProfileUrl } from '../services/db.js';

let currentProfile = null;
let currentId = null;

async function loadProfile() {
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id');

  const loadingEl = document.getElementById('state-loading');
  const cardEl = document.getElementById('state-card');
  const errorEl = document.getElementById('state-error');

  try {
    const id = rawId ? rawId.trim().toLowerCase() : null;
    const profile = id ? await getClientById(id) : null;

    loadingEl.classList.add('hidden');

    if (!profile) {
      errorEl.classList.remove('hidden');
      return;
    }

    currentProfile = profile;
    currentId = id;
    renderProfile(profile, id);
    cardEl.classList.remove('hidden');
    document.getElementById('btn-show-qr')?.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
  }
}

function renderProfile(p, id) {
  document.title = `${p.nama || id} — Navora Digital`;
  document.getElementById('id-badge').innerHTML = `ID<br>${id}`;

  const photo = document.getElementById('profile-photo');
  photo.src = p.foto || 'assets/img/man.jpg';
  photo.alt = p.nama || 'Foto profil';

  const nameEl = document.getElementById('profile-name');
  const nama = p.nama || '-';
  const parts = nama.split(' ');
  if (parts.length > 1) {
    const first = parts[0];
    const rest = parts.slice(1).join(' ');
    nameEl.innerHTML = `<span class="font-500">${first}</span> <span class="font-700">${rest}</span>`;
  } else {
    nameEl.innerHTML = `<span class="font-700">${nama}</span>`;
  }

  const jabatanEl = document.getElementById('profile-jabatan');
  if (p.jabatan) {
    jabatanEl.textContent = p.jabatan;
    jabatanEl.classList.remove('hidden');
  }

  if (p.email) {
    document.getElementById('link-email').href = `mailto:${p.email}`;
    document.getElementById('text-email').textContent = p.email;
  } else {
    document.getElementById('link-email').classList.add('hidden');
  }

  if (p.whatsapp) {
    document.getElementById('link-whatsapp').href = `https://wa.me/${p.whatsapp}`;
  } else {
    document.getElementById('link-whatsapp').classList.add('hidden');
  }

  setSocialLink('instagram', p.instagram);
  setSocialLink('tiktok', p.tiktok);
  setSocialLink('facebook', p.facebook);
  setSocialLink('youtube', p.youtube);
  setSocialLink('linkedin', p.linkedin);
}

function setSocialLink(key, url) {
  const el = document.getElementById(`social-${key}`);
  if (!el) return;
  if (url && url.trim() !== '') {
    el.href = url;
    el.classList.remove('hidden');
  }
}

// ---- QR Modal ----
const qrModal = document.getElementById('qr-modal');
document.getElementById('btn-show-qr')?.addEventListener('click', () => {
  if (!currentId) return;
  const box = document.getElementById('profile-qr-box');
  box.innerHTML = '';
  /* global QRCode */
  new QRCode(box, {
    text: getProfileUrl(currentId),
    width: 180,
    height: 180,
    colorDark: '#15130F',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H
  });
  document.getElementById('qr-modal-name').textContent = currentProfile?.nama || currentId;
  document.getElementById('qr-modal-id').textContent = `ID: ${currentId}`;
  qrModal.classList.remove('hidden');
});

document.getElementById('btn-close-qr')?.addEventListener('click', () => {
  qrModal.classList.add('hidden');
});

qrModal?.addEventListener('click', (e) => {
  if (e.target === qrModal) qrModal.classList.add('hidden');
});

document.getElementById('btn-dl-profile-qr')?.addEventListener('click', () => {
  const canvas = document.querySelector('#profile-qr-box canvas');
  const img = document.querySelector('#profile-qr-box img');
  const dataUrl = canvas ? canvas.toDataURL('image/png') : img?.src;
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `qr-${currentId}.png`;
  a.click();
});

// ---- Simpan vCard (.vcf) ----
document.getElementById('btn-save-vcard')?.addEventListener('click', () => {
  if (!currentProfile) return;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${currentProfile.nama || ''}`,
    `TITLE:${currentProfile.jabatan || ''}`,
    currentProfile.email ? `EMAIL:${currentProfile.email}` : '',
    currentProfile.whatsapp ? `TEL;TYPE=CELL:+${currentProfile.whatsapp}` : '',
    `URL:${getProfileUrl(currentId)}`,
    'END:VCARD'
  ].filter(Boolean);

  const blob = new Blob([lines.join('\n')], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentId}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
});

document.addEventListener('DOMContentLoaded', loadProfile);
