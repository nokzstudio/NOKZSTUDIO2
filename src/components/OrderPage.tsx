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
  // ONE SIGNAL NOTIFICATION
  // =========================
  const sendAdminNotification = async (orderData: any, orderId: string) => {
    try {
      const payload = {
        app_id: "f82bd795-4f0e-4adc-93d9-e8067943a8e8",
        include_external_user_ids: ["admin_nokz"],
        contents: {
          id: `Ada order baru dari ${orderData.clientName}`,
          en: `New Order #${orderId}`
        },
        headings: {
          id: "🛒 Order Baru Masuk!",
          en: "🛒 New Order Received!"
        },
        data: {
          orderId: orderId,
          screen: "admin"
        }
      };

      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic tfe7wupbmebvcgztrobnhz7s"
        },
        body: JSON.stringify(payload)
      });

      console.log("✅ Notifikasi OneSignal berhasil dikirim ke admin");
    } catch (error) {
      console.error("❌ Gagal kirim notifikasi OneSignal:", error);
      // Tidak menghentikan proses order meskipun notif gagal
    }
  };

  // =========================
  // FETCH BANNER (tetap sama)
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

  // ... (kode useEffect lain tetap sama)

  // =========================
  // SUBMIT (yang sudah diedit)
  // =========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.whatsapp || !formData.brief) {
      Swal.fire('Error', 'Mohon isi semua field yang wajib', 'error');
      return;
    }

    setLoading(true);

    try {
      const deviceId = getDeviceId();

      // CHECK LIMIT ORDER (tetap sama)
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

      // UPLOAD IMAGE (tetap sama)
      let imageUrl = '';
      if (referenceImage) {
        // ... kode upload cloudinary tetap sama ...
      }

      // SAVE ORDER
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

      // 🔥 KIRIM NOTIFIKASI KE ADMIN
      await sendAdminNotification(orderData, docRef.id);

      playNotificationSound();

      // WhatsApp message (tetap sama)
      const message = `Halo Nokz Studio! ...`; // kode whatsapp tetap sama

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
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      Swal.fire('Error', 'Gagal memproses pesanan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ... kode return (JSX) tetap sama sampai akhir