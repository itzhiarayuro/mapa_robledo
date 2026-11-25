import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { getCategoryLabel, type PhotoItem } from '../types/photo';

export const ROBLEDO_CENTER: [number, number] = [6.2785, -75.5955];
export const ROBLEDO_DEFAULT_ZOOM = 15;

interface RobledoMapProps {
  photos: PhotoItem[];
  selectedPhotoId: string | null;
  focusRequest: { id: string; nonce: number } | null;
  isPlacing: boolean;
  onSelectPhoto: (id: string | null) => void;
  onExpandPhoto: (photo: PhotoItem) => void;
  onStartMovePhoto: (photo: PhotoItem) => void;
  onDeletePhoto: (id: string) => void;
  onPlaceAtCoordinate: (lat: number, lng: number) => void;
  layoutKey: string;
}

function createMarkerElement(photo: PhotoItem, isActive: boolean): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = isActive ? 'carrobledo-marker-pin is-active' : 'carrobledo-marker-pin';
  wrapper.setAttribute('role', 'button');
  wrapper.setAttribute('aria-label', photo.title);

  const img = document.createElement('img');
  img.src = photo.thumbDataUrl;
  img.alt = photo.title;
  img.className = 'carrobledo-marker-thumb';
  img.referrerPolicy = 'no-referrer';
  wrapper.appendChild(img);

  return wrapper;
}

function createPopupContent(
  photo: PhotoItem,
  onExpand: (photo: PhotoItem) => void,
  onMove: (photo: PhotoItem) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex flex-col bg-white text-slate-900';

  const imageButton = document.createElement('button');
  imageButton.type = 'button';
  imageButton.className =
    'group relative block w-full h-36 overflow-hidden bg-slate-100 focus:outline-none cursor-pointer';
  imageButton.setAttribute('aria-label', `Ampliar ${photo.title}`);

  const img = document.createElement('img');
  img.src = photo.imageUrl;
  img.alt = photo.title;
  img.className =
    'w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]';
  img.referrerPolicy = 'no-referrer';
  imageButton.appendChild(img);
  imageButton.addEventListener('click', (event) => {
    event.stopPropagation();
    onExpand(photo);
  });
  container.appendChild(imageButton);

  const body = document.createElement('div');
  body.className = 'p-3.5 flex flex-col gap-2.5';

  const textGroup = document.createElement('div');
  textGroup.className = 'flex flex-col gap-1';

  const title = document.createElement('h3');
  title.className = 'text-sm font-semibold text-slate-900 leading-snug line-clamp-2';
  title.textContent = photo.title;
  textGroup.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'text-xs text-slate-500 flex items-center gap-1.5 flex-wrap';

  const categorySpan = document.createElement('span');
  categorySpan.textContent = getCategoryLabel(photo.category);
  meta.appendChild(categorySpan);

  const sep = document.createElement('span');
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = '·';
  meta.appendChild(sep);

  const coordsSpan = document.createElement('span');
  coordsSpan.className = 'font-mono tabular-nums text-[11px]';
  coordsSpan.textContent = `${photo.lat.toFixed(4)}, ${photo.lng.toFixed(4)}`;
  meta.appendChild(coordsSpan);

  textGroup.appendChild(meta);
  body.appendChild(textGroup);

  const expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className =
    'w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
  expandBtn.textContent = 'Ampliar imagen';
  expandBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    onExpand(photo);
  });
  body.appendChild(expandBtn);

  const secondaryActions = document.createElement('div');
  secondaryActions.className = 'flex items-center gap-2';

  const moveBtn = document.createElement('button');
  moveBtn.type = 'button';
  moveBtn.className =
    'flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer';
  moveBtn.textContent = 'Mover punto';
  moveBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    onMove(photo);
  });
  secondaryActions.appendChild(moveBtn);

  let confirmingDelete = false;
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className =
    'flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-600 text-xs font-medium transition-colors cursor-pointer';
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!confirmingDelete) {
      confirmingDelete = true;
      deleteBtn.textContent = 'Confirmar';
      deleteBtn.className =
        'flex-1 py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer';
      return;
    }
    onDelete(photo.id);
  });
  secondaryActions.appendChild(deleteBtn);

  body.appendChild(secondaryActions);
  container.appendChild(body);
  return container;
}

