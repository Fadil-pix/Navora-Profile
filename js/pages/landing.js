import {
  initBackend,
  slugify,
  checkSlugExists,
  saveClient,
  compressImage,
  getProfileUrl
} from '../services/db.js';

const form = document.getElementById('client-form');
const qrResult = document.getElementById('qr-result');
const demoBanner = document.getElementById('demo-banner');

const inputNama = document.getElementById('input-nama');
const inputJabatan = document.getElementById('input-jabatan');
const inputSlug = document.getElementById('input-slug');
const inputFoto = document.getElementById('input-foto');
const inputEmail = document.getElementById('input-email');
const inputWhatsapp = document.getElementById('input-whatsapp');
const inputInstagram = document.getElementById('input-instagram');
const inputTiktok = document.getElementById('input-tiktok');
const inputLinkedin = document.getElementById('input-linkedin');
const inputYoutube = document.getElementById('input-youtube');
const inputFacebook = document.getElementById('input-facebook');

const prevNama = document.getElementById('prev-nama');
const prevJabatan = document.getElementById('prev-jabatan');
const prevFoto = document.getElementById('prev-foto');
const prevEmail = document.getElementById('prev-email');
const prevId = document.getElementById('prev-id');
const slugPreview = document.getElementById('slug-preview');
const slugStatus = document.getElementById('slug-status');
const photoFilename = document.getElementById('photo-filename');
const formError = document.getElementById('form-error');
const btnSubmit = document.getElementById('btn-submit');
const btnSubmitText = document.getElementById('btn-submit-text');

let slugManuallyEdited = false;
let uploadedPhotoDataUrl = '';
let slugTimer = null;

async function boot() {
  const { isFirebase } = await initBackend();
  if (!isFirebase) {
    demoBanner.classList.remove('hidden');
  }
}

function updateLivePreview() {
  const nama = inputNama.value.trim() || 'Nama Anda';
  const parts = nama.split(' ');
  if (parts.length > 1) {
    prevNama.innerHTML = `<span class="font-500">${parts[0]}</span> <span class="font-700">${parts.slice(1).join(' ')}</span>`;
  } else {
    prevNama.innerHTML = `<span class="font-700">${nama}</span>`;
  }

  prevJabatan.textContent = inputJabatan.value.trim() || 'Jabatan / Profesi';
  prevEmail.textContent = inputEmail.value.trim() || 'email@anda.com';

  const slug = slugify(inputSlug.value || inputNama.value);
  prevId.textContent = `ID: ${slug}`;
  slugPreview.textContent = `profil.html?id=${slug}`;
}

inputNama.addEventListener('input', () => {
  if (!slugManuallyEdited) {
    inputSlug.value = inputNama.value ? slugify(inputNama.value) : '';
    scheduleSlugCheck();
  }
  updateLivePreview();
});

inputSlug.addEventListener('input', () => {
  slugManuallyEdited = true;
  inputSlug.value = slugify(inputSlug.value);
  updateLivePreview();
  scheduleSlugCheck();
});

[inputJabatan, inputEmail].forEach((el) => el.addEventListener('input', updateLivePreview));

function scheduleSlugCheck() {
  clearTimeout(slugTimer);
  const val = slugify(inputSlug.value);
  if (!inputSlug.value.trim()) {
    slugStatus.textContent = '';
    return;
  }
  slugStatus.textContent = 'cek...';
  slugStatus.className = 'absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-700 text-[var(--ink-soft)]';
  slugTimer = setTimeout(async () => {
    try {
      const exists = await checkSlugExists(val);
      if (exists) {
        slugStatus.textContent = 'TERPAKAI';
        slugStatus.className = 'absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-700 text-red-600';
      } else {
        slugStatus.textContent = 'TERSEDIA';
        slugStatus.className = 'absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-700 text-green-700';
      }
    } catch {
      slugStatus.textContent = '';
    }
  }, 350);
}

inputFoto.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  photoFilename.textContent = file.name;
  try {
    uploadedPhotoDataUrl = await compressImage(file, 480, 0.78);
    prevFoto.src = uploadedPhotoDataUrl;
  } catch (err) {
    console.error(err);
    showError('Gagal memproses foto. Silakan pilih file gambar lain.');
  }
});

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function hideError() {
  formError.classList.add('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const nama = inputNama.value.trim();
  const jabatan = inputJabatan.value.trim();
  let slug = slugify(inputSlug.value || nama);

  if (!nama || !jabatan) {
    showError('Nama lengkap dan jabatan wajib diisi.');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmitText.textContent = 'Menyimpan & Membuat QR Code...';

  try {
    const exists = await checkSlugExists(slug);
    if (exists) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }

    const saved = await saveClient(slug, {
      nama,
      jabatan,
      foto: uploadedPhotoDataUrl || 'assets/img/man.jpg',
      email: inputEmail.value.trim(),
      whatsapp: inputWhatsapp.value.trim(),
      instagram: inputInstagram.value.trim(),
      tiktok: inputTiktok.value.trim(),
      linkedin: inputLinkedin.value.trim(),
      youtube: inputYoutube.value.trim(),
      facebook: inputFacebook.value.trim(),
      status: 'pending_print',
      paymentStatus: 'unpaid',
      adminRead: false
    }, { isNew: true });

    renderQrResult(saved.id);
  } catch (err) {
    console.error(err);
    showError('Terjadi kesalahan saat menyimpan data: ' + (err.message || err));
  } finally {
    btnSubmit.disabled = false;
    btnSubmitText.textContent = 'Buat Halaman Profil & QR Code';
  }
});

function renderQrResult(id) {
  const profileUrl = getProfileUrl(id);
  const qrContainer = document.getElementById('qr-container');
  qrContainer.innerHTML = '';

  /* global QRCode */
  new QRCode(qrContainer, {
    text: profileUrl,
    width: 190,
    height: 190,
    colorDark: '#15130F',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H
  });

  document.getElementById('qr-id-label').textContent = `ID: ${id}`;
  document.getElementById('result-url').value = profileUrl;
  document.getElementById('btn-open-profile').href = profileUrl;

  form.classList.add('hidden');
  qrResult.classList.remove('hidden');
  qrResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('btn-copy-url').addEventListener('click', async () => {
  const urlInput = document.getElementById('result-url');
  try {
    await navigator.clipboard.writeText(urlInput.value);
    const btn = document.getElementById('btn-copy-url');
    btn.textContent = 'Tersalin!';
    setTimeout(() => (btn.textContent = 'Salin'), 1800);
  } catch {
    urlInput.select();
    document.execCommand('copy');
  }
});

document.getElementById('btn-download-qr').addEventListener('click', () => {
  const canvas = document.querySelector('#qr-container canvas');
  const img = document.querySelector('#qr-container img');
  const dataUrl = canvas ? canvas.toDataURL('image/png') : img?.src;
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `qr-${document.getElementById('qr-id-label').textContent.replace('ID: ', '')}.png`;
  a.click();
});

document.getElementById('btn-create-another').addEventListener('click', () => {
  form.reset();
  slugManuallyEdited = false;
  uploadedPhotoDataUrl = '';
  photoFilename.textContent = 'Pilih foto (JPG/PNG)...';
  prevFoto.src = 'assets/img/man.jpg';
  slugStatus.textContent = '';
  updateLivePreview();
  qrResult.classList.add('hidden');
  form.classList.remove('hidden');
});

boot();
