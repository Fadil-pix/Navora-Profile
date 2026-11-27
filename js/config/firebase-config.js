// ============================================================================
// Konfigurasi Firebase Navora Digital
// ============================================================================
// Cara menghubungkan ke Firebase:
// 1. Buka https://console.firebase.google.com/ dan buat project baru.
// 2. Aktifkan Firestore Database (pilih Start in test mode atau atur Rules).
// 3. Aktifkan Authentication -> Sign-in method -> Email/Password, lalu buat akun Admin.
// 4. Buka Project Settings -> Your apps -> Web app, salin firebaseConfig ke bawah ini.
// ============================================================================

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const APP_CONFIG = {
  brandName: "Navora Digital",
  defaultCardPrice: 25000, // Harga default cetak ID Card (Rp)
  currency: "IDR"
};

export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}
