/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import OneSignal from '@onesignal/capacitor-plugin';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Portfolio from './components/Portfolio';
import Contact from './components/Contact';
import CustomCursor from './components/CustomCursor';
import LoadingScreen from './components/LoadingScreen';
import { Capacitor } from '@capacitor/core';
import { db } from './lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import Admin from './components/Admin';
import Login from './components/Login';
import OrderPage from './components/OrderPage';
import ErrorBoundary from './components/ErrorBoundary';

import { trackVisit } from './services/analyticsService';

function HomeContent() {
  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="no-cursor min-h-screen"
    >
      <CustomCursor />
      <Navbar />
      
      <main className="pb-20">
        <Hero />
        <div className="px-4 space-y-16">
          <About />
          <Portfolio />
          <Contact />
        </div>
      </main>
      
      <footer className="py-20 px-6 border-t border-base-content/5 bg-surface/50 backdrop-blur-md pb-40">
        <div className="max-w-2xl mx-auto flex flex-col justify-center items-center">
          <div className="font-display font-extrabold text-2xl tracking-tighter">
            NOKZ<span className="text-primary">.</span>STUDIO
          </div>
          
          <div className="mt-4 text-[10px] text-base-content/40 text-center uppercase tracking-widest font-black leading-loose">
            Copyright © {new Date().getFullYear()} NokzStudio.
            <span className="block mt-2 font-mono text-[8px] opacity-50">
              Designed with passion from Sragen, Indonesia
            </span>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("adminLoggedIn") === "true"
  );

  const handleLogin = (username: string, password: string) => {
    if (username === "NokzAdm" && password === "AdminNokz") {
      localStorage.setItem("adminLoggedIn", "true");
      setIsLoggedIn(true);
    } else {
      alert("Username atau password salah");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    setIsLoggedIn(false);
    navigate("/");
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <motion.div
      key="admin"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Admin onBack={handleLogout} />
    </motion.div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
useEffect(() => {
  trackVisit();
}, []);
  // =========================
  // ONESIGNAL INITIALIZATION
  // =========================
 useEffect(() => {
  const platform = Capacitor.getPlatform();
  console.log("Current Platform:", platform);

  // Jika platform bukan android atau ios, berarti di web
  if (platform === 'web') {
    console.log("⚠️ OneSignal dilewati di browser/web");
    return;
  }

  try {
    console.log("🚀 Inisialisasi OneSignal...");
    OneSignal.initialize("f82bd795-4f0e-4adc-93d9-e8067943a8e8");

    // Daftarkan perangkat ini sebagai admin agar bisa menerima notifikasi pesanan
    OneSignal.login("admin_nokz");

    OneSignal.Notifications.requestPermission(true)
      .then((accepted: boolean) => {
        console.log("✅ Izin notifikasi:", accepted ? "Diterima" : "Ditolak");
      });

    const handleNotificationClick = (event: any) => {
      const data = event?.notification?.additionalData;

      if (data?.orderId || data?.screen === "admin") {
        window.location.href = "/admin";
      }
    };

    OneSignal.Notifications.addEventListener('click', handleNotificationClick);

    // ==========================================
    // PENGECEKAN ORDER BARU UNTUK NOTIFIKASI LOKAL
    // ==========================================
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    let isInitialLoad = true;
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const order = change.doc.data();

          // 1. Munculkan Alert di dalam aplikasi
          alert("🛒 ADA ORDER BARU!\nDari: " + (order.clientName || "Customer"));

          // 2. Kirim Notifikasi ke Status Bar via OneSignal API
          const ONESIGNAL_APP_ID = "f82bd795-4f0e-4adc-93d9-e8067943a8e8";
          const ONESIGNAL_REST_API_KEY = "tfe7wupbmebevcgztrobnhz7s";

          fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              included_segments: ["All Subscribed Users"],
              headings: { id: "🛒 ADA PESANAN BARU!", en: "New Order!" },
              contents: { id: `Order dari ${order.clientName || "Customer"} (${order.service?.toUpperCase()})`, en: "Check admin panel" },
              priority: 10,
              data: { screen: "admin" }
            })
          }).catch(e => console.log("Notif send error:", e));
        }
      });
    });

    return () => {
      OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
      unsubscribeOrders();
    };

  } catch (err) {
    console.log("OneSignal error (ignored):", err);
  }

}, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="relative min-h-screen selection:bg-primary/30">
          <ScrollToTop />
          <AnimatePresence mode="wait">
            <Routes>
              {/* Di versi APK, kita jadikan halaman Admin sebagai halaman utama */}
              <Route path="/" element={Capacitor.isNativePlatform() ? <AdminPage /> : <HomeContent />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/home" element={<HomeContent />} />
              <Route path="/order/:type" element={<OrderPage />} />
              <Route path="*" element={Capacitor.isNativePlatform() ? <AdminPage /> : <HomeContent />} />
            </Routes>
          </AnimatePresence>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
}