import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImagePlus, MapPin, Upload, X } from 'lucide-react';
import {
  PHOTO_CATEGORIES,
  type PendingPhotoDraft,
  type PhotoCategory,
} from '../types/photo';

interface UploadModalProps {
  isOpen: boolean;
  initialDraft: PendingPhotoDraft | null;
  onClose: () => void;
  onStartPlacement: (draft: PendingPhotoDraft) => void;
}

export default function UploadModal({
  isOpen,
  initialDraft,
  onClose,
  onStartPlacement,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImageReady, setIsImageReady] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PhotoCategory>('lugares');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialDraft) {
      setFile(initialDraft.file);
      setPreviewUrl(initialDraft.previewUrl);
      previewUrlRef.current = initialDraft.previewUrl;
      setIsImageReady(false);
      setTitle(initialDraft.title);
      setCategory(initialDraft.category);
      setErrorMessage(null);
    } else {
      setFile(null);
      setPreviewUrl(null);
      previewUrlRef.current = null;
      setIsImageReady(false);
      setTitle('');
      setCategory('lugares');
      setErrorMessage(null);
    }
  }, [isOpen, initialDraft]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSupportedImage = (selected: File) => {
    if (selected.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(selected.name);
  };

  const acceptImageFile = (selected: File) => {
    if (!isSupportedImage(selected)) {
      setErrorMessage('Por favor selecciona una imagen válida (JPG, PNG, WebP).');
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreview = URL.createObjectURL(selected);
    previewUrlRef.current = nextPreview;
    setIsImageReady(false);
    setFile(selected);
    setPreviewUrl(nextPreview);
    setTitle((current) => {
      if (current.trim()) return current;
      return selected.name.replace(/\.[^/.]+$/, '');
    });
    setErrorMessage(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      acceptImageFile(selected);
    }
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      acceptImageFile(dropped);
    }
  };

  const handleSubmit = () => {
    if (!file || !previewUrl) {
      setErrorMessage('Primero carga una fotografía para continuar.');
      return;
    }

    const cleanTitle = title.trim() || file.name.replace(/\.[^/.]+$/, '') || 'Fotografía en Robledo';
    previewUrlRef.current = null;
    onStartPlacement({
      file,
      previewUrl,
      title: cleanTitle,
      category,
    });
  };

  const handleCancel = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      onClick={handleCancel}
    >
      <div
        className="flex flex-col w-full max-w-md max-h-[90dvh] rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <h2
            id="upload-modal-title"
            className="text-base font-semibold tracking-tight text-slate-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Agregar fotografía
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cerrar ventana"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {!previewUrl ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                isDraggingOver
                  ? 'border-blue-600 bg-blue-50/70'
                  : 'border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-900">
                  Arrastra una fotografía aquí
                </p>
                <p className="text-xs text-slate-500">
                  o haz clic para explorar archivos desde tu computador
                </p>
              </div>
              <button
                type="button"
                className="mt-1 px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Seleccionar archivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[16/10]">
                {!isImageReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                    Procesando vista previa...
                  </div>
                )}
                <img
                  src={previewUrl}
                  alt={title || 'Vista previa'}
                  onLoad={() => setIsImageReady(true)}
                  onError={() => {
                    setIsImageReady(true);
                    setErrorMessage('No se pudo mostrar esta imagen. Prueba con JPG o PNG.');
                  }}
                  className={`w-full h-full object-cover transition-opacity duration-150 ${
                    isImageReady ? 'opacity-100' : 'opacity-0'
                  }`}
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/75 hover:bg-slate-950 text-white text-xs font-medium transition-colors cursor-pointer backdrop-blur-xs"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Cambiar foto
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="photo-title-input"
                  className="text-xs font-medium text-slate-700"
                >
                  Título o lugar
                </label>
                <input
                  id="photo-title-input"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Parque principal de Robledo"
                  maxLength={90}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">Categoría</span>
                <div className="grid grid-cols-2 gap-2">
                  {PHOTO_CATEGORIES.map((item) => {
                    const selected = category === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setCategory(item.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer border whitespace-nowrap truncate ${
                          selected
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {errorMessage && (
            <p className="text-xs text-rose-600 font-medium" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!previewUrl}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <MapPin className="w-3.5 h-3.5" />
              Ubicar en el mapa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
