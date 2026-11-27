// ============================================================================
// Konfigurasi Firebase Navora Digital
// ============================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAFXqnWGUdOBzHtRyvISywEgGqijNzEluk",
  authDomain: "navora-54d04.firebaseapp.com",
  projectId: "navora-54d04",
  storageBucket: "navora-54d04.firebasestorage.app",
  messagingSenderId: "929804536775",
  appId: "1:929804536775:web:fff4df49e0c25d7f2727e2"
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
