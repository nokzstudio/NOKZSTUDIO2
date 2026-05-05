import { useState } from 'react';
import { motion } from 'motion/react';
import { LayoutGrid } from 'lucide-react';
import { auth, signInWithGoogle } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { ALLOWED_ADMIN_EMAILS } from '../lib/constants';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      if (user.email && ALLOWED_ADMIN_EMAILS.includes(user.email)) {
        onLogin(user.displayName || 'Admin');
      } else {
        await auth.signOut();
        setError('Unauthorized account');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center p-6 font-sans overflow-hidden transition-colors duration-500">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass rounded-[2.5rem] border border-base-content/5 p-12 text-center relative z-10 shadow-2xl shadow-base-content/5"
      >
        <div className="w-20 h-20 bg-base-content/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-base-content/10 group-hover:scale-110 transition-transform">
          <LayoutGrid size={40} className="text-secondary/80" />
        </div>
        
        <h1 className="text-3xl font-display font-black text-base-content mb-4 tracking-tight uppercase">Admin Only</h1>
        <p className="text-base-content/40 text-[13px] leading-relaxed mb-12 font-medium px-4">
          Only authorized creators can access the portfolio management suite.
        </p>

        <div className="space-y-4">
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 bg-base-content text-surface rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl hover:opacity-90 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Login with Google
          </button>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-[10px] font-black uppercase tracking-widest pt-2"
            >
              {error}
            </motion.p>
          )}

          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 text-base-content/30 hover:text-base-content transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Back to Website
          </button>
        </div>
      </motion.div>
    </div>
  );
}
