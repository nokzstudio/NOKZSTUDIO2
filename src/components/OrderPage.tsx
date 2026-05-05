import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Upload, Calendar, User, FileText, ImageIcon } from 'lucide-react';
import { db, auth, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    brief: '',
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  });
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    // Fetch banner for this service type
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

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Error', 'Ukuran gambar maksimal 5MB', 'error');
        return;
      }
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.error('Audio play failed:', e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brief) {
      Swal.fire('Error', 'Mohon isi semua field yang wajib', 'error');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = '';
      if (referenceImage) {
        const imageRef = storageRef(storage, `orders/${Date.now()}_${referenceImage.name}`);
        await uploadBytes(imageRef, referenceImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const orderData = {
        clientName: formData.name,
        service: type,
        brief: formData.brief,
        date: formData.date,
        referenceImage: imageUrl,
        status: 'Belum Dimulai',
        paymentStatus: 'Belum Bayar',
        isAccepted: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      playNotificationSound();

      // WhatsApp Redirect
      const message = `Halo Nokz Studio! Saya ingin memesan jasa ${type.toUpperCase()}%0A%0A*Nama:* ${formData.name}%0A*Tanggal:* ${formData.date}%0A*Brief:* ${formData.brief}${imageUrl ? `%0A*Referensi:* ${imageUrl}` : ''}`;
      const whatsappUrl = `https://wa.me/6282243644023?text=${message}`;

      await Swal.fire({
        title: 'Sukses!',
        text: 'Pesanan Anda telah tercatat. Anda akan diarahkan ke WhatsApp.',
        icon: 'success',
        background: 'rgba(255, 255, 255, 0.1)',
        backdrop: `rgba(0,0,0,0.4) blur(10px)`,
        color: '#fff',
      });

      window.open(whatsappUrl, '_blank');
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      Swal.fire('Error', 'Gagal memproses pesanan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cyber-grid relative overflow-hidden text-white py-20 px-4">
      {/* Background Glow */}
      <div className="absolute inset-x-0 bottom-0 h-[60vh] cyber-glow pointer-events-none" />
      
      <div className="max-w-xl mx-auto relative z-10">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary mb-8 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={16} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Kembali</span>
        </button>

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
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="w-full h-full object-cover absolute inset-0" 
                />
              </AnimatePresence>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {banners.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBannerIndex ? 'bg-primary w-4' : 'bg-white/20 w-1.5'}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">{type?.replace(/-/g, ' ')} Profile</span>
            </div>
          )}
        </div>

        <div className="text-center mb-10">
          <h1 className="text-[11px] font-black uppercase tracking-[0.8em] text-primary/80">
            {type?.replace(/-/g, ' ')} Order Form
          </h1>
          <div className="h-px w-12 bg-primary/20 mx-auto mt-3" />
        </div>

        <div className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 backdrop-blur-xl bg-white/[0.02]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <User size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">Nama Lengkap</label>
            </div>
            <input 
              type="text" 
              placeholder="Masukkan nama Anda..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-colors"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Calendar size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">Tanggal Order</label>
            </div>
            <input 
              type="text" 
              readOnly
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/50 cursor-not-allowed"
              value={formData.date}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <FileText size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">Brief Deskripsi</label>
            </div>
            <textarea 
              placeholder="Jelaskan kebutuhan desain Anda..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              value={formData.brief}
              onChange={(e) => setFormData({...formData, brief: e.target.value})}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <ImageIcon size={18} />
              <label className="text-xs font-black uppercase tracking-[0.2em]">Referensi Gambar (Max 5MB)</label>
            </div>
            <div 
              onClick={() => document.getElementById('image-upload')?.click()}
              className="w-full aspect-video bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={32} className="text-white/20 mb-2" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Klik untuk upload</span>
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

          <button 
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-primary py-5 rounded-2xl flex items-center justify-center gap-3 group transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white">
              {loading ? 'Mengirim...' : 'Kirim Pesanan'}
            </span>
            <Send size={18} className="text-white group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
