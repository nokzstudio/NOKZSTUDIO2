import Swal from 'sweetalert2';

export const glassSwal = Swal.mixin({
  background: 'transparent',
  color: '#fff',
  customClass: {
    popup: 'glass-swal',
    title: 'text-white font-display font-bold',
    htmlContainer: 'text-white/70 font-sans',
    confirmButton: 'bg-primary hover:bg-primary/80 text-white font-bold px-8 py-3 rounded-xl transition-all active:scale-95 border-none outline-none',
    cancelButton: 'bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-3 rounded-xl transition-all active:scale-95 border-none outline-none'
  },
  buttonsStyling: false,
});

export default glassSwal;
