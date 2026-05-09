import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import './index.css';

// ================== ONE SIGNAL SETUP ==================
import OneSignal from '@onesignal/capacitor-plugin';

const initializeOneSignal = async () => {
  try {
    // ← GANTI DENGAN APP ID KAMU
    await OneSignal.initialize("f82bd795-4f0e-4adc-93d9-e8067943a8e8");

    OneSignal.Debug.setLogLevel(6);

    const hasPermission = await OneSignal.Notifications.requestPermission(true);
    console.log("OneSignal Permission:", hasPermission);

    // External User ID untuk admin
    await OneSignal.setExternalUserId("admin_nokz");

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