export default function RobledoMap({
  photos,
  selectedPhotoId,
  focusRequest,
  isPlacing,
  onSelectPhoto,
  onExpandPhoto,
  onStartMovePhoto,
  onDeletePhoto,
  onPlaceAtCoordinate,
  layoutKey,
}: RobledoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());

  const isPlacingRef = useRef(isPlacing);
  isPlacingRef.current = isPlacing;

  const onPlaceRef = useRef(onPlaceAtCoordinate);
  onPlaceRef.current = onPlaceAtCoordinate;

  const onSelectRef = useRef(onSelectPhoto);
  onSelectRef.current = onSelectPhoto;

  const onExpandRef = useRef(onExpandPhoto);
  onExpandRef.current = onExpandPhoto;

  const onMoveRef = useRef(onStartMovePhoto);
  onMoveRef.current = onStartMovePhoto;

  const onDeleteRef = useRef(onDeletePhoto);
  onDeleteRef.current = onDeletePhoto;

  // Initialize Leaflet map once with right-click drag panning
  useEffect(() => {
    const mapElement = containerRef.current;
    if (!mapElement || mapRef.current) return;

    const map = L.map(mapElement, {
      center: ROBLEDO_CENTER,
      zoom: ROBLEDO_DEFAULT_ZOOM,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      if (isPlacingRef.current) {
        onPlaceRef.current(event.latlng.lat, event.latlng.lng);
      } else {
        onSelectRef.current(null);
      }
    });

    // Enable panning the map with right mouse button drag
    let isRightDragging = false;
    let lastX = 0;
    let lastY = 0;
    let previousCursor = '';

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) return;
      event.preventDefault();
      isRightDragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      previousCursor = mapElement.style.cursor;
      mapElement.style.cursor = 'grabbing';
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isRightDragging) return;
      const dx = lastX - event.clientX;
      const dy = lastY - event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      map.panBy([dx, dy], { animate: false });
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!isRightDragging || event.button !== 2) return;
      isRightDragging = false;
      mapElement.style.cursor = previousCursor;
    };

    mapElement.addEventListener('contextmenu', handleContextMenu);
    mapElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      mapElement.removeEventListener('contextmenu', handleContextMenu);
      mapElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markerByIdRef.current.clear();
    };
  }, []);

  // Toggle placing-mode crosshair cursor class
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (isPlacing) {
      el.classList.add('placing-mode');
      mapRef.current?.closePopup();
    } else {
      el.classList.remove('placing-mode');
    }
  }, [isPlacing]);

  // Keep map size synchronized when gallery drawer toggles
  useEffect(() => {
    const timer = window.setTimeout(() => {
      mapRef.current?.invalidateSize({ animate: false });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [layoutKey]);

  // Sync markers whenever filtered photos or selected state changes
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    const existingPopupId =
      selectedPhotoId && markerByIdRef.current.get(selectedPhotoId)?.isPopupOpen()
        ? selectedPhotoId
        : null;

    layer.clearLayers();
    markerByIdRef.current.clear();

    for (const photo of photos) {
      const isActive = photo.id === selectedPhotoId;
      const markerIcon = L.divIcon({
        className: 'carrobledo-photo-marker',
        html: createMarkerElement(photo, isActive),
        iconSize: [48, 55],
        iconAnchor: [24, 55],
        popupAnchor: [0, -52],
      });

      const marker = L.marker([photo.lat, photo.lng], {
        icon: markerIcon,
        zIndexOffset: isActive ? 500 : 0,
      });

      const popup = L.popup({
        className: 'carrobledo-popup',
        closeButton: true,
        maxWidth: 260,
        minWidth: 248,
      }).setContent(
        createPopupContent(
          photo,
          (p) => onExpandRef.current(p),
          (p) => {
            marker.closePopup();
            onMoveRef.current(p);
          },
          (id) => {
            marker.closePopup();
            onDeleteRef.current(id);
          },
        ),
      );

      marker.bindPopup(popup);

      marker.on('click', (event) => {
        if (isPlacingRef.current) {
          L.DomEvent.stopPropagation(event);
          onPlaceRef.current(event.latlng.lat, event.latlng.lng);
          return;
        }
        onSelectRef.current(photo.id);
      });

      marker.addTo(layer);
      markerByIdRef.current.set(photo.id, marker);

      if (existingPopupId === photo.id) {
        marker.openPopup();
      }
    }
  }, [photos, selectedPhotoId]);

  // Fly to focused photo when clicked in gallery or newly placed
  useEffect(() => {
    if (!focusRequest || !mapRef.current) return;
    const marker = markerByIdRef.current.get(focusRequest.id);
    if (!marker) return;

    const latLng = marker.getLatLng();
    const targetZoom = Math.max(mapRef.current.getZoom(), 17);
    mapRef.current.flyTo(latLng, targetZoom, {
      duration: 0.65,
    });

    const openTimer = window.setTimeout(() => {
      marker.openPopup();
    }, 260);

    return () => window.clearTimeout(openTimer);
  }, [focusRequest]);

  const handleRecenter = () => {
    mapRef.current?.flyTo(ROBLEDO_CENTER, ROBLEDO_DEFAULT_ZOOM, { duration: 0.6 });
  };

  return (
    <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-slate-100">
      <div
        ref={containerRef}
        className="w-full h-full z-0"
        aria-label="Mapa interactivo del barrio Robledo, Medellín"
      />

      <button
        type="button"
        onClick={handleRecenter}
        title="Centrar en Robledo"
        aria-label="Centrar mapa en Robledo"
        className="absolute top-[94px] right-[10px] z-[400] flex items-center justify-center w-[34px] h-[34px] rounded-[4px] bg-white text-slate-700 border-2 border-black/20 hover:bg-slate-50 hover:text-slate-950 transition-colors cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <LocateFixed className="w-4 h-4" />
      </button>
    </div>
  );
}
