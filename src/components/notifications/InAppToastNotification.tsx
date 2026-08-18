import React, { useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Target, Megaphone, X, BellRing, Sparkles } from 'lucide-react';

export const InAppToastNotification: React.FC = () => {
  const { activeToastNotif, dismissToastNotif } = useData();

  useEffect(() => {
    if (activeToastNotif) {
      const timer = setTimeout(() => {
        dismissToastNotif();
      }, 7000); // dismiss after 7 seconds
      return () => clearTimeout(timer);
    }
  }, [activeToastNotif, dismissToastNotif]);

  if (!activeToastNotif) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce-in shadow-2xl">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 text-white space-y-2 relative shadow-2xl backdrop-blur-md">
        
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Novo Alerta do Tatame!
          </span>
          <button
            onClick={dismissToastNotif}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Fechar Alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black shrink-0 shadow-md">
            {activeToastNotif.type === 'WEEKLY_FOCUS' ? (
              <Target className="w-5 h-5" />
            ) : (
              <Megaphone className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1 pr-2">
            <h4 className="font-extrabold text-xs text-slate-100">{activeToastNotif.title}</h4>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeToastNotif.message}</p>
            {activeToastNotif.authorName && (
              <span className="text-[10px] text-slate-400 block pt-0.5">
                Por: {activeToastNotif.authorName}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
