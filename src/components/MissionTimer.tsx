import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';

interface MissionTimerProps {
  createdAt: string;
  interventionDelay: string;
}

export const MissionTimer: React.FC<MissionTimerProps> = ({ createdAt, interventionDelay }) => {
  const [percentage, setPercentage] = useState(100);
  const [timeLeft, setTimeLeft] = useState('');

  const totalMinutes = interventionDelay.includes('Rayon') ? 45 : 30;
  const totalMs = totalMinutes * 60 * 1000;

  useEffect(() => {
    const updateTimer = () => {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const elapsedMs = now.getTime() - createdDate.getTime();
      const remainingMs = Math.max(0, totalMs - elapsedMs);
      
      const calcPercentage = Math.min(100, (elapsedMs / totalMs) * 100);
      setPercentage(calcPercentage);

      const minutes = Math.floor(remainingMs / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt, totalMs]);

  const getColor = () => {
    if (percentage < 50) return 'bg-emerald-500';
    if (percentage < 80) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="w-full mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Clock className={`w-3.5 h-3.5 ${percentage > 80 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          <span className={`text-[11px] font-bold tracking-tight ${percentage > 80 ? 'text-rose-500' : 'text-slate-600'}`}>
            {timeLeft} Restant
          </span>
        </div>
        <span className={`text-[11px] font-black tracking-tighter ${percentage > 80 ? 'text-rose-500' : 'text-slate-900'}`}>
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${getColor()}`}
        />
      </div>
    </div>
  );
};
