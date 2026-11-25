import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { MapPin, Plus, Upload, X } from 'lucide-react';
import LightboxModal from './components/LightboxModal';
import PhotoGallery from './components/PhotoGallery';
import RobledoMap from './components/RobledoMap';
import UploadModal from './components/UploadModal';
import {
  deletePhotoRecord,
  getAllPhotos,
  preparePhotoRecord,
  savePhotoRecord,
  updatePhotoLocation,
} from './lib/storage';
import {
  PHOTO_FILTERS,
  type PendingPhotoDraft,
  type PhotoFilter,
  type PhotoItem,
} from './types/photo';

export default function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>('all');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<PhotoItem | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadInitialDraft, setUploadInitialDraft] = useState<PendingPhotoDraft | null>(null);
  const [placingDraft, setPlacingDraft] = useState<PendingPhotoDraft | null>(null);
  const [movingPhoto, setMovingPhoto] = useState<PhotoItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isGalleryExpanded, setIsGalleryExpanded] = useState(true);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const dragDepthRef = useRef(0);
  const photosRef = useRef<PhotoItem[]>([]);
  photosRef.current = photos;

  const isTargetingLocation = placingDraft !== null || movingPhoto !== null;

  // Load persisted photos from IndexedDB on startup
  useEffect(() => {
    let active = true;
    getAllPhotos()
      .then((loaded) => {
        if (!active) {
          loaded.forEach((item) => URL.revokeObjectURL(item.imageUrl));
          return;
        }
        setPhotos(loaded);
      })
      .catch(() => {
        if (active) {
          setErrorBanner('No se pudieron cargar las fotografías guardadas en este navegador.');
        }
      });

    return () => {
      active = false;
      photosRef.current.forEach((item) => URL.revokeObjectURL(item.imageUrl));
    };
  }, []);

  // Ensure global drag overlay never gets stuck on drop or drag cancellation
  useEffect(() => {
    const resetDrag = () => {
      dragDepthRef.current = 0;
      setIsGlobalDragging(false);
    };
    window.addEventListener('dragend', resetDrag);
    window.addEventListener('drop', resetDrag);
    return () => {
      window.removeEventListener('dragend', resetDrag);
      window.removeEventListener('drop', resetDrag);
    };
  }, []);

  // Cancel placement or move mode with Escape
  useEffect(() => {
    if (!placingDraft && !movingPhoto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (placingDraft) {
          URL.revokeObjectURL(placingDraft.previewUrl);
          setPlacingDraft(null);
        }
        if (movingPhoto) {
          setMovingPhoto(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placingDraft, movingPhoto]);

  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'all') return photos;
    return photos.filter((photo) => photo.category === activeFilter);
  }, [photos, activeFilter]);

  // Step tour smoothly across filtered points
  const handleStepTour = useCallback(
    (direction: 'prev' | 'next') => {
      if (filteredPhotos.length === 0) {
        setIsTourActive(false);
        return;
      }
      const currentIdx = filteredPhotos.findIndex((item) => item.id === selectedPhotoId);
      let nextIdx = 0;
      if (currentIdx === -1) {
        nextIdx = 0;
      } else if (direction === 'next') {
        nextIdx = (currentIdx + 1) % filteredPhotos.length;
      } else {
        nextIdx = (currentIdx - 1 + filteredPhotos.length) % filteredPhotos.length;
      }

      const target = filteredPhotos[nextIdx];
      setSelectedPhotoId(target.id);
      setFocusRequest({ id: target.id, nonce: Date.now() });
    },
    [filteredPhotos, selectedPhotoId],
  );

  // Auto-advance tour every 4.5s while active and not viewing lightbox
  useEffect(() => {
    if (!isTourActive || filteredPhotos.length === 0 || expandedPhoto) return;
    const timer = window.setInterval(() => {
      handleStepTour('next');
    }, 4500);
    return () => window.clearInterval(timer);
  }, [isTourActive, filteredPhotos.length, expandedPhoto, handleStepTour]);

  const handleStartTour = () => {
    if (filteredPhotos.length === 0) return;
    setIsTourActive(true);
    const first = filteredPhotos[0];
    setSelectedPhotoId(first.id);
    setFocusRequest({ id: first.id, nonce: Date.now() });
  };

  const handleStopTour = () => {
    setIsTourActive(false);
  };

  const handleFilterChange = (nextFilter: PhotoFilter) => {
    setIsTourActive(false);
    setActiveFilter(nextFilter);
    if (selectedPhotoId) {
      const stillVisible = photos.some(
        (photo) =>
          photo.id === selectedPhotoId &&
          (nextFilter === 'all' || photo.category === nextFilter),
      );
      if (!stillVisible) {
        setSelectedPhotoId(null);
      }
    }
  };

  const handleOpenUploadModal = () => {
    setIsTourActive(false);
    setIsGlobalDragging(false);
    dragDepthRef.current = 0;
    if (placingDraft) {
      URL.revokeObjectURL(placingDraft.previewUrl);
      setPlacingDraft(null);
    }
    setMovingPhoto(null);
    setUploadInitialDraft(null);
    setIsUploadOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadOpen(false);
    setUploadInitialDraft(null);
  };

  const handleStartPlacement = (draft: PendingPhotoDraft) => {
    setIsTourActive(false);
    setIsUploadOpen(false);
    setUploadInitialDraft(null);
    setSelectedPhotoId(null);
    setMovingPhoto(null);
    setPlacingDraft(draft);
  };

  const handleStartMovePhoto = (photo: PhotoItem) => {
    setIsTourActive(false);
    if (placingDraft) {
      URL.revokeObjectURL(placingDraft.previewUrl);
      setPlacingDraft(null);
    }
    setMovingPhoto(photo);
    setSelectedPhotoId(photo.id);
  };

  const handleCancelPlacement = () => {
    if (placingDraft) {
      URL.revokeObjectURL(placingDraft.previewUrl);
      setPlacingDraft(null);
    }
    setMovingPhoto(null);
  };

  const handlePlaceAtCoordinate = useCallback(
    async (lat: number, lng: number) => {
      if (isSaving) return;

      if (movingPhoto) {
        setIsSaving(true);
        setErrorBanner(null);
        const targetId = movingPhoto.id;

        try {
          await updatePhotoLocation(targetId, lat, lng);
          setPhotos((prev) =>
            prev.map((item) => (item.id === targetId ? { ...item, lat, lng } : item)),
          );
          setMovingPhoto(null);
          setSelectedPhotoId(targetId);
          setFocusRequest({ id: targetId, nonce: Date.now() });
        } catch (err) {
          const msg =
            err instanceof Error && err.message
              ? err.message
              : 'No se pudo actualizar la ubicación de la fotografía.';
          setErrorBanner(msg);
        } finally {
          setIsSaving(false);
        }
        return;
      }

      if (!placingDraft) return;
      setIsSaving(true);
      setErrorBanner(null);

      try {
        const record = await preparePhotoRecord({
          file: placingDraft.file,
          title: placingDraft.title,
          category: placingDraft.category,
          lat,
          lng,
        });

        const savedItem = await savePhotoRecord(record);
        URL.revokeObjectURL(placingDraft.previewUrl);
        setPlacingDraft(null);

        setPhotos((prev) => [...prev, savedItem]);

        if (activeFilter !== 'all' && activeFilter !== savedItem.category) {
          setActiveFilter('all');
        }

        setSelectedPhotoId(savedItem.id);
        setFocusRequest({ id: savedItem.id, nonce: Date.now() });
        setIsGalleryExpanded(true);
      } catch (err) {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'No se pudo guardar la fotografía en el almacenamiento local.';
        setErrorBanner(msg);
      } finally {
        setIsSaving(false);
      }
    },
    [placingDraft, movingPhoto, isSaving, activeFilter],
  );

  const handleSelectGalleryPhoto = (photo: PhotoItem) => {
    setIsTourActive(false);
    setSelectedPhotoId(photo.id);
    setFocusRequest({ id: photo.id, nonce: Date.now() });
  };

  const handleDeletePhoto = useCallback(
    async (id: string) => {
      try {
        await deletePhotoRecord(id);
        setPhotos((prev) => {
          const target = prev.find((item) => item.id === id);
          if (target) {
            URL.revokeObjectURL(target.imageUrl);
          }
          return prev.filter((item) => item.id !== id);
        });
        if (selectedPhotoId === id) {
          setSelectedPhotoId(null);
        }
        if (movingPhoto?.id === id) {
          setMovingPhoto(null);
        }
        if (expandedPhoto?.id === id) {
          setExpandedPhoto(null);
        }
      } catch {
        setErrorBanner('No se pudo eliminar la fotografía del almacenamiento local.');
      }
    },
    [selectedPhotoId, movingPhoto?.id, expandedPhoto?.id],
  );

  // Global file drag-and-drop onto the viewport (disabled while UploadModal is already open)
  const hasFiles = (event: DragEvent<HTMLDivElement>) =>
    Array.from(event.dataTransfer.types).includes('Files');

  const isSupportedImage = (file: File) => {
    if (file.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name);
  };

  const handleGlobalDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (isUploadOpen || !hasFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsGlobalDragging(true);
  };

  const handleGlobalDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isUploadOpen || !hasFiles(event)) return;
    event.preventDefault();
  };

  const handleGlobalDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (isUploadOpen || !hasFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsGlobalDragging(false);
    }
  };

  const handleGlobalDrop = (event: DragEvent<HTMLDivElement>) => {
    dragDepthRef.current = 0;
    setIsGlobalDragging(false);
    if (isUploadOpen || !hasFiles(event)) return;
    event.preventDefault();

    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!isSupportedImage(droppedFile)) {
      setErrorBanner('Solo se admiten archivos de imagen (JPG, PNG, WebP).');
      return;
    }

    if (placingDraft) {
      URL.revokeObjectURL(placingDraft.previewUrl);
      setPlacingDraft(null);
    }
    setMovingPhoto(null);

    setIsTourActive(false);
    const previewUrl = URL.createObjectURL(droppedFile);
    setUploadInitialDraft({
      file: droppedFile,
      previewUrl,
      title: droppedFile.name.replace(/\.[^/.]+$/, ''),
      category: 'lugares',
    });
    setIsUploadOpen(true);
  };

  const activeBannerPreview = placingDraft?.previewUrl ?? movingPhoto?.thumbDataUrl ?? null;
  const activeBannerTitle = placingDraft?.title ?? movingPhoto?.title ?? '';

  return (
    <div
      className="flex flex-col h-dvh w-full overflow-hidden bg-slate-50 text-slate-900"
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      {/* Top Bar: 3 clean zones */}
      <header className="relative z-[600] flex items-center justify-between gap-6 px-4 sm:px-6 h-14 bg-white border-b border-slate-200 shrink-0">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            setIsTourActive(false);
            setActiveFilter('all');
            setSelectedPhotoId(null);
          }}
          className="text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          CARROBLEDO
        </a>

        {/* Desktop category filters */}
        <nav
          aria-label="Filtros de fotografías"
          className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          {PHOTO_FILTERS.map((filter) => {
            const active = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleFilterChange(filter.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleOpenUploadModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar foto</span>
        </button>
      </header>

      {/* Mobile / tablet compact filter strip */}
      <div className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white border-b border-slate-200 overflow-x-auto shrink-0">
        {PHOTO_FILTERS.map((filter) => {
          const active = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => handleFilterChange(filter.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Main interactive map */}
      <main className="relative flex-1 flex flex-col min-h-0">
        <RobledoMap
          photos={filteredPhotos}
          selectedPhotoId={selectedPhotoId}
          focusRequest={focusRequest}
          isPlacing={isTargetingLocation}
          onSelectPhoto={(id) => {
            if (isTourActive && id === null) {
              setIsTourActive(false);
            }
            setSelectedPhotoId(id);
          }}
          onExpandPhoto={setExpandedPhoto}
          onStartMovePhoto={handleStartMovePhoto}
          onDeletePhoto={handleDeletePhoto}
          onPlaceAtCoordinate={handlePlaceAtCoordinate}
          layoutKey={`${isGalleryExpanded}-${filteredPhotos.length}`}
        />

        {/* Floating placement / move prompt */}
        {isTargetingLocation && activeBannerPreview && (
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-[550] w-[calc(100%-24px)] max-w-xl">
            <div className="flex items-center justify-between gap-3 p-2.5 pl-3 rounded-xl bg-white/95 backdrop-blur-md border border-blue-200 shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={activeBannerPreview}
                  alt={activeBannerTitle}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      {isSaving
                        ? 'Guardando ubicación...'
                        : movingPhoto
                          ? 'Haz clic en la nueva ubicación del mapa (clic derecho para mover el mapa)'
                          : 'Haz clic en el mapa para ubicar la foto (clic derecho para mover el mapa)'}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">
                    {activeBannerTitle}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelPlacement}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Dismissible error alert */}
        {errorBanner && (
          <div
            role="alert"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[560] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-lg"
          >
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label="Cerrar aviso"
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Bottom thumbnail gallery */}
      <PhotoGallery
        photos={filteredPhotos}
        totalCount={photos.length}
        selectedPhotoId={selectedPhotoId}
        isExpanded={isGalleryExpanded}
        isTourActive={isTourActive}
        onToggleExpanded={() => setIsGalleryExpanded((prev) => !prev)}
        onSelectPhoto={handleSelectGalleryPhoto}
        onMovePhoto={handleStartMovePhoto}
        onDeletePhoto={handleDeletePhoto}
        onOpenUpload={handleOpenUploadModal}
        onStartTour={handleStartTour}
        onStopTour={handleStopTour}
        onStepTour={handleStepTour}
      />

      {/* Global drag-and-drop overlay */}
      {isGlobalDragging && !isUploadOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-blue-600/15 backdrop-blur-xs pointer-events-none">
          <div className="flex flex-col items-center gap-3 px-8 py-7 rounded-2xl bg-white border-2 border-dashed border-blue-600 shadow-2xl text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600">
              <Upload className="w-6 h-6" />
            </div>
            <p
              className="text-base font-semibold text-slate-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Suelta la fotografía para cargarla en CARROBLEDO
            </p>
            <p className="text-xs text-slate-500">
              Luego podrás elegir su categoría y ubicarla en el mapa de Robledo
            </p>
          </div>
        </div>
      )}

      {/* Upload & Preview Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        initialDraft={uploadInitialDraft}
        onClose={handleCloseUploadModal}
        onStartPlacement={handleStartPlacement}
      />

      {/* Fullscreen Lightbox Modal */}
      <LightboxModal
        photo={expandedPhoto}
        onClose={() => setExpandedPhoto(null)}
        onDelete={handleDeletePhoto}
      />
    </div>
  );
}
