import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { Mail, MessageCircle, Instagram, MapPin, Send, ShieldCheck } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { glassSwal } from '../lib/swal';

import { useTheme } from '../context/ThemeContext';

export default function Contact() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [formData, setFormData] = useState({ name: '', whatsapp: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'orders'), {
        clientName: formData.name,
        whatsapp: formData.whatsapp,
        service: 'Consultation', // Default service from contact form
        description: formData.message,
        status: 'Belum Dimulai',
        paymentStatus: 'Belum Bayar',
        amount: 0,
        createdAt: serverTimestamp(),
      });
      glassSwal.fire({
        icon: 'success',
        title: 'Terkirim!',
        text: `Terima kasih ${formData.name}! Pesan Anda telah diterima.`,
      });
      setFormData({ name: '', whatsapp: '', message: '' });
    } catch (error) {
      console.error("Error submitting order:", error);
      glassSwal.fire({
        icon: 'error',
        title: 'Error',
        text: "Maaf, terjadi kesalahan. Silakan coba lagi nanti.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-6 bg-base-content/[0.01]" ref={ref}>
      <div className="max-w-xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h2 className="font-display font-black text-4xl tracking-tighter mb-4">
            KERJASAMA <span className="text-gradient uppercase">BENTUK LAIN?</span>
          </h2>
          <p className="text-sm text-base-content/40 leading-relaxed font-bold">
            Mari diskusikan bagaimana visual yang tepat dapat membantu bisnis Anda berkembang, kami tunggu ya.
          </p>
        </motion.div>
        
        <div className="space-y-4 mb-8">
          <a 
            href="https://wa.me/6287853895560" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-4 bg-[#25D366] p-4 rounded-full active:scale-95 transition-transform shadow-xl shadow-[#25D366]/20 group"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <MessageCircle size={24} />
            </div>
            <p className="text-xl font-black text-white tracking-tight">WhatsApp</p>
          </a>
          
          <a 
            href="mailto:nokzdesign.inc@gmail.com"
            className="flex items-center gap-4 bg-primary p-4 rounded-full active:scale-95 transition-transform shadow-xl shadow-primary/20 group"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Mail size={24} />
            </div>
            <p className="text-xl font-black text-white tracking-tight">Email</p>
          </a>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center p-6 rounded-[2.5rem] bg-primary/5 border border-primary/10"
        >
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="text-primary rotate-12" size={20} />
          </div>
          <h3 className="text-lg font-black mb-2">Siap berkolaborasi?</h3>
          <p className="text-xs text-base-content/60 font-bold mb-0 leading-relaxed">Klik salah satu layanan di atas untuk memulai pemesanan atau hubungi via WhatsApp untuk konsultasi.</p>
        </motion.div>

        <div className="mt-8 flex justify-center gap-4">
           <a 
             href="https://instagram.com/nokzstudio" 
             target="_blank" 
             rel="noreferrer" 
             className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center text-base-content/40 hover:text-white hover:bg-gradient-to-tr hover:from-purple-500 hover:to-pink-500 transition-all active:scale-90 border border-base-content/5"
           >
             <Instagram size={20} />
           </a>
           <a 
             href="https://tiktok.com/@nokzdesign" 
             target="_blank" 
             rel="noreferrer" 
             className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center text-base-content/40 hover:text-white hover:bg-black transition-all active:scale-90 border border-base-content/5"
           >
             <img src="https://cdn.simpleicons.org/tiktok/white" alt="TikTok" className={cn("w-5 h-5", theme === 'light' && "invert group-hover:invert-0")} />
           </a>
           <a 
             href="https://id.pinterest.com/nokzdesign/" 
             target="_blank" 
             rel="noreferrer" 
             className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center text-base-content/40 hover:text-white hover:bg-[#E60023] transition-all active:scale-90 border border-base-content/5"
           >
             <img src="https://cdn.simpleicons.org/pinterest/white" alt="Pinterest" className={cn("w-5 h-5", theme === 'light' && "invert group-hover:invert-0")} />
           </a>
           <button 
             onClick={() => navigate('/admin')}
             className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center text-base-content/20 hover:text-primary hover:bg-primary/10 transition-all active:scale-90 border border-base-content/5"
           >
             <ShieldCheck size={20} />
           </button>
        </div>
      </div>
    </section>
  );
}
