
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Notification } from '../types';
import { getAccountNotifications, markNotificationAsRead, deleteNotification, checkAndGenerateNotifications, markAllAsRead } from '../services/notificationService';
import { Bell, Check, Trash2, AlertCircle, AlertTriangle, Info, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!currentAccount) return;
    const data = await getAccountNotifications(currentAccount.id);
    setNotifications(data);
    setUnreadCount(data.filter(n => !n.isRead).length);
  };

  // Initial check and periodic refresh
  useEffect(() => {
    if (!user || !currentAccount) return;
    
    const init = async () => {
        try {
            // Run generation logic
            await checkAndGenerateNotifications(user.uid, currentAccount.id);
            // Then fetch
            await fetchNotifications();
        } catch (e) {
            console.error("Notification init error", e);
        }
    };
    init();

    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user, currentAccount]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
      if (!currentAccount) return;
      await markAllAsRead(currentAccount.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationClick = async (n: Notification) => {
      if (!n.isRead && n.id) {
          await handleMarkAsRead(n.id);
      }
      if (n.relatedDocId) {
          navigate(`/invoices/edit/${n.relatedDocId}`);
          setIsOpen(false);
      }
  };

  const getIcon = (type: string) => {
      switch (type) {
          case 'error': return <AlertCircle className="text-red-500" size={20} />;
          case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
          case 'success': return <Check className="text-green-500" size={20} />;
          default: return <Info className="text-blue-500" size={20} />;
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm">การแจ้งเตือน</h3>
            {unreadCount > 0 && (
                <button 
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                    อ่านทั้งหมด
                </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <Bell size={32} className="mb-2 opacity-20" />
                <p className="text-sm">ไม่มีการแจ้งเตือนใหม่</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer relative group ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <p className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {n.title}
                            </p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                {new Date(n.createdAt).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                        
                        {n.relatedDocNo && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-primary-600 font-medium bg-primary-50 w-fit px-1.5 py-0.5 rounded border border-primary-100">
                                <FileText size={10} /> {n.relatedDocNo}
                                <ExternalLink size={10} />
                            </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 backdrop-blur rounded p-0.5 shadow-sm">
                        {!n.isRead && n.id && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id!); }}
                                className="p-1 text-slate-400 hover:text-primary-600 rounded hover:bg-primary-50"
                                title="Mark as read"
                            >
                                <Check size={14} />
                            </button>
                        )}
                        {n.id && (
                            <button 
                                onClick={(e) => handleDelete(n.id!, e)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
