import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
// ... import lain tetap sama

export default function OrderPage() {
  // ... state lain tetap

  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>(''); // Tambahan untuk upload

  // =========================
  // AMBIL GAMBAR DENGAN CAPACITOR CAMERA
  // =========================
  const handleTakeOrPickImage = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,        // Bisa juga pakai DataUrl
        source: CameraSource.Prompt,             // Pilih Kamera atau Galeri
        width: 1200,
        height: 1200,
        preserveAspectRatio: true,
      });

      setImagePreview(image.webPath!); // Untuk preview

      // Convert ke Blob/File untuk Cloudinary
      const response = await fetch(image.webPath!);
      const blob = await response.blob();
      const file = new File([blob], `reference_${Date.now()}.jpg`, { type: 'image/jpeg' });

      setReferenceImage(file);
      setImageBase64(image.base64String || ''); // cadangan

    } catch (error: any) {
      if (error.message !== 'User cancelled') {
        Swal.fire('Error', 'Gagal mengambil gambar', 'error');
        console.error(error);
      }
    }
  };

  // =========================
  // HANDLE SUBMIT (Diperbaiki)
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

      // Cek limit order (kode ini tetap sama)...

      // UPLOAD IMAGE KE CLOUDINARY
      let imageUrl = '';
      if (referenceImage) {
        try {
          const imageData = new FormData();
          imageData.append('file', referenceImage);
          imageData.append('upload_preset', 'nokz_unsigned');   // pastikan preset ini unsigned

          const response = await fetch(
            'https://api.cloudinary.com/v1_1/dylfsj7g2/image/upload',
            { 
              method: 'POST', 
              body: imageData 
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error?.message || 'Upload gagal');
          }

          imageUrl = data.secure_url || '';
        } catch (error: any) {
          console.error('UPLOAD ERROR:', error);
          Swal.fire({
            title: 'Upload Gambar Gagal',
            text: error.message || 'Cek koneksi internet Anda',
            icon: 'error',
          });
          setLoading(false);
          return;
        }
      }

      // ... sisanya (save to firestore, notifikasi, whatsapp) tetap sama

    } catch (error) {
      // ... error handling
    } finally {
      setLoading(false);
    }
  };

  // Di bagian return (UI)
  {/* IMAGE UPLOAD */}
  <div className="space-y-4">
    <div className="flex items-center gap-3 text-primary">
      <ImageIcon size={18} />
      <label className="text-xs font-black uppercase tracking-[0.2em]">Referensi Gambar</label>
    </div>

    <div
      onClick={handleTakeOrPickImage}   // ← Ganti ini
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