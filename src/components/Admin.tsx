import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { 
  collection, 
  addDoc, 
  updateDoc,
  onSnapshot, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  getDoc,
  limit
} from 'firebase/firestore';
import { glassSwal } from '../lib/swal';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import Cropper, { Point, Area } from 'react-easy-crop';
import getCroppedImg from '../lib/cropImage';
import { 
  Plus, 
  Trash2, 
  LogOut, 
  LayoutDashboard, 
  Image as ImageIcon, 
  Briefcase, 
  Type, 
  AlignLeft, 
  Edit3, 
  X as CloseIcon,
  Home,
  LayoutGrid,
  BarChart3,
  Settings,
  Search,
  Sun,
  Moon,
  MessageCircle,
  User as UserIcon,
  DollarSign,
  Mail,
  ChevronDown,
  ExternalLink,
  Monitor,
  Calendar,
  TrendingUp,
  Download,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Eye,
  MousePointer2,
  ArrowLeft,
  Check,
  CheckCircle,
  Inbox,
  ClipboardCheck,
  Crop
} from 'lucide-react';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';

import from '../lib/constants';

import { Skeleton, CardSkeleton, AdminRowSkeleton } from './Skeleton';

interface Project {
  id: string;
  title: string;
  category: string;
  image: string;
  description: string;
  caseStudyUrl?: string;
  views?: number;
  createdAt: Timestamp;
}

interface Order {
  id: string;
  clientName: string;
  whatsapp: string;
  service: string;
  description?: string;
  brief?: string;
  date?: string;
  status: 'Belum Dimulai' | 'Dalam Antrian' | 'Prosess' | 'Selesai' | 'Dibatalkan';
  paymentStatus: 'Belum Bayar' | 'DP' | 'Lunas';
  amount: number;
  dpAmount?: number;
  customDate?: string;
  deadline?: string;
  referenceImage?: string;
  isAccepted?: boolean;
  createdAt: Timestamp;
}

interface Banner {
  id: string;
  type: string;
  images: string[];
}

