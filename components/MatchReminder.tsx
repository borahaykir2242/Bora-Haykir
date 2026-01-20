
import React, { useState, useEffect } from 'react';

interface MatchReminderProps {
  matchDate: string;
  matchId: string;
}

const MatchReminder: React.FC<MatchReminderProps> = ({ matchDate, matchId }) => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [isReminderSet, setIsReminderSet] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`reminder_${matchId}`);
    if (saved) setIsReminderSet(true);
  }, [matchId]);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      scheduleNotification();
    }
  };

  const scheduleNotification = () => {
    // In a real production app, this would be handled by a Service Worker or Backend.
    // For this prototype, we'll simulate the "setting" of a reminder.
    localStorage.setItem(`reminder_${matchId}`, 'true');
    setIsReminderSet(true);
    
    if (Notification.permission === 'granted') {
      new Notification("HalıSaha Pro", {
        body: `${matchDate} tarihli maç için hatırlatıcınız kuruldu!`,
        icon: 'https://cdn-icons-png.flaticon.com/512/33/33736.png'
      });
    }
  };

  if (permission === 'denied') return null;

  return (
    <div className="flex items-center space-x-2">
      {!isReminderSet ? (
        <button 
          onClick={requestPermission}
          className="flex items-center space-x-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
        >
          <i className="fas fa-bell"></i>
          <span>Hatırlatıcı Kur</span>
        </button>
      ) : (
        <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold">
          <i className="fas fa-check-circle"></i>
          <span>Hatırlatıcı Aktif</span>
        </div>
      )}
    </div>
  );
};

export default MatchReminder;
