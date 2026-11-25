import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ImageIcon,
  MapPin,
  Play,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { getCategoryLabel, type PhotoItem } from '../types/photo';

interface PhotoGalleryProps {
  photos: PhotoItem[];
  totalCount: number;
  selectedPhotoId: string | null;
  isExpanded: boolean;
  isTourActive: boolean;
  onToggleExpanded: () => void;
  onSelectPhoto: (photo: PhotoItem) => void;
  onMovePhoto: (photo: PhotoItem) => void;
  onDeletePhoto: (id: string) => void;
  onOpenUpload: () => void;
  onStartTour: () => void;
  onStopTour: () => void;
  onStepTour: (direction: 'prev' | 'next') => void;
}

export default function PhotoGallery({
  photos,
  totalCount,
  selectedPhotoId,
  isExpanded,
  isTourActive,
  onToggleExpanded,
  onSelectPhoto,
  onMovePhoto,
  onDeletePhoto,
  onOpenUpload,
  onStartTour,
  onStopTour,
  onStepTour,
}: PhotoGalleryProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const selectedIndex = photos.findIndex((item) => item.id === selectedPhotoId);

  return (
    <section
      aria-label="Galería de fotografías"
      className="relative z-[500] bg-white border-t border-slate-200 shrink-0"
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-11">
        <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
          <span className="font-semibold text-slate-900 whitespace-nowrap">Galería</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums whitespace-nowrap">
            {photos.length === 1 ? '1 fotografía' : `${photos.length} fotografías`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {photos.length > 0 && !isTourActive && (
            <button
              type="button"
              onClick={onStartTour}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Recorrido</span>
            </button>
          )}

          {isTourActive && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => onStepTour('prev')}
                aria-label="Punto anterior"
                className="flex items-center justify-center w-7 h-7 rounded text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-medium text-slate-700 tabular-nums whitespace-nowrap">
                {selectedIndex >= 0 ? `${selectedIndex + 1} / ${photos.length}` : `1 / ${photos.length}`}
              </span>
              <button
                type="button"
                onClick={() => onStepTour('next')}
                aria-label="Siguiente punto"
                className="flex items-center justify-center w-7 h-7 rounded text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onStopTour}
                aria-label="Detener recorrido"
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-700 hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>Detener</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="hidden sm:inline">
              {isExpanded ? 'Ocultar galería' : 'Mostrar galería'}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 sm:px-6 pb-3.5 pt-1">
          {photos.length === 0 ? (
            <div className="flex items-center justify-between gap-4 py-2 px-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-400 shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-600 truncate">
                  {totalCount === 0
                    ? 'Aún no hay fotografías. Arrastra una imagen sobre el mapa o agrégala para ubicarla en Robledo.'
                    : 'No hay fotografías registradas en esta categoría.'}
                </p>
              </div>
              {totalCount === 0 && (
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Agregar foto
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
              {photos.map((photo, index) => {
                const isSelected = photo.id === selectedPhotoId;
                const isConfirming = confirmingDeleteId === photo.id;

                return (
                  <div
                    key={photo.id}
                    className={`group flex items-center justify-between gap-2 p-2 rounded-xl border transition-all shrink-0 w-72 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDeleteId(null);
                        onSelectPhoto(photo);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded-lg"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={photo.thumbDataUrl}
                          alt={photo.title}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {index + 1}. {photo.title}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">
                          {getCategoryLabel(photo.category)}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isConfirming ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingDeleteId(null);
                              onMovePhoto(photo);
                            }}
                            title="Mover punto en el mapa"
                            aria-label={`Mover ${photo.title} en el mapa`}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(photo.id)}
                            title="Eliminar fotografía"
                            aria-label={`Eliminar ${photo.title}`}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingDeleteId(null);
                              onDeletePhoto(photo.id);
                            }}
                            title="Confirmar eliminación"
                            aria-label={`Confirmar eliminación de ${photo.title}`}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            title="Cancelar eliminación"
                            aria-label="Cancelar eliminación"
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
