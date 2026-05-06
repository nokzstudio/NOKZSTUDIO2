import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    try {
      // Try to see if it's a JSON error from our Firestore handler
      const parsed = JSON.parse(error.message);
      if (parsed.error) {
        this.setState({ errorInfo: parsed.error });
      }
    } catch {
      // Not a JSON error
    }
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError = this.state.error?.message?.toLowerCase().includes('quota') || 
                           this.state.errorInfo?.toLowerCase().includes('quota');

      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-sans text-white">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertCircle size={40} />
            </div>
            
            <h1 className="text-2xl font-display font-black mb-4 tracking-tight">
              {isQuotaError ? 'Waduh, Kuota Penuh!' : 'Ada Masalah Dikit, Bos!'}
            </h1>
            
            <p className="text-base-content/60 mb-8 leading-relaxed">
              {isQuotaError 
                ? 'Maaf bos, website lagi rame banget sampe kuota database-nya habis. Silakan coba lagi nanti ya, atau hubungi saya langsung!' 
                : 'Sepertinya ada kesalahan teknis. Coba refresh halamannya dulu, kalau masih error kabari saya ya!'}
            </p>

            {this.state.errorInfo && (
              <div className="mb-8 p-4 bg-black/40 rounded-xl text-left border border-white/5">
                <p className="text-[10px] font-mono text-white/40 uppercase mb-2">Error Detail:</p>
                <p className="text-xs font-mono text-red-400/80 break-words leading-tight">{this.state.errorInfo}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 bg-primary py-4 rounded-full font-bold text-sm active:scale-95 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 text-black"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 bg-white/10 py-4 rounded-full font-bold text-sm active:scale-95 transition-all hover:bg-white/20 border border-white/10"
              >
                <Home size={18} />
                Beranda
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
