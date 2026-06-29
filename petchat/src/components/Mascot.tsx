import { useState, useEffect, useRef } from 'react';

interface Props {
  onTap?: () => void;
  message?: string;
}

export default function Mascot({ onTap, message }: Props) {
  const [isWagging, setIsWagging] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [showBubble, setShowBubble] = useState(!!message);
  const wagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wagInterval = setInterval(() => {
      setIsWagging(true);
      wagTimerRef.current = setTimeout(() => setIsWagging(false), 600);
    }, 4000);
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      blinkTimerRef.current = setTimeout(() => setIsBlinking(false), 150);
    }, 3500);
    return () => {
      clearInterval(wagInterval);
      clearInterval(blinkInterval);
      if (wagTimerRef.current) clearTimeout(wagTimerRef.current);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (message) { setShowBubble(true); const t = setTimeout(() => setShowBubble(false), 4000); return () => clearTimeout(t); }
  }, [message]);

  const handleClick = () => {
    setIsWagging(true);
    wagTimerRef.current = setTimeout(() => setIsWagging(false), 600);
    onTap?.();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {showBubble && message && (
        <div className="px-4 py-2.5 rounded-2xl rounded-br-none shadow-lg text-sm font-medium max-w-48 text-right animate-scale-in"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          {message}
        </div>
      )}

      <button
        onClick={handleClick}
        className="relative w-14 h-14 select-none outline-none focus:ring-2 focus:ring-blue-400 rounded-full"
        style={{ animation: 'float 3s ease-in-out infinite' }}
        title="Click me!"
        aria-label="BuddyDesk mascot"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-lg"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Body */}
          <ellipse cx="50" cy="65" rx="30" ry="25" fill="#F59E0B" />
          {/* Head */}
          <circle cx="50" cy="42" r="26" fill="#F59E0B" />
          {/* Ears */}
          <ellipse cx="27" cy="24" rx="10" ry="14" fill="#D97706" style={{ transform: 'rotate(-15deg)', transformOrigin: '27px 24px' }} />
          <ellipse cx="73" cy="24" rx="10" ry="14" fill="#D97706" style={{ transform: 'rotate(15deg)', transformOrigin: '73px 24px' }} />
          <ellipse cx="27" cy="24" rx="6" ry="9" fill="#FBBF24" style={{ transform: 'rotate(-15deg)', transformOrigin: '27px 24px' }} />
          <ellipse cx="73" cy="24" rx="6" ry="9" fill="#FBBF24" style={{ transform: 'rotate(15deg)', transformOrigin: '73px 24px' }} />
          {/* Eyes */}
          {isBlinking ? (
            <>
              <ellipse cx="40" cy="40" rx="7" ry="1.5" fill="#1E293B" />
              <ellipse cx="60" cy="40" rx="7" ry="1.5" fill="#1E293B" />
            </>
          ) : (
            <>
              <circle cx="40" cy="40" r="7" fill="white" />
              <circle cx="60" cy="40" r="7" fill="white" />
              <circle cx="41" cy="40" r="4" fill="#1E293B" />
              <circle cx="61" cy="40" r="4" fill="#1E293B" />
              <circle cx="42" cy="38" r="1.5" fill="white" />
              <circle cx="62" cy="38" r="1.5" fill="white" />
            </>
          )}
          {/* Nose */}
          <ellipse cx="50" cy="50" rx="5" ry="3.5" fill="#92400E" />
          {/* Mouth */}
          <path d="M 44 55 Q 50 61 56 55" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Tail */}
          <path
            d="M 78 65 Q 95 55 90 42"
            stroke="#D97706" strokeWidth="8" fill="none" strokeLinecap="round"
            style={isWagging ? { animation: 'wag 0.3s ease-in-out infinite alternate' } : {}}
          />
          {/* Belly patch */}
          <ellipse cx="50" cy="70" rx="16" ry="14" fill="#FDE68A" />
          {/* Paws */}
          <ellipse cx="30" cy="86" rx="10" ry="7" fill="#F59E0B" />
          <ellipse cx="70" cy="86" rx="10" ry="7" fill="#F59E0B" />
          {/* Collar */}
          <rect x="35" y="60" width="30" height="5" rx="2.5" fill="#3B82F6" />
          <circle cx="50" cy="62" r="2.5" fill="#FBBF24" />
        </svg>
      </button>
    </div>
  );
}
