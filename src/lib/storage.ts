import type { PhotoCategory, PhotoItem, PhotoRecord } from '../types/photo';

const DB_NAME = 'carrobledo_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no está disponible en este navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;

    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Tiempo de espera agotado al abrir el almacenamiento local.'));
      }
    }, 5000);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeout);
        resolve(request.result);
      } else {
        request.result.close();
      }
    };

    request.onerror = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeout);
        reject(request.error ?? new Error('No se pudo abrir la base de datos local.'));
      }
    };

    request.onblocked = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeout);
        reject(new Error('El almacenamiento local está bloqueado por otra pestaña.'));
      }
    };
  });
}

export async function getAllPhotos(): Promise<PhotoItem[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as PhotoRecord[]) || [];
        records.sort((a, b) => a.createdAt - b.createdAt);
        const items: PhotoItem[] = records.map((record) => ({
          ...record,
          imageUrl: URL.createObjectURL(record.imageBlob),
        }));
        resolve(items);
      };

      request.onerror = () =>
        reject(request.error ?? new Error('Error al leer las fotografías guardadas.'));
      tx.onabort = () =>
        reject(tx.error ?? new Error('Lectura cancelada en el almacenamiento local.'));
    });
  } finally {
    db.close();
  }
}

export async function savePhotoRecord(record: PhotoRecord): Promise<PhotoItem> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Error al guardar la fotografía.'));
      tx.onabort = () =>
        reject(tx.error ?? new Error('Guardado cancelado en el almacenamiento local.'));
    });
  } finally {
    db.close();
  }

  return {
    ...record,
    imageUrl: URL.createObjectURL(record.imageBlob),
  };
}

export async function deletePhotoRecord(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Error al eliminar la fotografía.'));
      tx.onabort = () =>
        reject(tx.error ?? new Error('Eliminación cancelada en el almacenamiento local.'));
    });
  } finally {
    db.close();
  }
}

export async function updatePhotoLocation(
  id: string,
  lat: number,
  lng: number,
): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result as PhotoRecord | undefined;
        if (!record) {
          reject(new Error('No se encontró la fotografía para mover.'));
          return;
        }
        store.put({ ...record, lat, lng });
      };

      getReq.onerror = () =>
        reject(getReq.error ?? new Error('Error al buscar la fotografía.'));
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Error al actualizar la ubicación.'));
      tx.onabort = () =>
        reject(tx.error ?? new Error('Actualización cancelada en el almacenamiento local.'));
    });
  } finally {
    db.close();
  }
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo procesar el archivo de imagen.'));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        try {
          const dataUrl = canvas.toDataURL(type, quality);
          const [header, base64] = dataUrl.split(',');
          const mimeMatch = header.match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }
          resolve(new Blob([bytes], { type: mime }));
        } catch {
          reject(new Error('No se pudo generar la imagen procesada.'));
        }
      },
      type,
      quality,
    );
  });
}

export async function preparePhotoRecord(params: {
  file: File;
  title: string;
  category: PhotoCategory;
  lat: number;
  lng: number;
}): Promise<PhotoRecord> {
  const { file, title, category, lat, lng } = params;
  const img = await loadImageElement(file);

  const naturalWidth = img.naturalWidth || img.width || 1;
  const naturalHeight = img.naturalHeight || img.height || 1;

  // Resize full image gently up to 1920px longest side for crisp lightbox & fast persistence
  const maxFullSide = 1920;
  const fullScale = Math.min(1, maxFullSide / Math.max(naturalWidth, naturalHeight));
  const fullWidth = Math.max(1, Math.round(naturalWidth * fullScale));
  const fullHeight = Math.max(1, Math.round(naturalHeight * fullScale));

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = fullWidth;
  fullCanvas.height = fullHeight;
  const fullCtx = fullCanvas.getContext('2d');
  if (!fullCtx) {
    throw new Error('No se pudo inicializar el lienzo de imagen.');
  }
  fullCtx.drawImage(img, 0, 0, fullWidth, fullHeight);

  const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const imageBlob = await canvasToBlob(fullCanvas, outputMime, 0.88);

  // Generate crisp thumbnail for map markers and gallery strip
  const maxThumbSide = 240;
  const thumbScale = Math.min(1, maxThumbSide / Math.max(naturalWidth, naturalHeight));
  const thumbWidth = Math.max(1, Math.round(naturalWidth * thumbScale));
  const thumbHeight = Math.max(1, Math.round(naturalHeight * thumbScale));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (!thumbCtx) {
    throw new Error('No se pudo inicializar el lienzo de miniatura.');
  }
  thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
  const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);

  const cleanTitle = title.trim() || file.name.replace(/\.[^/.]+$/, '') || 'Fotografía en Robledo';

  return {
    id: crypto.randomUUID(),
    title: cleanTitle,
    category,
    lat,
    lng,
    imageBlob,
    thumbDataUrl,
    createdAt: Date.now(),
  };
}
