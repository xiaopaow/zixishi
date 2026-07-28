import { X } from 'lucide-react';
import { useEffect, type PropsWithChildren } from 'react';

interface ModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  onClose?: () => void;
  className?: string;
}

export function Modal({ open, title, onClose, className = '', children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-card ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          {onClose && (
            <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          )}
        </header>
        {children}
      </section>
    </div>
  );
}
