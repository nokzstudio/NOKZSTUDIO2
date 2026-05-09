import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

// === Capacitor Camera ===
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export default function OrderPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);

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

  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // =========================
  // FETCH BANNER
  // =========================
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const q = query(
          collection(db, 'banners'),
          where('type', '==', type)
        );
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

  // =========================
  // GSAP ANIMATION
  // =========================
  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    );
  }, []);

  // =========================
  // HANDLE IMAGE - Capacitor Camera
  // =========================
const handleTakeOrPickImage = async () => {
  try {
    // Kalau WEB/localhost
    if (Capacitor.getPlatform() === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = (e: any) => {
        const file = e.target.files[0];

        if (!file) return;

        setReferenceImage(file);

        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
      };

      input.click();
      return;
    }

    // Kalau Android APK
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      width: 1200,
      height: 1200,
      correctOrientation: true,
    });

    setImagePreview(photo.webPath!);

    const response = await fetch(photo.webPath!);
    const blob = await response.blob();

    const file = new File(
      [blob],
      `reference_${Date.now()}.jpg`,
      {
        type: blob.type || 'image/jpeg',
      }
    );

    setReferenceImage(file);

  } catch (error: any) {
    console.error(error);

    Swal.fire(
      'Error',
      'Gagal mengambil gambar',
      'error'
    );
  }
};
  // =========================
  // HANDLE SUBMIT
  // =========================
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

      // UPLOAD GAMBAR
      let imageUrl = '';
      if (referenceImage) {
        try {
          const formDataCloud = new FormData();
          formDataCloud.append('file', referenceImage);
          formDataCloud.append('upload_preset', 'nokz_unsigned');

          const res = await fetch(
            'https://api.cloudinary.com/v1_1/dylfsj7g2/image/upload',
            { method: 'POST', body: formDataCloud }
          );

          const data = await res.json();

          if (!res.ok) throw new Error(data.error?.message || 'Upload gagal');
          
          imageUrl = data.secure_url;
          console.log('✅ Upload Cloudinary berhasil:', imageUrl);
        } catch (uploadError: any) {
          console.error('Upload Error:', uploadError);
          Swal.fire('Upload Gagal', uploadError.message || 'Cek koneksi internet', 'error');
          setLoading(false);
          return;
        }
      }

      // SAVE TO FIREBASE
      const orderData = {
        clientName: formData.name,
        whatsapp: formData.whatsapp,
        service: type,
        brief: formData.brief,
        date: formData.date,
        referenceImage: imageUrl,
        deviceId,
        status: 'Belum Dimulai',
        paymentStatus: 'Belum Bayar',
        isAccepted: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);

      Swal.fire({
        title: 'Sukses!',
        text: 'Pesanan berhasil dikirim.',
        icon: 'success',
      });

      // WhatsApp
      const message = `Halo Nokz Studio! Saya ingin memesan jasa ${type?.toUpperCase()}%0A%0A*Nama:* ${formData.name}%0A*Tanggal:* ${formData.date}%0A*Brief:* ${formData.brief}${imageUrl ? `%0A*Referensi:* ${imageUrl}` : ''}`;
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
        {/* BACK BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary mb-8 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={16} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">
            KEMBALI
          </span>
        </button>

        {/* BANNER */}
        <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden mb-4 glass border border-white/10 shadow-2xl">
          {banners.length > 0 ? (
            <div className="relative w-full h-full">
              <AnimatePresence mode="wait">
                <motion.img
                  key={banners[currentBannerIndex]}
                  src={banners[currentBannerIndex]}
                  alt={type}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              </AnimatePresence>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
                {type?.replace(/-/g, ' ')} Profile
              </span>
            </div>
          )}
        </div>

        {/* TITLE */}
        <div className="text-center mb-10">
          <h1 className="text-[11px] font-black uppercase tracking-[0.8em] text-primary/80">
            {type?.replace(/-/g, ' ')} Order Form
          </h1>
          <div className="h-px w-12 bg-primary/20 mx-auto mt-3" />
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 backdrop-blur-xl bg-white/[0.02]">
          {/* Name, WhatsApp, Date, Brief ... (sama seperti sebelumnya) */}
          {/* ... kamu bisa copy bagian input name, whatsapp, date, brief dari kode lama */}
{/* NAMA */}
<div className="space-y-3">
  <div className="flex items-center gap-3 text-primary">
    <User size={18} />
    <label className="text-xs font-black uppercase tracking-[0.2em]">
      Nama
    </label>
  </div>

  <input
    type="text"
    value={formData.name}
    onChange={(e) =>
      setFormData({ ...formData, name: e.target.value })
    }
    placeholder="Masukkan nama"
    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none"
    required
  />
</div>

{/* WHATSAPP */}
<div className="space-y-3">
  <div className="flex items-center gap-3 text-primary">
    <MessageCircle size={18} />
    <label className="text-xs font-black uppercase tracking-[0.2em]">
      WhatsApp
    </label>
  </div>

  <input
    type="text"
    value={formData.whatsapp}
    onChange={(e) =>
      setFormData({ ...formData, whatsapp: e.target.value })
    }
    placeholder="08xxxxxxxxxx"
    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none"
    required
  />
</div>

{/* TANGGAL */}
<div className="space-y-3">
  <div className="flex items-center gap-3 text-primary">
    <Calendar size={18} />
    <label className="text-xs font-black uppercase tracking-[0.2em]">
      Tanggal
    </label>
  </div>

  <input
    type="text"
    value={formData.date}
    readOnly
    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none"
  />
</div>

{/* BRIEF */}
<div className="space-y-3">
  <div className="flex items-center gap-3 text-primary">
    <FileText size={18} />
    <label className="text-xs font-black uppercase tracking-[0.2em]">
      Brief Pesanan
    </label>
  </div>

  <textarea
    value={formData.brief}
    onChange={(e) =>
      setFormData({ ...formData, brief: e.target.value })
    }
    placeholder="Jelaskan pesanan kamu..."
    rows={5}
    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none resize-none"
    required
  />
</div>
          {/* IMAGE UPLOAD - Bagian yang baru */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <ImageIcon size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">Referensi Gambar</label>
            </div>

            <div
              onClick={handleTakeOrPickImage}
              className="w-full aspect-video bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden"
            >
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <>
                  <Upload size={32} className="text-white/20 mb-2" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                    Pilih Foto / Ambil Foto
                  </span>
                  <span className="text-[9px] text-white/30 mt-1">Maksimal 5MB</span>
                </>
              )}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary py-5 rounded-2xl flex items-center justify-center gap-3 group transition-all active:scale-95 disabled:opacity-50"
          >
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white">
              {loading ? 'Mengirim...' : 'KIRIM PESANAN'}
            </span>
            <Send size={18} className="text-white group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}