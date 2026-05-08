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
  // AUTO SLIDER
  // =========================
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners]);

  // =========================
  // GSAP ANIMATION
  // =========================
  useEffect(() => {
    if (!formRef.current) return;

    gsap.fromTo(
      formRef.current,
      {
        opacity: 0,
        y: 40,
      },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
      }
    );
  }, []);

  // =========================
  // IMAGE CHANGE
  // =========================
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire(
          'Error',
          'Ukuran gambar maksimal 5MB',
          'error'
        );
        return;
      }

      setReferenceImage(file);

      const reader = new FileReader();

      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };

      reader.readAsDataURL(file);
    }
  };

  // =========================
  // NOTIFICATION SOUND
  // =========================
  const playNotificationSound = () => {
    const audio = new Audio(
      'https://www.myinstants.com/media/sounds/iphone-apple-store-sound.mp3'
    );

    audio.play().catch((e) => {
      console.error('Audio play failed:', e);
    });
  };

  // =========================
  // DEVICE ID
  // =========================
  const getDeviceId = () => {
    let id = localStorage.getItem('nokz_device_id');

    if (!id) {
      id =
        'device_' +
        Math.random().toString(36).substr(2, 9) +
        '_' +
        Date.now();

      localStorage.setItem('nokz_device_id', id);
    }

    return id;
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.whatsapp ||
      !formData.brief
    ) {
      Swal.fire(
        'Error',
        'Mohon isi semua field yang wajib',
        'error'
      );
      return;
    }

    setLoading(true);

    try {
      const deviceId = getDeviceId();

      // CHECK LIMIT ORDER
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
          background: 'rgba(255,255,255,0.1)',
          backdrop: `rgba(0,0,0,0.4) blur(10px)`,
          color: '#fff',
          confirmButtonColor: '#ff2d2d',
        });

        setLoading(false);
        return;
      }

      // =========================
      // UPLOAD IMAGE
      // =========================
      let imageUrl = '';

if (referenceImage) {
  try {
    const imageData = new FormData();

    imageData.append('file', referenceImage);

    imageData.append(
      'upload_preset',
      'nokz_unsigned'
    );

    const response = await fetch(
      'https://api.cloudinary.com/v1_1/dylfsj7g2/image/upload',
      {
        method: 'POST',
        body: imageData,
      }
    );

    console.log('STATUS:', response.status);

    const text = await response.text();

    console.log('RAW RESPONSE:', text);

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Response bukan JSON');
    }

    console.log('PARSED:', data);

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        'Upload gagal'
      );
    }

    imageUrl = data.secure_url || '';

  } catch (error: any) {
    console.error('UPLOAD ERROR:', error);

    Swal.fire({
      title: 'Upload gagal',
      text: error.message || 'Cloudinary error',
      icon: 'error',
    });

    setLoading(false);

    return;
  }
}

      // =========================
      // SAVE ORDER
      // =========================
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

      await addDoc(collection(db, 'orders'), orderData);

      playNotificationSound();

      // =========================
      // WHATSAPP
      // =========================
      const message =
        `Halo Nokz Studio! Saya ingin memesan jasa ${type?.toUpperCase()}` +
        `%0A%0A*Nama:* ${formData.name}` +
        `%0A*Tanggal:* ${formData.date}` +
        `%0A*Brief:* ${formData.brief}` +
        `${
          imageUrl
            ? `%0A*Referensi:* ${imageUrl}`
            : ''
        }`;

      const whatsappUrl = `https://wa.me/6287853895560?text=${message}`;

      await Swal.fire({
        title: 'Sukses!',
        text: 'Pesanan berhasil dikirim.',
        icon: 'success',
        background: 'rgba(255,255,255,0.1)',
        backdrop: `rgba(0,0,0,0.4) blur(10px)`,
        color: '#fff',
      });

      window.open(whatsappUrl, '_blank');

      navigate('/');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        'orders'
      );

      Swal.fire(
        'Error',
        'Gagal memproses pesanan.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cyber-grid relative overflow-hidden text-white py-20 px-4">
      {/* Glow */}
      <div className="absolute inset-x-0 bottom-0 h-[60vh] cyber-glow pointer-events-none" />

      <div
        ref={formRef}
        className="max-w-xl mx-auto relative z-10"
      >
        {/* BACK BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary mb-8 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={16} />

          <span className="text-[10px] font-black uppercase tracking-[0.3em]">
            Kembali
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
                  initial={{
                    opacity: 0,
                    x: 50,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -50,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: 'easeInOut',
                  }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              </AnimatePresence>

              {/* DOTS */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {banners.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentBannerIndex
                        ? 'bg-primary w-4'
                        : 'bg-white/20 w-1.5'
                    }`}
                  />
                ))}
              </div>
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
        <form
          onSubmit={handleSubmit}
          className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 backdrop-blur-xl bg-white/[0.02]"
        >
          {/* NAME */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <User size={18} />

              <label className="text-xs font-black uppercase tracking-[0.2em]">
                Nama Lengkap
              </label>
            </div>

            <input
              type="text"
              placeholder="Masukkan nama Anda..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-colors"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
            />
          </div>

          {/* WHATSAPP */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <MessageCircle size={18} />

              <label className="text-xs font-black uppercase tracking-[0.2em]">
                Nomor WhatsApp
              </label>
            </div>

            <input
              type="tel"
              placeholder="08123456789"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-colors"
              value={formData.whatsapp}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  whatsapp: e.target.value,
                })
              }
            />
          </div>

          {/* DATE */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Calendar size={18} />

              <label className="text-xs font-black uppercase tracking-[0.2em]">
                Tanggal Order
              </label>
            </div>

            <input
              type="text"
              readOnly
              value={formData.date}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/50"
            />
          </div>

          {/* BRIEF */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <FileText size={18} />

              <label className="text-xs font-black uppercase tracking-[0.2em]">
                Brief Deskripsi
              </label>
            </div>

            <textarea
              rows={4}
              placeholder="Jelaskan kebutuhan desain..."
              value={formData.brief}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  brief: e.target.value,
                })
              }
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* IMAGE */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <ImageIcon size={18} />

              <label className="text-xs font-black uppercase tracking-[0.2em]">
                Referensi Gambar
              </label>
            </div>

            <div
              onClick={() =>
                document
                  .getElementById('image-upload')
                  ?.click()
              }
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
                  <Upload
                    size={32}
                    className="text-white/20 mb-2"
                  />

                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                    Klik untuk upload
                  </span>
                </>
              )}
            </div>

            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary py-5 rounded-2xl flex items-center justify-center gap-3 group transition-all active:scale-95 disabled:opacity-50"
          >
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white">
              {loading
                ? 'Mengirim...'
                : 'Kirim Pesanan'}
            </span>

            <Send
              size={18}
              className="text-white group-hover:translate-x-1 transition-transform"
            />
          </button>
        </form>
      </div>
    </div>
  );
}