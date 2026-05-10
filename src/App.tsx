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

  // 🚨 hanya jalan di APK (Android/iOS)
  if (!Capacitor.isNativePlatform()) {
    console.log("⚠️ OneSignal dilewati di web");
    return;
  }

  try {
    OneSignal.initialize("f82bd795-4f0e-4adc-93d9-e8067943a8e8");

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

    return () => {
      OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
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
              <Route path="/" element={<HomeContent />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/order/:type" element={<OrderPage />} />
            </Routes>
          </AnimatePresence>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
}