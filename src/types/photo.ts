export type PhotoCategory =
  | 'historicas'
  | 'lugares'
  | 'arquitectura'
  | 'comunidad';

export type PhotoFilter = 'all' | PhotoCategory;

export interface PhotoRecord {
  id: string;
  title: string;
  category: PhotoCategory;
  lat: number;
  lng: number;
  imageBlob: Blob;
  thumbDataUrl: string;
  createdAt: number;
}

export interface PhotoItem extends PhotoRecord {
  imageUrl: string;
}

export interface PendingPhotoDraft {
  file: File;
  previewUrl: string;
  title: string;
  category: PhotoCategory;
}

export const PHOTO_CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: 'historicas', label: 'Fotografías históricas' },
  { value: 'lugares', label: 'Lugares y espacios' },
  { value: 'arquitectura', label: 'Arquitectura' },
  { value: 'comunidad', label: 'Comunidad' },
];

export const PHOTO_FILTERS: { value: PhotoFilter; label: string }[] = [
  { value: 'all', label: 'Todos los puntos' },
  ...PHOTO_CATEGORIES,
];

export function getCategoryLabel(category: PhotoCategory): string {
  return PHOTO_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}
