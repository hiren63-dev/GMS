import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useApp } from '../../store/useStore';

const icons = {
  success: <CheckCircle size={18} color="var(--accent-success)" />,
  error: <XCircle size={18} color="var(--accent-danger)" />,
  warning: <AlertTriangle size={18} color="var(--accent-warning)" />,
  info: <Info size={18} color="var(--accent-info)" />,
};

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{icons[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
