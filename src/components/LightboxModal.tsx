import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { getCategoryLabel, type PhotoItem } from '../types/photo';

interface LightboxModalProps {
  photo: PhotoItem | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export default function LightboxModal({
  photo,
  onClose,
  onDelete,
}: LightboxModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    setIsDeleting(false);
  }, [photo?.id]);

  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, onClose]);

  if (!photo) return null;

  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(photo.createdAt);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(photo.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-photo-title"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90dvh] rounded-2xl bg-white overflow-hidden shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar imagen ampliada"
          className="absolute top-3.5 right-3.5 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 min-h-0 bg-slate-950 flex items-center justify-center overflow-hidden">
          <img
            src={photo.imageUrl}
            alt={photo.title}
            className="max-w-full max-h-[70dvh] w-auto h-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-white border-t border-slate-100">
          <div className="flex flex-col gap-1 min-w-0">
            <h2
              id="lightbox-photo-title"
              className="text-base font-semibold text-slate-900 truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {photo.title}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>{getCategoryLabel(photo.category)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formattedDate}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isDeleting ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
