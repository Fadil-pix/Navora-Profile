// ------------------------------------------------------
// Membaca parameter ?id= dari URL, mengambil data.json,
// lalu menampilkan kartu profil yang sesuai.
// ------------------------------------------------------

async function loadProfile() {
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id');

  const loadingEl = document.getElementById('state-loading');
  const cardEl = document.getElementById('state-card');
  const errorEl = document.getElementById('state-error');

  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Gagal memuat data.json');
    const data = await res.json();

    const id = rawId ? rawId.trim().toLowerCase() : null;
    const profile = id ? data[id] : null;

    loadingEl.classList.add('hidden');

    if (!profile) {
      errorEl.classList.remove('hidden');
      return;
    }

    renderProfile(profile, id);
    cardEl.classList.remove('hidden');

  } catch (err) {
    console.error(err);
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
  }
}

function renderProfile(p, id) {
  document.getElementById('id-badge').innerHTML = `ID<br>${id}`;

  const photo = document.getElementById('profile-photo');
  photo.src = p.foto || '';
  photo.alt = p.nama || 'Foto profil';

  // Nama: kata pertama normal, sisanya tebal — meniru gaya tipografi campuran pada referensi
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

  // Media sosial: auto-hide jika kosong / tidak ada di data.json
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
  // jika kosong, elemen tetap bersembunyi (class "hidden" bawaan di HTML)
}

document.addEventListener('DOMContentLoaded', loadProfile);
