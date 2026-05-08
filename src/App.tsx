/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Portfolio from './components/Portfolio';
import Contact from './components/Contact';
import CustomCursor from './components/CustomCursor';
import LoadingScreen from './components/LoadingScreen';
import Admin from './components/Admin';
import Login from './components/Login';
import OrderPage from './components/OrderPage';
import ErrorBoundary from './components/ErrorBoundary';


import { trackVisit } from './services/analyticsService';

function HomeContent() {
  const navigate = useNavigate();
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
    if (username === "19" && password === "23") {
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

function AppContent() {
  const location = useLocation();
  const [loading, setLoading] = useState(() => {
    // Skip loading screen if we're going straight to an order page or admin
    return !location.pathname.startsWith('/order/') && location.pathname !== '/admin';
  });

  useEffect(() => {
    trackVisit();
  }, []);

  if (loading) {
    return <LoadingScreen onFinished={() => setLoading(false)} />;
  }

  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomeContent />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/order/:type" element={<OrderPage />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default function App() {

 useEffect(() => {
  console.log("OneSignal init mulai");

  OneSignal.init({
    appId: "f82bd795-4f0e-4adc-93d9-e8067943a8e8",
  });

  console.log("OneSignal initialized");
}, []);