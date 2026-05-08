import { useState } from 'react';
import { motion } from 'motion/react';
import { LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = () => {
    onLogin(username, password);
  };

  return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center p-6 font-sans overflow-hidden transition-colors duration-500">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass rounded-[2.5rem] border border-base-content/5 p-12 text-center relative z-10 shadow-2xl shadow-base-content/5"
      >
        <div className="w-20 h-20 bg-base-content/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <LayoutGrid size={40} className="text-secondary/80" />
        </div>

        <h1 className="text-3xl font-display font-black text-base-content mb-4 tracking-tight uppercase">
          Admin Login
        </h1>

        <p className="text-base-content/40 text-[13px] leading-relaxed mb-8 font-medium px-4">
          Login menggunakan username dan password admin.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full py-4 px-4 rounded-2xl bg-base-content/5 border border-base-content/10 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-4 px-4 rounded-2xl bg-base-content/5 border border-base-content/10 outline-none"
          />

          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-base-content text-surface rounded-2xl font-bold text-sm transition-all active:scale-95"
          >
            Login
          </button>

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