export default function Admin({ onBack }: { onBack: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'orders' | 'banners' | 'settings'>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerFormData, setBannerFormData] = useState({ type: 'logo', images: ['', '', ''] });
  const [lastSelectedCategory, setLastSelectedCategory] = useState('logo');
  
  // Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [currentCropIndex, setCurrentCropIndex] = useState<number | null>(null);

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState<string | null>(null);
  const [useLocalFile, setUseLocalFile] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Logo',
    image: '',
    description: '',
    caseStudyUrl: '',
  });
  const [orderFormData, setOrderFormData] = useState({
    clientName: '',
    whatsapp: '',
    service: 'Logo',
    brief: '',
    status: 'Belum Dimulai' as Order['status'],
    paymentStatus: 'Belum Bayar' as Order['paymentStatus'],
    amount: 0,
    dpAmount: 0,
    customDate: new Date().toISOString().split('T')[0],
    deadline: '',
    referenceImage: '',
    isAccepted: false,
  });
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('admin_notifications') !== 'false';
  });
  const [currentAnalytics, setCurrentAnalytics] = useState<any>(null);
  const [lastAnalytics, setLastAnalytics] = useState<any>(null);

  const getMonthId = (offset = 0) => {
    const now = new Date();
    now.setMonth(now.getMonth() - offset);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const playNotificationSound = (type: 'new' | 'completed' | 'delete') => {
    if (!notificationsEnabled) return;
    const sounds = {
      new: 'https://www.myinstants.com/media/sounds/iphone-apple-store-sound.mp3',
      completed: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
      delete: 'https://www.myinstants.com/media/sounds/lo-siento-wilson.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.play().catch(e => console.error('Audio play failed:', e));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10000000) { 
        glassSwal.fire({
          icon: 'error',
          title: 'File too large!',
          text: 'Maximum size is 10MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData({ ...formData, image: base64String, caseStudyUrl: '' }); // Clear URL if using local
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Basic safeguard again, even though it's checked by the parent component
    if (false) return;

    let unsubscribeProjects: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeAnalytics: (() => void) | null = null;
    let unsubscribePrevAnalytics: (() => void) | null = null;

    // Small timeout to ensure the token state is reflected in rules if just logged in
    const timeoutId = setTimeout(() => {
      setDataLoading(true);
      // Limit to 100 recent projects
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(100));
      unsubscribeProjects = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Project[];
        setProjects(docs);
        setDataLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'projects');
        setDataLoading(false);
      });

      // Limit to 100 recent orders
      const ordersQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
      unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(docs);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });

      const monthId = getMonthId(0);
      const prevMonthId = getMonthId(1);

      // Use getDocs for analytics and banners to save quota since they don't change constantly
      const fetchStaticData = async () => {
        try {
          const [currDoc, prevDoc, bannerSnap] = await Promise.all([
            getDoc(doc(db, 'analytics', monthId)),
            getDoc(doc(db, 'analytics', prevMonthId)),
            getDocs(query(collection(db, 'banners'), limit(10)))
          ]);
          
          if (currDoc.exists()) setCurrentAnalytics(currDoc.data());
          if (prevDoc.exists()) setLastAnalytics(prevDoc.data());
          setBanners(bannerSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Banner[]);
        } catch (error) {
          console.error("Error fetching static admin data:", error);
        }
      };

      fetchStaticData();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribeProjects) unsubscribeProjects();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeAnalytics) unsubscribeAnalytics();
      if (unsubscribePrevAnalytics) unsubscribePrevAnalytics();
    };
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'projects', isEditing), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        setIsEditing(null);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...formData,
          views: 0,
          createdAt: serverTimestamp(),
        });
      }
      setFormData({ title: '', category: 'Logo', image: '', description: '', caseStudyUrl: '' });
      setImagePreview(null);
      setUseLocalFile(false);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, isEditing ? `projects/${isEditing}` : 'projects');
      glassSwal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: 'Gagal menyimpan portofolio. Silakan cek konsol.',
      });
    }
  };

  const handleEditClick = (project: Project) => {
    setIsEditing(project.id);
    setFormData({
      title: project.title || '',
      category: project.category || 'Logo',
      image: project.image || '',
      description: project.description || '',
      caseStudyUrl: project.caseStudyUrl || '',
    });
    setImagePreview(project.image || null);
    setUseLocalFile(project.image?.startsWith('data:') || false);
    setActiveTab('portfolio');
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setImagePreview(null);
    setUseLocalFile(false);
    setFormData({ title: '', category: 'Logo', image: '', description: '', caseStudyUrl: '' });
  };

  const handleOrderEditClick = (order: Order) => {
    setIsEditingOrder(order.id);
    setOrderFormData({
      clientName: order.clientName || '',
      whatsapp: order.whatsapp || '',
      service: order.service || 'Logo',
      brief: order.brief || order.description || '',
      status: order.status || 'Belum Dimulai',
      paymentStatus: order.paymentStatus || 'Belum Bayar',
      amount: order.amount || 0,
      dpAmount: order.dpAmount || 0,
      customDate: order.customDate || order.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      deadline: order.deadline || '',
      referenceImage: order.referenceImage || '',
      isAccepted: order.isAccepted || false,
    });
    setShowOrderForm(true);
  };

  const cancelOrderEdit = () => {
    setIsEditingOrder(null);
    setShowOrderForm(false);
    setOrderFormData({
      clientName: '',
      whatsapp: '',
      service: 'Logo',
      brief: '',
      status: 'Belum Dimulai',
      paymentStatus: 'Belum Bayar',
      amount: 0,
      dpAmount: 0,
      customDate: new Date().toISOString().split('T')[0],
      deadline: '',
      referenceImage: '',
      isAccepted: false,
    });
  };

  const handleOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      if (isEditingOrder) {
        await updateDoc(doc(db, 'orders', isEditingOrder), {
          ...orderFormData,
          updatedAt: serverTimestamp(),
        });
        setIsEditingOrder(null);
      } else {
        await addDoc(collection(db, 'orders'), {
          ...orderFormData,
          createdAt: serverTimestamp(),
        });
      }
      setShowOrderForm(false);
      setOrderFormData({
        clientName: '',
        whatsapp: '',
        service: 'Logo',
        brief: '',
        status: 'Belum Dimulai',
        paymentStatus: 'Belum Bayar',
        amount: 0,
        dpAmount: 0,
        customDate: new Date().toISOString().split('T')[0],
        deadline: '',
        referenceImage: '',
        isAccepted: false,
      });
      if (!isEditingOrder) playNotificationSound('new');
    } catch (error) {
      handleFirestoreError(error, isEditingOrder ? OperationType.UPDATE : OperationType.CREATE, isEditingOrder ? `orders/${isEditingOrder}` : 'orders');
      glassSwal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: 'Gagal menyimpan order.',
      });
    }
  };

  const handleBannerFileChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10000000) {
        glassSwal.fire({
          icon: 'error',
          title: 'File too large!',
          text: 'Maximum size is 10MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setCurrentCropIndex(index);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSaveCrop = async () => {
    if (imageToCrop && croppedAreaPixels && currentCropIndex !== null) {
      try {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        const newImages = [...bannerFormData.images];
        newImages[currentCropIndex] = croppedImage;
        setBannerFormData({ ...bannerFormData, images: newImages });
        setShowCropModal(false);
        setImageToCrop(null);
        setCurrentCropIndex(null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleBannerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (false) return;

    try {
      const q = query(collection(db, 'banners'), where('type', '==', bannerFormData.type));
      const querySnapshot = await getDocs(q);
      
      const bannerData = {
        type: bannerFormData.type,
        images: bannerFormData.images.filter(img => img !== ''),
        updatedAt: serverTimestamp()
      };

      if (!querySnapshot.empty) {
        await updateDoc(doc(db, 'banners', querySnapshot.docs[0].id), bannerData);
      } else {
        await addDoc(collection(db, 'banners'), {
          ...bannerData,
          createdAt: serverTimestamp()
        });
      }
      
      glassSwal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Banner berhasil diperbarui!',
        timer: 1500,
        showConfirmButton: false
      });

      // Reset form after successful save
      setBannerFormData({ type: 'logo', images: ['', '', ''] });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'banners');
    }
  };

  const deleteBanner = async (id: string) => {
    const result = await glassSwal.fire({
      title: 'Hapus Banner?',
      text: "Data banner ini akan dihapus secara permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'banners', id));
        glassSwal.fire('Terhapus!', 'Banner berhasil dihapus.', 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `banners/${id}`);
      }
    }
  };
  const handleDelete = async (id: string, type: 'projects' | 'orders' = 'projects') => {
    const result = await glassSwal.fire({
      title: 'Apakah Anda yakin?',
      text: `Anda akan menghapus ${type === 'projects' ? 'portofolio' : 'order'} ini secara permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, type, id));
        playNotificationSound('delete');
        glassSwal.fire({
          title: 'Terhapus!',
          text: `Berhasil menghapus ${type === 'projects' ? 'portofolio' : 'order'}.`,
          icon: 'success',
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${type}/${id}`);
        glassSwal.fire({
          icon: 'error',
          title: 'Gagal!',
          text: `Gagal menghapus ${type}. Silakan cek konsol.`,
        });
      }
    }
  };

  const updateOrderStatus = async (id: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      if (newStatus === 'Selesai') playNotificationSound('completed');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const acceptOrder = async (id: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), {
        isAccepted: true,
        status: 'Dalam Antrian',
        updatedAt: serverTimestamp()
      });
      glassSwal.fire({
        icon: 'success',
        title: 'Pesanan Diterima',
        text: 'Pesanan telah dipindahkan ke daftar kerja.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const queueCount = orders.filter(o => o.status === 'Belum Dimulai' || o.status === 'Dalam Antrian').length;
  const queueStatus = queueCount <= 7 ? 'Antrian Tersedia' : 'Full Minggu Ini';
  const queueColor = queueCount <= 7 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10';

  const exportMonthlyRecap = (monthName: string, items: Order[]) => {
    const doc = new jsPDF();
    const title = `Recap Order - ${monthName}`;
    
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = items.map(o => [
      o.customDate || o.createdAt?.toDate().toLocaleDateString('id-ID'),
      o.clientName,
      o.service,
      o.status,
      o.paymentStatus,
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(o.amount)
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Tanggal', 'Client', 'Service', 'Status', 'Payment', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: '#2d3748' }
    });

    const totalRevenue = items.reduce((sum, o) => sum + (o.amount || 0), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Total Omset: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalRevenue)}`, 14, finalY);

    doc.save(`Recap-Nokz-${monthName}.pdf`);
  };

  const totalCollected = orders.reduce((acc, o) => {
    if (o.paymentStatus === 'Lunas') return acc + (o.amount || 0);
    if (o.paymentStatus === 'DP') return acc + (o.dpAmount || 0);
    return acc;
  }, 0);

  const formatAnalyticsNumber = (num: number) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  const getAnalyticsTrend = (current: number, last: number) => {
    if (!last || last === 0) return 0;
    return Math.round(((current - last) / last) * 100);
  };

  const visitorTrend = getAnalyticsTrend(currentAnalytics?.visitors || 0, lastAnalytics?.visitors || 0);
  const clickTrend = getAnalyticsTrend(currentAnalytics?.orderClicks || 0, lastAnalytics?.orderClicks || 0);

  const stats = [
    { 
      label: 'Jumlah Pengunjung', 
      value: formatAnalyticsNumber(currentAnalytics?.visitors || 0), 
      icon: Eye, 
      color: 'text-blue-500 bg-blue-500/10', 
      trend: visitorTrend 
    },
    { 
      label: 'Klik "Order Disini"', 
      value: formatAnalyticsNumber(currentAnalytics?.orderClicks || 0), 
      icon: MousePointer2, 
      color: 'text-primary bg-primary/10', 
      trend: clickTrend 
    },
    { 
      label: 'Penghasilan Bulanan', 
      value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalCollected), 
      icon: DollarSign, 
      color: 'text-green-500 bg-green-500/10' 
    },
  ];

  const ageData = currentAnalytics?.ageGroups ? Object.entries(currentAnalytics.ageGroups).map(([name, value]) => ({
    name,
    value: value as number,
    color: name === '18-24' ? '#3b82f6' : name === '25-34' ? '#22c55e' : name === '35-44' ? '#f97316' : name === '13-17' ? '#a855f7' : '#64748b'
  })).sort((a, b) => (b.value as number) - (a.value as number)) : [];

  const OrderDetailsModal = ({ order, onClose }: { order: Order; onClose: () => void }) => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-[#161b22]/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-display font-black tracking-tight">{order.clientName}</h2>
            <p className="text-white/30 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">Order Details / #{order.id?.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2">Status</p>
              <div className={cn(
                "w-2 h-2 rounded-full mb-1 animate-pulse",
                order.status === 'Selesai' ? "bg-green-500" :
                order.status === 'Belum Dimulai' ? "bg-orange-500" : "bg-blue-500"
              )} />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                order.status === 'Selesai' ? "text-green-500" :
                order.status === 'Belum Dimulai' ? "text-orange-500" : "text-blue-500"
              )}>
                {order.status}
              </span>
            </div>
            <div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2">Category</p>
              <Briefcase size={14} className="text-primary mb-1" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{order.service}</span>
            </div>
            <div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2">Payment</p>
              <DollarSign size={14} className={cn(order.paymentStatus === 'Lunas' ? "text-green-500" : "text-blue-500")} />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                order.paymentStatus === 'Lunas' ? "text-green-500" :
                order.paymentStatus === 'DP' ? "text-blue-500" : "text-white/20"
              )}>
                {order.paymentStatus}
              </span>
            </div>
            <div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2">Total</p>
              <TrendingUp size={14} className="text-white/40 mb-1" />
              <span className="text-[10px] font-mono font-black text-white">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.amount)}</span>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-2">Contact Info</p>
                <div className="p-5 bg-white/[0.02] rounded-[2rem] border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{order.whatsapp}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">WhatsApp</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-2">Deadline</p>
                <div className="p-5 bg-white/[0.02] rounded-[2rem] border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{order.deadline ? new Date(order.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Flexible'}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-mono">Due Date</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-2">Brief & Requirements</p>
              <div className="p-6 bg-white/[0.02] rounded-[2rem] border border-white/5">
                <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                  {order.brief || order.description || 'No detailed instructions provided.'}
                </p>
              </div>
            </div>

            {order.referenceImage && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-2">Attached Reference</p>
                <div className="rounded-[2rem] border border-white/5 overflow-hidden bg-black/40 aspect-[4/3] flex items-center justify-center">
                  <img src={order.referenceImage} className="w-full h-full object-contain" alt="Reference" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 sm:p-8 bg-white/[0.02] border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 shadow-xl shadow-primary/20"
          >
            Acknowledge & Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  const chartData = [
    { name: 'Belum Dimulai', value: orders.filter(o => o.status === 'Belum Dimulai').length, color: '#f97316' },
    { name: 'Dalam Antrian', value: orders.filter(o => o.status === 'Dalam Antrian').length, color: '#93c5fd' },
    { name: 'Prosess', value: orders.filter(o => o.status === 'Prosess').length, color: '#3b82f6' },
    { name: 'Selesai', value: orders.filter(o => o.status === 'Selesai').length, color: '#22c55e' },
    { name: 'Dibatalkan', value: orders.filter(o => o.status === 'Dibatalkan').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (loading) return (
    <div className="fixed inset-0 bg-[#171c23] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

    if (false) return;
      <div className="fixed inset-0 bg-surface z-[200] flex flex-col items-center justify-center p-6 transition-colors duration-500">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-12 rounded-[2.5rem] max-w-md w-full text-center border border-base-content/5"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <LayoutDashboard size={40} className="text-primary" />
          </div>
          <h2 className="text-3xl font-display font-extrabold mb-4 text-base-content uppercase tracking-tight">ADMIN ONLY</h2>
          <p className="text-base-content/50 mb-10">Only authorized creators can access the portfolio management suite.</p>
        
          <button onClick={onBack} className="text-base-content/40 hover:text-base-content transition-colors text-sm font-bold uppercase tracking-widest">
            Back to Website
          </button>
        </motion.div>
      </div>
  }

  return (
    <div className="fixed inset-0 flex h-screen bg-surface text-base-content overflow-hidden font-sans z-[200] transition-colors duration-500">
      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex flex-col w-[320px] bg-surface border-r border-base-content/5 relative z-50">
        <div className="p-12 pb-16">
          <div className="flex items-center gap-5 group cursor-default">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 group-hover:rotate-6 transition-transform duration-500 font-display font-black text-2xl text-white">N</div>
            <div className="flex flex-col">
              <span className="text-xl font-display font-black tracking-tight text-base-content group-hover:text-primary transition-colors">NokzStudio</span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-base-content/20">Control Tower</span>
            </div>
          </div>
        </div>

        <nav className="flex-grow flex flex-col gap-3 px-6">
          {[
            { id: 'dashboard', icon: LayoutGrid, label: 'Omni Dashboard' },
            { id: 'orders', icon: MessageCircle, label: 'Work Requests' },
            { id: 'portfolio', icon: Briefcase, label: 'Visual Archive' },
            { id: 'banners', icon: ImageIcon, label: 'Banner Setting' },
            { id: 'settings', icon: Settings, label: 'System Preferences' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden group relative",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-2xl shadow-primary/20" 
                  : "text-base-content/40 hover:text-base-content hover:bg-base-content/5"
              )}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none"
                />
              )}
              <item.icon size={20} className={cn("transition-transform duration-500", activeTab === item.id ? "scale-110" : "group-hover:translate-x-1")} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 mt-auto">
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-grow flex flex-col overflow-hidden w-full relative bg-surface">
        {/* TOP HEADER */}
        <header className="h-20 bg-surface border-b border-base-content/5 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-[100]">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center bg-base-content/5 text-base-content/40 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content">
              {activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2.5 bg-base-content/5 hover:bg-base-content/10 rounded-xl border border-base-content/5 text-base-content/20 active:scale-90"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* BOTTOM NAVIGATION (Mobile) */}
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-[250]">
          <nav className="glass bg-surface/80 backdrop-blur-3xl rounded-[2rem] border border-base-content/10 p-2 shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex items-center justify-around">
            {[
              { id: 'dashboard', icon: Home, label: 'Home' },
              { id: 'orders', icon: MessageCircle, label: 'Work' },
              { id: 'banners', icon: ImageIcon, label: 'Banners' },
              { id: 'portfolio', icon: Briefcase, label: 'Archive' },
              { id: 'settings', icon: Settings, label: 'Core' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-500 min-w-[60px]",
                  activeTab === item.id 
                    ? "bg-primary text-white scale-105 shadow-xl shadow-primary/20" 
                    : "text-white/20"
                )}
              >
                <item.icon size={18} />
                <span className="text-[7px] font-black uppercase tracking-[0.1em] leading-none">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-grow overflow-y-auto p-3 sm:p-6 lg:p-10 custom-scrollbar pb-32 lg:pb-10 bg-[#0d1117]">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-display font-black tracking-tight mb-2">Main Dashboard</h1>
                    <p className="text-white/30 font-medium">Welcome back to NokzStudio control panel.</p>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('portfolio'); cancelEdit(); }}
                    className="w-full md:w-auto bg-primary px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-primary/80 transition-all shadow-xl shadow-primary/30 active:scale-95"
                  >
                    <Plus size={20} /> Add New Project
                  </button>
                </div>

                {/* Quick Insights Row */}
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 text-left">
                  {dataLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="glass bg-[#1c232d]/40 backdrop-blur-xl p-3 sm:p-7 rounded-[1.2rem] sm:rounded-[2.5rem] border border-white/5 flex flex-col gap-2 sm:gap-6 group overflow-hidden">
                        <Skeleton className="w-12 h-12 rounded-2xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      </div>
                    ))
                  ) : (
                    stats.map((stat: any) => (
                      <div key={stat.label} className="glass bg-[#1c232d]/40 backdrop-blur-xl p-3 sm:p-7 rounded-[1.2rem] sm:rounded-[2.5rem] border border-white/5 flex flex-col gap-2 sm:gap-6 hover:border-primary/20 transition-all group overflow-hidden">
                        <div className="flex justify-between items-start">
                          <div className={cn("w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.color)}>
                            <stat.icon size={14} className="sm:w-6 sm:h-6" />
                          </div>
                          {stat.trend !== undefined && (
                            <div className={cn(
                              "flex items-center gap-0.5 sm:gap-1 text-[7px] sm:text-[10px] font-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg uppercase tracking-widest",
                              stat.trend >= 0 ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
                            )}>
                              {stat.trend >= 0 ? <TrendingUp size={8} className="sm:w-3 sm:h-3" /> : <AlertCircle size={8} className="sm:w-3 sm:h-3 rotate-180" />}
                              {Math.abs(stat.trend)}%
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white/20 text-[6px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-0.5 truncate">{stat.label}</p>
                          <h4 className="text-[10px] sm:text-3xl font-display font-black tracking-tight truncate">{stat.value}</h4>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass bg-[#1c232d]/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                      <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                          <BarChart3 size={20} className="text-primary" />
                          Order Analytics
                        </h3>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          Live Stats
                        </div>
                      </div>
                      
                      <div className="h-[350px] w-full relative z-10">
                        {dataLoading ? (
                          <div className="h-full flex items-center justify-center">
                            <div className="w-48 h-48 rounded-full border-8 border-white/5 border-t-primary animate-spin" />
                          </div>
                        ) : chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                contentStyle={{ 
                                  backgroundColor: '#1c232d', 
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '1rem',
                                  fontSize: '12px'
                                }} 
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-white/20">
                            <LayoutGrid size={40} className="mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">No orders to analyze yet</p>
                          </div>
                        )}
                      </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 sm:mt-8 relative z-10">
                        {['Belum Dimulai', 'Dalam Antrian', 'Prosess', 'Selesai', 'Dibatalkan'].map((status) => {
                          const count = orders.filter(o => o.status === status).length;
                          const color = status === 'Belum Dimulai' ? 'bg-orange-500' : status === 'Dalam Antrian' ? 'bg-blue-300' : status === 'Prosess' ? 'bg-blue-500' : status === 'Selesai' ? 'bg-green-500' : 'bg-red-500';
                          return (
                            <div key={status} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5">
                              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", color)} />
                                <span className="text-[7px] sm:text-[8px] font-bold text-white/40 uppercase tracking-widest leading-tight">{status}</span>
                              </div>
                              <p className="text-base sm:text-xl font-black">{count}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="glass bg-[#1c232d]/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                          <MessageCircle size={20} className="text-primary" />
                          Recent Active Orders
                        </h3>
                        <button 
                          onClick={() => setActiveTab('orders')}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="space-y-4">
                        {dataLoading ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <AdminRowSkeleton key={i} />
                          ))
                        ) : (
                          orders?.slice(0, 4).map((order) => (
                            <div 
                              key={order.id} 
                              onClick={() => setSelectedOrder(order)}
                              className="p-5 bg-white/[0.02] hover:bg-white/[0.04] rounded-[2rem] border border-white/5 transition-all flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 font-black">
                                  {order.clientName.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{order.clientName}</p>
                                  <p className="text-[10px] text-white/30 uppercase tracking-widest">{order.service}</p>
                                </div>
                              </div>
                              <div className={cn(
                                "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                order.status === 'Selesai' ? "bg-green-500/10 text-green-500" :
                                order.status === 'Dibatalkan' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                              )}>
                                {order.status}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="glass bg-[#1c232d]/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5">
                      <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                        <Calendar size={20} className="text-primary" />
                        Deadline Today
                      </h3>
                      <div className="space-y-4">
                        {orders.filter(o => o.deadline && new Date(o.deadline).toDateString() === new Date().toDateString()).length > 0 ? (
                          orders.filter(o => o.deadline && new Date(o.deadline).toDateString() === new Date().toDateString()).map(o => (
                            <div key={o.id} className="p-5 bg-red-500/5 rounded-[2rem] border border-red-500/10 flex items-center gap-4 text-left">
                              <div className="w-10 h-10 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center">
                                <AlertCircle size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold">{o.clientName}</p>
                                <p className="text-[10px] text-red-500/60 font-black uppercase tracking-widest">Immediate Attention</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center bg-white/[0.02] rounded-[2rem] border border-white/5">
                            <Clock size={32} className="mx-auto text-white/10 mb-4" />
                            <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No Deadlines Today</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics summary removed */}
              </motion.div>
            ) : activeTab === 'orders' ? (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-display font-black tracking-tight mb-2">Order Management</h1>
                    <p className="text-white/30 font-medium">Keep track of your client requests and project status.</p>
                  </div>
                  <button 
                    onClick={() => setShowOrderForm(!showOrderForm)}
                    className={cn(
                      "w-full md:w-auto px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95",
                      showOrderForm ? "bg-white/10 text-white" : "bg-primary text-white shadow-primary/30"
                    )}
                  >
                    {showOrderForm ? <CloseIcon size={20} /> : <Plus size={20} />}
                    {showOrderForm ? 'Close Entry Form' : 'New Client Order'}
                  </button>
                </div>

                <AnimatePresence>
                  {showOrderForm && (
                    <motion.div
                      initial={isEditingOrder ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={isEditingOrder ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                      exit={isEditingOrder ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      className={cn(
                        "overflow-hidden",
                        isEditingOrder && "fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-8"
                      )}
                    >
                      {isEditingOrder && <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={cancelOrderEdit} />}
                      <div className={cn(
                        "glass bg-[#1c232d]/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl relative",
                        isEditingOrder ? "w-full max-w-4xl p-10 max-h-[90vh] overflow-y-auto custom-scrollbar" : "p-6 lg:p-10 mb-12"
                      )}>
                        <div className="flex justify-between items-center mb-10">
                          <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                            {isEditingOrder ? <Edit3 size={28} className="text-primary" /> : <Plus size={28} className="text-primary" />}
                            {isEditingOrder ? 'Edit Client Order' : 'Create New Client Order'}
                          </h3>
                          <button onClick={cancelOrderEdit} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors">
                            <CloseIcon size={20} />
                          </button>
                        </div>

                        <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Client Name</label>
                                <div className="relative group">
                                  <UserIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                  <input
                                    required
                                    type="text"
                                    placeholder="e.g. John Doe"
                                    value={orderFormData.clientName}
                                    onChange={(e) => setOrderFormData({...orderFormData, clientName: e.target.value})}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium transition-all"
                                  />
                                </div>
                              </div>
                              <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Placement Date</label>
                                <div className="relative group">
                                  <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                  <input
                                    type="date"
                                    value={orderFormData.customDate}
                                    onChange={(e) => setOrderFormData({...orderFormData, customDate: e.target.value})}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium transition-all"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">WhatsApp Contact</label>
                              <div className="relative group">
                                <MessageCircle size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                <input
                                  required
                                  type="text"
                                  placeholder="08xxxxxxxxxx"
                                  value={orderFormData.whatsapp}
                                  onChange={(e) => setOrderFormData({...orderFormData, whatsapp: e.target.value})}
                                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium transition-all"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Category</label>
                                <div className="relative group">
                                  <LayoutGrid size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors pointer-events-none" />
                                  <select
                                    value={orderFormData.service}
                                    onChange={(e) => setOrderFormData({...orderFormData, service: e.target.value})}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium appearance-none transition-all"
                                  >
                                    {[
                                      'Banner', 'Feed IG', 'Ilustrasi', 'Instastory', 'Jersey Design', 'Logo', 'Menu', 'Packaging', 'Poster', 'Stand banner', 'Tumbnail YT'
                                    ].sort().map(s => (
                                      <option key={s} value={s} className="bg-[#171c23]">{s}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Project Deadline</label>
                                <div className="relative group">
                                  <Clock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                  <input
                                    type="date"
                                    value={orderFormData.deadline}
                                    onChange={(e) => setOrderFormData({...orderFormData, deadline: e.target.value})}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium transition-all"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Total Amount (IDR)</label>
                                <div className="relative group">
                                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-bold group-focus-within:text-primary transition-colors">Rp</div>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={orderFormData.amount}
                                    onChange={(e) => setOrderFormData({...orderFormData, amount: Number(e.target.value)})}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium transition-all"
                                  />
                                </div>
                              </div>
                              <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Current Status</label>
                                <select
                                  value={orderFormData.status}
                                  onChange={(e) => setOrderFormData({...orderFormData, status: e.target.value as any})}
                                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium appearance-none transition-all"
                                >
                                  {['Belum Dimulai', 'Dalam Antrian', 'Prosess', 'Selesai', 'Dibatalkan'].map(s => (
                                    <option key={s} value={s} className="bg-[#171c23]">{s}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Payment Status</label>
                                <select
                                  value={orderFormData.paymentStatus}
                                  onChange={(e) => setOrderFormData({...orderFormData, paymentStatus: e.target.value as any})}
                                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium appearance-none transition-all"
                                >
                                  {['Belum Bayar', 'DP', 'Lunas'].map(s => (
                                    <option key={s} value={s} className="bg-[#171c23]">{s}</option>
                                  ))}
                                </select>
                              </div>
                              {orderFormData.paymentStatus === 'DP' && (
                                <div className="space-y-3">
                                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500 ml-2">DP Amount</label>
                                  <div className="relative">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500/20 font-bold">Rp</div>
                                    <input
                                      type="number"
                                      placeholder="DP Nominal"
                                      value={orderFormData.dpAmount}
                                      onChange={(e) => setOrderFormData({...orderFormData, dpAmount: Number(e.target.value)})}
                                      className="w-full bg-blue-500/5 border border-blue-500/20 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:border-blue-500 text-sm font-medium transition-all"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Briefing & Description</label>
                              <textarea
                                rows={4}
                                placeholder="Write project instructions here..."
                                value={orderFormData.brief}
                                onChange={(e) => setOrderFormData({...orderFormData, brief: e.target.value})}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium resize-none transition-all"
                              />
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 ml-2">Reference Image</label>
                              <div 
                                className={cn(
                                  "relative w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 transition-all hover:bg-white/[0.02] cursor-pointer overflow-hidden",
                                  orderFormData.referenceImage ? "border-primary/40 bg-primary/5" : "border-white/5"
                                )}
                                onPaste={(e) => {
                                  const item = e.clipboardData.items[0];
                                  if (item?.type.includes('image')) {
                                    const blob = item.getAsFile();
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setOrderFormData({...orderFormData, referenceImage: event.target?.result as string});
                                    };
                                    if (blob) reader.readAsDataURL(blob);
                                  }
                                }}
                              >
                                {orderFormData.referenceImage ? (
                                  <>
                                    <img src={orderFormData.referenceImage} className="w-full h-full object-contain" alt="" />
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setOrderFormData({...orderFormData, referenceImage: ''}); }}
                                      className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all shadow-xl active:scale-95"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <div className="text-center">
                                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/20 mx-auto mb-4 border border-white/5">
                                      <ImageIcon size={28} />
                                    </div>
                                    <p className="text-[10px] font-black font-mono tracking-widest text-white/20 uppercase">Ctrl+V to Paste or Drop Image</p>
                                  </div>
                                )}
                                <input 
                                  type="text" 
                                  placeholder="Or paste external URL..."
                                  value={orderFormData.referenceImage}
                                  onChange={(e) => setOrderFormData({...orderFormData, referenceImage: e.target.value})}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-6 w-full bg-[#171c23] border border-white/5 rounded-xl px-4 py-3 text-[10px] text-white/40 focus:outline-none focus:border-primary/30"
                                />
                              </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                              <button 
                                type="button" 
                                onClick={cancelOrderEdit}
                                className="flex-1 py-5 bg-white/5 text-white/40 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit" 
                                className="flex-[2] py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20"
                              >
                                {isEditingOrder ? 'Update Client Record' : 'Create New Record'}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Grouped Orders using rounded bubbles/cards */}
                {Object.entries(
                  orders.reduce((groups: any, order) => {
                    const date = order.createdAt?.toDate();
                    const month = date?.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) || 'System Generated';
                    if (!groups[month]) groups[month] = [];
                    groups[month].push(order);
                    return groups;
                  }, {})
                ).reverse().map(([month, monthOrders]: [string, any]) => (
                  <div key={month} className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="px-6 py-2 bg-white/5 rounded-full border border-white/10">
                        <span className="text-xs font-black uppercase tracking-widest text-primary">{month}</span>
                      </div>
                      <div className="h-[1px] flex-grow bg-white/5" />
                      <button 
                        onClick={() => exportMonthlyRecap(month, monthOrders)}
                        className="text-[10px] font-black text-white/20 hover:text-primary transition-colors flex items-center gap-3 uppercase tracking-widest"
                      >
                        <Download size={16} /> Monthly Report
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* PESANAN MASUK (UNACCEPTED) */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] rounded-3xl border border-white/5 backdrop-blur-md">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center">
                              <Inbox size={16} />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-[0.2em]">Pesanan Masuk</h4>
                          </div>
                          <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-white/40">
                             {monthOrders.filter((o: Order) => !o.isAccepted).length} items
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          {dataLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="p-6 bg-white/5 rounded-[2rem] border border-white/5 animate-pulse space-y-4">
                                <div className="flex gap-4">
                                  <Skeleton className="w-12 h-12 rounded-xl" />
                                  <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-1/4" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Skeleton className="h-10 flex-1 rounded-xl" />
                                  <Skeleton className="h-10 flex-[1.5] rounded-xl" />
                                </div>
                              </div>
                            ))
                          ) : (
                            monthOrders.filter((o: Order) => !o.isAccepted).map((o: Order) => (
                              <motion.div 
                                key={o.id}
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                className="glass bg-[#1c232d]/20 backdrop-blur-sm p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group relative hover:border-orange-500/30 transition-all shadow-lg"
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-sm text-primary border border-white/5">
                                      {o.clientName.charAt(0)}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-sm leading-none mb-1">{o.clientName}</h4>
                                      <div className="flex items-center gap-2">
                                        <MessageCircle size={8} className="text-white/20" />
                                        <span className="text-[9px] font-mono text-white/40 tracking-wider">WA: {o.whatsapp?.slice(0, 4)}...</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <button onClick={() => handleOrderEditClick(o)} className="p-2 transition-colors text-white/20 hover:text-blue-400 bg-white/5 rounded-lg"><Edit3 size={14} /></button>
                                    <button onClick={() => handleDelete(o.id, 'orders')} className="p-2 transition-colors text-white/20 hover:text-red-400 bg-white/5 rounded-lg"><Trash2 size={14} /></button>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setSelectedOrder(o)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                                  >
                                    Details
                                  </button>
                                  <button 
                                    onClick={() => acceptOrder(o.id)}
                                    className="flex-[1.5] py-3 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                  >
                                    <Check size={14} /> Terima Orderan
                                  </button>
                                </div>
                              </motion.div>
                            ))
                          )}
                          {monthOrders.filter((o: Order) => !o.isAccepted).length === 0 && (
                            <div className="py-12 text-center bg-white/[0.02] rounded-[2rem] border border-dashed border-white/5">
                              <p className="text-[10px] text-white/10 uppercase font-black tracking-widest">Antrian Kosong</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PESANAN DITERIMA (ACCEPTED) */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] rounded-3xl border border-white/5 backdrop-blur-md">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center">
                              <ClipboardCheck size={16} />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-[0.2em]">Pesanan Diterima</h4>
                          </div>
                          <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-white/40">
                             {monthOrders.filter((o: Order) => o.isAccepted).length} items
                          </span>
                        </div>

                        <div className="space-y-4">
                          {monthOrders.filter((o: Order) => o.isAccepted).map((o: Order) => (
                            <motion.div 
                              key={o.id}
                              initial={{ opacity: 0, x: 10 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              className="glass bg-[#1c232d]/40 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group relative hover:border-primary/20 transition-all"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-sm text-primary border border-white/5 group-hover:scale-105 transition-all">
                                    {o.clientName.charAt(0)}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm leading-none mb-1">{o.clientName}</h4>
                                    <div className="flex items-center gap-2">
                                      <MessageCircle size={8} className="text-white/20" />
                                      <span className="text-[9px] font-mono text-white/40 tracking-wider">WA: {o.whatsapp?.slice(0, 4)}...</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button onClick={() => handleOrderEditClick(o)} className="p-2 transition-colors text-white/20 hover:text-blue-400 bg-white/5 rounded-lg"><Edit3 size={14} /></button>
                                  <button onClick={() => handleDelete(o.id, 'orders')} className="p-2 transition-colors text-white/20 hover:text-red-400 bg-white/5 rounded-lg"><Trash2 size={14} /></button>
                                </div>
                              </div>
    
                              <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center px-4 py-2 bg-white/[0.02] rounded-xl border border-white/5">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-white/10">Status</span>
                                  <div className={cn(
                                    "px-3 py-1 rounded-lg flex items-center gap-2",
                                    o.status === 'Selesai' ? "bg-green-500/10 text-green-500" :
                                    o.status === 'Prosess' ? "bg-blue-500/10 text-blue-500" :
                                    o.status === 'Dibatalkan' ? "bg-red-500/10 text-red-500" :
                                    "bg-orange-500/10 text-orange-500"
                                  )}>
                                    <div className={cn("w-1 h-1 rounded-full", 
                                      o.status === 'Selesai' ? "bg-green-500" : 
                                      o.status === 'Prosess' ? "bg-blue-500" :
                                      o.status === 'Dibatalkan' ? "bg-red-500" : 
                                      "bg-orange-500"
                                    )} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">{o.status}</span>
                                  </div>
                                </div>
                              </div>
    
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setSelectedOrder(o)}
                                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                                >
                                  Details
                                </button>
                                <button
                                  onClick={async () => {
                                    const nextStatusMap: Record<string, Order['status']> = {
                                      'Belum Dimulai': 'Dalam Antrian',
                                      'Dalam Antrian': 'Prosess',
                                      'Prosess': 'Selesai',
                                      'Selesai': 'Belum Dimulai'
                                    };
                                    const newStatus = nextStatusMap[o.status] || 'Belum Dimulai';
                                    await updateOrderStatus(o.id, newStatus);
                                  }}
                                  className="flex-[1.5] py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-primary transition-all active:scale-95"
                                >
                                  Update Status
                                </button>
                              </div>
                            </motion.div>
                          ))}
                          {monthOrders.filter((o: Order) => o.isAccepted).length === 0 && (
                            <div className="py-12 text-center bg-white/[0.02] rounded-[2rem] border border-dashed border-white/5">
                              <p className="text-[10px] text-white/10 uppercase font-black tracking-widest">Belum Ada Order Diterima</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {orders.length === 0 && (
                  <div className="py-32 text-center bg-[#1c232d] rounded-[3rem] border-2 border-dashed border-white/5">
                    <p className="text-white/20 italic font-medium">No work requests received yet.</p>
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'banners' ? (
              <motion.div 
                key="banners"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-display font-black tracking-tight mb-2">Banner Setting</h1>
                    <p className="text-white/30 font-medium">Manage horizontal scroll banners for each service category.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-12">
                    <div className="glass bg-[#1c232d]/40 backdrop-blur-xl p-8 lg:p-12 rounded-[2.5rem] border border-white/10">
                      <form onSubmit={handleBannerSubmit} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-8">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Service Category</label>
                              <select 
                                value={bannerFormData.type}
                                onChange={(e) => {
                                  const newType = e.target.value;
                                  setBannerFormData({ images: ['', '', ''], type: newType });
                                }}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium appearance-none transition-all"
                              >
                                {['logo', 'ilustrasi', 'banner', 'design-jersey', 'packaging', 'design-kaos'].map(t => (
                                  <option key={t} value={t} className="bg-[#171c23]">{t.toUpperCase().replace(/-/g, ' ')}</option>
                                ))}
                              </select>
                            </div>

                            <div className="p-6 bg-orange-500/5 border border-orange-500/20 rounded-3xl flex items-start gap-4">
                              <AlertCircle className="text-orange-500 shrink-0 mt-1" size={20} />
                              <p className="text-xs text-orange-500/80 leading-relaxed font-medium">
                                <strong className="text-orange-500 font-black uppercase tracking-widest block mb-1">Banner Rules</strong>
                                Unggah 3 gambar untuk hasil terbaik. Gambar akan muncul di halaman order service yang dipilih dengan animasi scroll otomatis.
                              </p>
                            </div>

                            <button 
                              type="submit"
                              className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 active:scale-95 flex items-center justify-center gap-3"
                            >
                              <CheckCircle size={20} />
                              Save Banner Set
                            </button>
                          </div>

                          <div className="space-y-6">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Banner Images (1260 x 540 px)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {[0, 1, 2].map((index) => (
                                <div key={index} className="space-y-3">
                                  <div className="relative group aspect-[3/4] rounded-2xl overflow-hidden border-2 border-dashed border-white/10 hover:border-primary/40 transition-all">
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={(e) => handleBannerFileChange(index, e)} 
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                    />
                                    {bannerFormData.images[index] ? (
                                      <img src={bannerFormData.images[index]} className="w-full h-full object-cover" alt={`Banner ${index + 1}`} />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-white/[0.02] text-white/20">
                                        <Plus size={24} />
                                        <span className="text-[8px] font-bold uppercase mt-2 tracking-widest">Image {index + 1}</span>
                                      </div>
                                    )}
                                  </div>
                                  <input 
                                    type="text"
                                    placeholder="Or paste URL..."
                                    value={bannerFormData.images[index]}
                                    onChange={(e) => {
                                      const newImages = [...bannerFormData.images];
                                      newImages[index] = e.target.value;
                                      setBannerFormData({ ...bannerFormData, images: newImages });
                                    }}
                                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-[9px] font-medium focus:outline-none focus:border-primary/30"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>

                    <div className="mt-12 space-y-6">
                      <h3 className="text-xl font-display font-black flex items-center gap-3">
                        <Monitor size={24} className="text-primary" />
                        Existing Banner Archive
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {banners.map(b => (
                          <div key={b.id} className="glass bg-[#1c232d]/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/5 group hover:border-primary/20 transition-all flex flex-col gap-6">
                            <div className="flex justify-between items-center">
                              <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                                {b.type.replace(/-/g, ' ')}
                              </span>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => setBannerFormData({ type: b.type, images: [...b.images, '', '', ''].slice(0, 3) })}
                                  className="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary text-white/20 rounded-xl transition-all"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button 
                                  onClick={() => deleteBanner(b.id)}
                                  className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-white/20 rounded-xl transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {b.images.map((img, i) => (
                                <div key={i} className="flex-1 aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/5">
                                  <img src={img} className="w-full h-full object-cover" alt="" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {banners.length === 0 && (
                          <div className="col-span-full py-20 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/5">
                            <p className="text-white/20 font-black uppercase tracking-widest text-xs italic">Archive is currently empty</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'portfolio' ? (
              <motion.div 
                key="portfolio"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-display font-black tracking-tight mb-2">Visual Archive</h1>
                    <p className="text-white/30 font-medium">Publish your creative works to the main portfolio collections.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-12">
                    <div className="glass bg-[#1c232d]/40 backdrop-blur-xl p-8 lg:p-12 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <Briefcase size={120} />
                      </div>
                      
                      <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Project Identity</label>
                                <input
                                  required
                                  type="text"
                                  placeholder="Project Title"
                                  value={formData.title}
                                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium transition-all"
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Category Selection</label>
                                <select
                                  value={formData.category}
                                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium appearance-none transition-all"
                                >
                                  {['logo', 'ilustrasi', 'banner', 'design-jersey', 'packaging', 'design-kaos'].map(c => (
                                    <option key={c} value={c} className="bg-[#171c23]">{c.toUpperCase().replace(/-/g, ' ')}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Creative Insights</label>
                              <textarea
                                required
                                rows={4}
                                placeholder="Describe the conceptual background of this project..."
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-primary/50 text-sm font-medium resize-none transition-all h-32"
                              />
                            </div>

                            <div className="flex gap-4">
                              {isEditing ? (
                                <>
                                  <button onClick={cancelEdit} type="button" className="flex-1 py-5 bg-white/5 text-white/40 hover:text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all">Reject Change</button>
                                  <button type="submit" className="flex-[2] py-5 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30">
                                    COMMIT AMENDMENT
                                  </button>
                                </>
                              ) : (
                                <button type="submit" className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 active:scale-95 flex items-center justify-center gap-3">
                                  <CheckCircle size={20} />
                                  SECURE TO ARCHIVE
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="flex items-center justify-between ml-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Project Visual Asset</label>
                              <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                                <button type="button" onClick={() => setUseLocalFile(false)} className={cn("px-4 py-1.5 text-[10px] rounded-lg transition-all font-black uppercase tracking-widest", !useLocalFile ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/20")}>URL</button>
                                <button type="button" onClick={() => setUseLocalFile(true)} className={cn("px-4 py-1.5 text-[10px] rounded-lg transition-all font-black uppercase tracking-widest", useLocalFile ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/20")}>Local</button>
                              </div>
                            </div>

                            <div className="relative group aspect-video lg:aspect-square rounded-[2rem] overflow-hidden border-2 border-dashed border-white/10 hover:border-primary/40 transition-all bg-white/[0.02]">
                              {useLocalFile ? (
                                <>
                                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                  <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                                    {imagePreview ? (
                                      <img src={imagePreview} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      <>
                                        <div className="p-6 rounded-full bg-white/5 mb-4 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                          <Plus size={32} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.2em]">Upload High-Res Media</span>
                                      </>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col gap-4 p-8 items-center justify-center">
                                  {formData.image ? (
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden">
                                      <img src={formData.image} className="w-full h-full object-cover" alt="" />
                                    </div>
                                  ) : (
                                    <div className="text-center opacity-20">
                                      <ImageIcon size={48} className="mx-auto mb-4" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Direct Link...</p>
                                    </div>
                                  )}
                                  <input
                                    required
                                    type="url"
                                    placeholder="https://example.com/asset.jpg"
                                    value={formData.image}
                                    onChange={(e) => {
                                      setFormData({...formData, image: e.target.value}); 
                                      setImagePreview(e.target.value);
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono focus:outline-none focus:border-primary/50 text-center"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>

                    <div className="mt-16 space-y-8">
                       <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-display font-black flex items-center gap-3">
                            <Monitor size={28} className="text-primary" />
                            Active Gallery Archive
                          </h3>
                          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 font-mono text-[10px] text-white/40 tracking-widest uppercase">
                            {projects.length} Entries Registered
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                         {dataLoading ? (
                           Array.from({ length: 4 }).map((_, i) => (
                             <div key={i} className="aspect-square rounded-[2.5rem] bg-white/5 animate-pulse" />
                           ))
                         ) : (
                           projects.map(p => (
                             <div key={p.id} className={cn(
                              "glass bg-[#1c232d]/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group hover:border-primary/30 transition-all flex flex-col border border-white/5",
                              isEditing === p.id && "border-primary shadow-2xl shadow-primary/10"
                             )}>
                               <div className="aspect-square relative overflow-hidden">
                                 <img src={p.image} className="w-full h-full object-cover transform duration-1000 group-hover:scale-110" alt="" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-[#1c232d] to-transparent opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 duration-500">
                                   <div className="absolute bottom-6 inset-x-6 flex gap-3">
                                     <button 
                                       onClick={() => handleEditClick(p)} 
                                       className="flex-[2] py-4 bg-white/90 backdrop-blur-md text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-primary hover:text-white transition-all active:scale-95"
                                     >
                                       REVISE
                                     </button>
                                     <button 
                                       onClick={() => handleDelete(p.id)} 
                                       className="flex-1 py-4 bg-red-500 text-white rounded-2xl transition-all flex items-center justify-center active:scale-95 shadow-xl shadow-red-500/20"
                                     >
                                       <Trash2 size={18} />
                                     </button>
                                   </div>
                                 </div>
                                 <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-primary/20 backdrop-blur-md rounded-full border border-primary/20 text-[8px] font-black uppercase tracking-widest text-primary">
                                   {p.category.replace(/-/g, ' ')}
                                 </div>
                               </div>
                               <div className="p-8 flex-grow">
                                  <h4 className="text-xl font-black mb-3 tracking-tight leading-tight">{p.title}</h4>
                                  <p className="text-[10px] text-white/40 leading-relaxed line-clamp-3 font-medium">{p.description}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                       
                       {projects.length === 0 && (
                         <div className="py-24 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/5">
                           <Inbox className="mx-auto text-white/10 mb-4" size={48} />
                           <p className="text-white/20 font-black uppercase tracking-widest text-xs italic">The archive is currently empty</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'settings' ? (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto space-y-12"
              >
                <div className="text-center md:text-left">
                  <h1 className="text-4xl lg:text-5xl font-display font-black tracking-tight">Access Control</h1>
                  <p className="text-white/30 font-medium mt-2">Manage your administrative environment and security.</p>
                </div>

                <div className="grid grid-cols-1 gap-12">
                  <div className="glass bg-[#1c232d]/40 backdrop-blur-3xl p-8 lg:p-12 rounded-[3.5rem] border border-white/5 space-y-12">
                    <div className="flex flex-col md:flex-row items-center gap-8 p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl -z-10" />
                      <img src={user.photoURL || ''} className="w-24 h-24 rounded-3xl border-2 border-primary/20 shadow-2xl shadow-primary/20 group-hover:scale-105 transition-transform duration-500" alt="profile" />
                      <div className="text-center md:text-left">
                        <h3 className="text-3xl font-black tracking-tight">{user.displayName}</h3>
                        <p className="text-white/30 font-mono text-xs uppercase tracking-widest break-all mt-1">{user.email}</p>
                        <div className="flex items-center justify-center md:justify-start gap-2.5 mt-4">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-green-500 uppercase tracking-widest bg-green-500/5 px-3 py-1 rounded-full border border-green-500/10">Active Session</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 ml-4">System Preferences</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button 
                          onClick={toggleTheme}
                          className="p-8 bg-white/[0.03] rounded-3xl border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all text-left w-full"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
                              {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                            </div>
                            <div>
                                <span className="font-black text-xs uppercase tracking-widest text-white/80 block mb-1">Appearance</span>
                                <span className="text-[10px] font-medium text-white/20">Current: {theme.toUpperCase()}</span>
                            </div>
                          </div>
                          <div className={cn(
                            "w-14 h-7 rounded-full relative transition-all duration-500 border border-white/5",
                            theme === 'dark' ? "bg-primary shadow-lg shadow-primary/30" : "bg-base-content/10"
                          )}>
                            <div className={cn(
                              "absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-md",
                              theme === 'dark' ? "right-1" : "left-1"
                            )} />
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row gap-6">
                      <button 
                        onClick={() => signOut(auth)}
                        className="flex-[1.5] py-6 bg-red-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-4 shadow-2xl shadow-red-500/20 group"
                      >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        TERMINATE SESSION
                      </button>
                      <button 
                        onClick={onBack}
                        className="flex-1 py-6 bg-white/5 text-white/40 border border-white/5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-dark transition-all active:scale-95"
                      >
                        BACK TO SITE
                      </button>
                    </div>
                  </div>

                  <div className="glass bg-orange-500/5 p-8 lg:p-10 rounded-[3rem] border border-orange-500/10 flex items-start gap-8 group">
                    <div className="w-16 h-16 bg-orange-500 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl shadow-orange-500/20 group-hover:rotate-6 transition-transform duration-500">
                      <AlertCircle size={32} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg mb-2 uppercase tracking-tight text-orange-500">Security Invariant</h4>
                      <p className="text-xs text-orange-500/60 leading-relaxed font-medium">
                        Administrative access granted. All modifications to project records and client orders are live and permanent. 
                        Please verify the creative integrity of all data before final deployment to the production archive.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
          />
        )}
        
        {showCropModal && imageToCrop && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-[#1c232d] rounded-[2.5rem] border border-white/10 w-full max-w-4xl overflow-hidden flex flex-col h-[80vh]">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div>
                  <h2 className="text-2xl font-display font-black">Crop Banner Image</h2>
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-1">Adjust position to fit 1260x540 aspect</p>
                </div>
                <button 
                  onClick={() => {
                    setShowCropModal(false);
                    setImageToCrop(null);
                  }}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="relative flex-grow bg-black">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1260 / 540}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="p-8 bg-white/[0.02] border-t border-white/5 space-y-6">
                <div className="flex items-center gap-6">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Zoom Level</span>
                   <input
                     type="range"
                     value={zoom}
                     min={1}
                     max={3}
                     step={0.1}
                     aria-labelledby="Zoom"
                     onChange={(e) => setZoom(Number(e.target.value))}
                     className="flex-grow accent-primary h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                   />
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setShowCropModal(false);
                      setImageToCrop(null);
                    }}
                    className="flex-1 py-4 bg-white/5 text-white/40 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveCrop}
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                  >
                    <Crop size={18} />
                    Apply Crop & Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
