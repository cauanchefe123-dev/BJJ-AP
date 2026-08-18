import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Bell, Check, Trash2, Target, Megaphone, BellRing, ShieldCheck, X, Sparkles, Volume2 } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    requestPushPermission,
    pushPermissionStatus,
  } = useData();

  const { currentUser } = useAuth();
  const userId = currentUser?.id || 'guest';

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.readBy.includes(userId)).length;

  const handleTogglePush = async () => {
    await requestPushPermission();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md h-[90vh] flex flex-col text-white shadow-2xl overflow-hidden relative my-auto">
        
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                Notificações & Alertas
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                    {unreadCount} novas
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Foco das turmas e comunicados da academia</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Fechar Notificações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Notification Permission Box */}
        <div className="p-3 bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-400" />
              Notificações Push no Navegador
            </span>
            <p className="text-[10px] text-slate-400">
              {pushPermissionStatus === 'granted'
                ? 'Alertas de tatame ativos no dispositivo.'
                : 'Ative para receber avisos do professor em tempo real.'}
            </p>
          </div>

          {pushPermissionStatus === 'granted' ? (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              Push Ativo
            </span>
          ) : (
            <button
              onClick={handleTogglePush}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shadow-sm transition-all shrink-0"
            >
              Ativar Push
            </button>
          )}
        </div>

        {/* Actions Bar */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">Total: {notifications.length} avisos</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllNotificationsAsRead(userId)}
              className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Bell className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
              <p className="text-xs text-slate-400 font-medium">Nenhuma notificação recebida no momento.</p>
            </div>
          ) : (
            notifications.map(notif => {
              const isRead = notif.readBy.includes(userId);
              return (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id, userId)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                    isRead
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-75'
                      : 'bg-slate-900 border-amber-500/40 shadow-lg ring-1 ring-amber-500/20'
                  }`}
                >
                  {!isRead && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl text-slate-950 shrink-0 font-bold ${
                      notif.type === 'WEEKLY_FOCUS'
                        ? 'bg-amber-400'
                        : 'bg-blue-400'
                    }`}>
                      {notif.type === 'WEEKLY_FOCUS' ? (
                        <Target className="w-4 h-4" />
                      ) : (
                        <Megaphone className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          {notif.type === 'WEEKLY_FOCUS' ? 'Foco da Semana' : 'Aviso da Academia'}
                        </span>
                        {notif.targetClassName && (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md truncate max-w-[140px]">
                            {notif.targetClassName}
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-100">{notif.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">{notif.message}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      {notif.authorName ? `Por: ${notif.authorName} • ` : ''}
                      {new Date(notif.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                      title="Excluir notificação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500">
            BJJCRON — Notificações em Tempo Real para Alunos e Professores
          </p>
        </div>

      </div>
    </div>
  );
};
