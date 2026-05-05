import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, MousePointer2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { trackOrderClick } from '../services/analyticsService';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

export default function Hero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'), 
      where('status', 'in', ['Belum Dimulai', 'Dalam Antrian'])
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQueueCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, []);

  const queueStatus = queueCount <= 7 ? 'Antrian Tersedia' : 'Full Minggu Ini';
  const queueColor = queueCount <= 7 ? 'bg-green-500' : 'bg-red-500';

  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden px-6">
      {/* Animated Background Gradients */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <motion.div 
        style={{ y: y1, opacity }}
        className="relative z-10 text-center max-w-4xl -mt-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center px-4 py-2 rounded-full border border-base-content/10 bg-base-content/5 text-[10px] md:text-xs font-bold text-base-content/60 mb-6 backdrop-blur-sm gap-3"
        >
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full animate-ping", queueColor)} />
            <span className="uppercase tracking-widest">{queueStatus}</span>
          </div>
          <div className="w-[1px] h-3 bg-base-content/10" />
          <div className="flex items-center gap-2">
            <span className={cn("px-2 py-0.5 rounded text-[8px] uppercase font-black text-white", queueColor)}>
              Queue
            </span>
            <span className="opacity-40 font-mono text-xs text-base-content">{queueCount}</span>
          </div>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-base md:text-2xl text-base-content font-black mb-6 max-w-[280px] md:max-w-xl mx-auto tracking-tight uppercase"
        >
          Jasa Desain Grafis | Ilustrasi | Logo | Jersey |Dll.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#about"
            className="group px-12 py-5 bg-[#25D366] text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-[#20ba59] transition-all transform hover:-translate-y-1 active:scale-95 shadow-2xl shadow-[#25D366]/30"
          >
            Order Disini
            <MousePointer2 size={18} className="group-hover:rotate-12 transition-transform" />
          </a>
        </motion.div>
      </motion.div>
      
      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 hidden md:flex"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-base-content/40">Scroll down</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-base-content/20 to-transparent flex justify-center">
          <motion.div 
            animate={{ y: [0, 24, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1 h-3 bg-primary rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
