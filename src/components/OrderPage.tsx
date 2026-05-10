import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Send,
  Upload,
  Calendar,
  User,
  FileText,
  ImageIcon,
  MessageCircle,
} from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';

import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';

import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import gsap from 'gsap';
import Swal from 'sweetalert2';

export default function OrderPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const [banners, setBanners] = useState<string[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    brief: '',
    date: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  });

  // Fetch Banner
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const q = query(collection(db, 'banners'), where('type', '==', type));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          if (data.images && Array.isArray(data.images)) {
            setBanners(data.images);
          } else if (data.url) {
            setBanners([data.url]);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'banners');
      }
    };

    fetchBanner();
  }, [type]);

  // GSAP Animation
  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    );
  }, []);

  // Handle Upload Gambar (Hanya Galeri)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setSelectedImages((prev) => [...prev, event.target?.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    e.target.value = ''; // Reset input
  };

  // Remove Image
  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.whatsapp || !formData.brief) {
      Swal.fire('Error', 'Mohon isi semua field yang wajib', 'error');
      return;
    }

    setLoading(true);

    try {
      const deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

      // Cek limit order
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, 'orders'),
        where('deviceId', '==', deviceId),
        where('createdAt', '>=', todayStart),
        limit(3)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.size >= 2) {
        Swal.fire({
          title: 'Batas Pesanan Tercapai',
          text: 'Satu perangkat hanya bisa memesan 2 kali per hari.',
          icon: 'warning',
        });
        setLoading(false);
        return;
      }

      const orderData = {
        clientName: formData.name,
        whatsapp: formData.whatsapp,
        service: type,
        brief: formData.brief,
        date: formData.date,
        images: selectedImages,           // Array base64
        deviceId,
        status: 'Belum Dimulai',
        paymentStatus: 'Belum Bayar',
        isAccepted: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);

      // --- KIRIM NOTIFIKASI ONESIGNAL LANGSUNG DARI WEB/APP ---
      try {
        const ONESIGNAL_APP_ID = "f82bd795-4f0e-4adc-93d9-e8067943a8e8";
        const ONESIGNAL_REST_API_KEY = "tfe7wupbmebevcgztrobnhz7s";

        await axios.post("https://onesignal.com/api/v1/notifications", {
          app_id: ONESIGNAL_APP_ID,
          included_segments: ["All Subscribed Users"],
          android_accent_color: "FF0000FF", // Warna biru untuk ikon
          priority: 10, // High Priority agar muncul di status bar
          headings: {
            en: "🛒 Order Baru Masuk!",
            id: "🛒 Order Baru Masuk!"
          },
          contents: {
            en: `New Order from ${formData.name}`,
            id: `Ada order baru dari ${formData.name} (${type?.toUpperCase()})`
          },
          data: {
            screen: "admin"
          }
        }, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
          }
        });
        console.log("✅ Notifikasi otomatis terkirim via API");
      } catch (notifError) {
        console.error("❌ Gagal kirim notifikasi otomatis:", notifError);
      }
      // -------------------------------------------------------

      Swal.fire({
        title: 'Sukses!',
        text: 'Pesanan berhasil dikirim.',
        icon: 'success',
      });

      const message = `Halo Nokz Studio! Saya ingin memesan jasa ${type?.toUpperCase()}%0A%0A*Nama:* ${formData.name}%0A*Tanggal:* ${formData.date}%0A*Brief:* ${formData.brief}`;
      window.open(`https://wa.me/6287853895560?text=${message}`, '_blank');

      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      Swal.fire('Error', 'Gagal memproses pesanan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cyber-grid relative overflow-hidden text-white py-20 px-4">
      <div className="absolute inset-x-0 bottom-0 h-[60vh] cyber-glow pointer-events-none" />

      <div ref={formRef} className="max-w-xl mx-auto relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary mb-8 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={16} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">
            KEMBALI
          </span>
        </button>

        {/* Banner */}
        <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden mb-4 glass border border-white/10 shadow-2xl">
          {banners.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={banners[currentBannerIndex]}
                src={banners[currentBannerIndex]}
                alt={type}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
                {type?.replace(/-/g, ' ')} Profile
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-[11px] font-black uppercase tracking-[0.8em] text-primary/80">
            {type?.replace(/-/g, ' ')} Order Form
          </h1>
          <div className="h-px w-12 bg-primary/20 mx-auto mt-3" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 backdrop-blur-xl bg-white/[0.02]">
          
          {/* Nama */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <User size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">Nama</label>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none"
              required
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <MessageCircle size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">WhatsApp</label>
            </div>
            <input
              type="text"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none"
              required
            />
          </div>

          {/* Tanggal */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <Calendar size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">Tanggal</label>
            </div>
            <input
              type="text"
              value={formData.date}
              readOnly
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none"
            />
          </div>

          {/* Brief */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <FileText size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">Brief Pesanan</label>
            </div>
            <textarea
              value={formData.brief}
              onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
              placeholder="Jelaskan pesanan kamu..."
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none resize-none"
              required
            />
          </div>

          {/* Upload Gambar (Hanya Galeri) */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <ImageIcon size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">
                Upload Gambar Referensi
              </label>
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="image-upload"
            />

            <label
              htmlFor="image-upload"
              className="w-full border border-dashed border-white/30 rounded-2xl py-12 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-white/5 transition-all"
            >
              <Upload size={40} className="mb-3 opacity-70" />
              <span className="text-sm font-medium">Pilih dari Galeri</span>
              <span className="text-xs opacity-50 mt-1">Bisa upload beberapa gambar</span>
            </label>

            {/* Preview Images */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {selectedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`preview-${index}`}
                      className="w-full aspect-square object-cover rounded-xl border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary py-5 rounded-2xl flex items-center justify-center gap-3 group transition-all active:scale-95 disabled:opacity-50 mt-6"
          >
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white">
              {loading ? 'Mengirim Pesanan...' : 'KIRIM PESANAN'}
            </span>
            <Send size={18} className="text-white group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}