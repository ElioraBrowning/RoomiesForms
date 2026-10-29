import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  createdAt: string;
  read: boolean;
}

const POLL_MS = 45_000;

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ unread: number; items: AppNotification[] }>('/notifications');
      setItems(res.data.items);
      setUnread(res.data.unread);
    } catch {
      // Keep showing what we had; the next poll will try again.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const markRead = async (id: number) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - (items.find((n) => n.id === id && !n.read) ? 1 : 0)));
    await api.post(`/notifications/${id}/read`).catch(() => undefined);
  };

  const markAllRead = async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await api.post('/notifications/read-all').catch(() => undefined);
  };

  return { items, unread, markRead, markAllRead, refresh };
}