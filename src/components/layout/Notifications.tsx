import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUIStore, type Notification } from '../../state/uiStore';

const ICONS: Record<Notification['tone'], typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const TONES: Record<Notification['tone'], string> = {
  info: 'border-accent/40 text-accent',
  success: 'border-success/40 text-success',
  warning: 'border-warn/40 text-warn',
  error: 'border-danger/40 text-danger',
};

/** Transient toast notifications from application actions. */
export function Notifications() {
  const notifications = useUIStore((state) => state.notifications);
  const dismiss = useUIStore((state) => state.dismissNotification);

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[80] flex w-72 flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = ICONS[notification.tone];
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className={`orb-panel-raised pointer-events-auto flex items-start gap-2 rounded-[3px] border px-3 py-2 shadow-xl ${TONES[notification.tone]}`}
            >
              <Icon size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1 text-[10px] leading-relaxed text-ink">{notification.message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(notification.id)}
                className="text-faint hover:text-ink"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
