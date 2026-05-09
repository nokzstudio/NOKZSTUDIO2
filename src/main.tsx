import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import './index.css';

// ================== ONE SIGNAL SETUP ==================
import OneSignal from '@onesignal/capacitor-plugin';

const initializeOneSignal = async () => {
  // Jangan jalankan di web/localhost
  if (Capacitor.getPlatform() === 'web') {
    console.log("⚠️ OneSignal dilewati di web");
    return;
  }

  try {
    await OneSignal.initialize(
      "f82bd795-4f0e-4adc-93d9-e8067943a8e8"
    );

    OneSignal.Debug.setLogLevel(6);

    const hasPermission =
      await OneSignal.Notifications.requestPermission(true);

    console.log("OneSignal Permission:", hasPermission);

    await OneSignal.login("admin_nokz");

    console.log("✅ OneSignal berhasil diinisialisasi");
  } catch (error) {
    console.error("❌ OneSignal error:", error);
  }
};

initializeOneSignal();
// =====================================================

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);