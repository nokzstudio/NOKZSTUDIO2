import { motion } from 'motion/react';
import { Home, ShoppingBag, Folder, MessageCircle, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { trackOrderClick } from '../services/analyticsService';

const navLinks = [
  { name: 'Home', href: '#home', icon: Home },
  { name: 'Order', href: '#about', icon: ShoppingBag },
  { name: 'Porto', href: '#portfolio', icon: Folder },
  { name: 'Contact', href: '#contact', icon: MessageCircle },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [activeSegment, setActiveSegment] = useState('#home');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      // Update active segment based on scroll
      const sections = navLinks.map(link => link.href.substring(1));
      const scrollPos = window.scrollY + 100;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPos >= offsetTop && scrollPos < offsetTop + offsetHeight) {
            setActiveSegment(`#${section}`);
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Top Header (Brand Only) */}
      <nav
        className={cn(
          'fixed top-0 left-0 w-full z-50 transition-all duration-500 py-3 px-6',
          scrolled ? 'bg-surface/80 backdrop-blur-xl border-b border-base-content/5 shadow-sm' : 'bg-transparent'
        )}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <a href="#home" className="font-display font-black text-xl tracking-tighter transition-colors">
            NOKZ<span className="text-primary">.</span>STUDIO
          </a>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-base-content/5 text-base-content/60 hover:text-primary transition-all active:scale-95 border border-base-content/5"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <a
              href="https://wa.me/6287853895560"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackOrderClick()}
              className="px-5 py-2 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5"
            >
              Order
            </a>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[92%] md:max-w-md px-4">
        <div className="glass bg-surface/40 backdrop-blur-3xl border border-base-content/5 rounded-[2.5rem] p-2 flex items-center justify-between shadow-2xl shadow-base-content/10">
          {navLinks.map((link) => {
            const isActive = activeSegment === link.href;
            return (
              <a
                key={link.name}
                href={link.href}
                className={cn(
                  "relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 gap-1",
                  isActive ? "text-primary bg-primary/10" : "text-base-content/30 hover:text-base-content/60"
                )}
              >
                <link.icon size={20} className={cn("transition-transform duration-300", isActive && "scale-110")} />
                <span className="text-[8px] font-bold uppercase tracking-tighter">
                  {link.name}
                </span>
                
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 border border-primary/20 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}
