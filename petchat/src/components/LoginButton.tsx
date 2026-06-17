import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';

interface LoginButtonProps {
  employeeId: string;
  employeeName: string;
  onLogin: () => void;
  onLogout: () => void;
}

export default function LoginButton({ employeeId, employeeName, onLogin, onLogout }: LoginButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginTime, setLoginTime] = useState<Date | null>(null);
  const [workHours, setWorkHours] = useState('0h 0m');

  useEffect(() => {
    const stored = localStorage.getItem(`login_${employeeId}`);
    if (stored) {
      const loginData = JSON.parse(stored);
      setIsLoggedIn(true);
      setLoginTime(new Date(loginData.time));
    }
  }, [employeeId]);

  useEffect(() => {
    if (!isLoggedIn || !loginTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - loginTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setWorkHours(`${hours}h ${minutes}m`);
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoggedIn, loginTime]);

  const handleLogin = () => {
    const now = new Date();
    localStorage.setItem(`login_${employeeId}`, JSON.stringify({ time: now.toISOString() }));
    setLoginTime(now);
    setIsLoggedIn(true);
    onLogin();
  };

  const handleLogout = () => {
    localStorage.removeItem(`login_${employeeId}`);
    setIsLoggedIn(false);
    setLoginTime(null);
    onLogout();
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">{employeeName}</h3>
        {isLoggedIn && (
          <div className="flex items-center gap-1 text-primary text-sm font-medium">
            <Clock size={14} />
            {workHours}
          </div>
        )}
      </div>

      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Signing Off
        </button>
      ) : (
        <button
          onClick={handleLogin}
          className="w-full bg-secondary text-white py-2 rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2"
        >
          <LogIn size={18} />
          I'm Here
        </button>
      )}
    </div>
  );
}
