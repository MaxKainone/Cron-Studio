// ---------------------------------------------------------------------------
// Персонализация рабочего стола: пресеты обоев + пользовательская картинка
// ---------------------------------------------------------------------------

export interface WallpaperPreset {
  id: string;
  name: string;
  src: string;
}

export const WALLPAPERS: WallpaperPreset[] = [
  { id: 'bloom', name: 'Сапфир', src: '/wallpaper.jpg' },
  { id: 'dawn', name: 'Рассвет', src: '/wallpaper-dawn.jpg' },
  { id: 'aurora', name: 'Аврора', src: '/wallpaper-aurora.jpg' },
  { id: 'sunset', name: 'Закат', src: '/wallpaper-sunset.jpg' },
];

export const DEFAULT_WALLPAPER_ID = 'bloom';

export interface WallpaperChoice {
  presetId: string;        // id пресета или 'custom'
  customDataUrl: string | null;
}

const LS_KEY = 'cronstudio.wallpaper';

export function loadWallpaper(): WallpaperChoice {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WallpaperChoice;
      if (parsed && typeof parsed.presetId === 'string') {
        return { presetId: parsed.presetId, customDataUrl: parsed.customDataUrl ?? null };
      }
    }
  } catch { /* ignore */ }
  return { presetId: DEFAULT_WALLPAPER_ID, customDataUrl: null };
}

export function saveWallpaper(choice: WallpaperChoice): boolean {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(choice));
    return true;
  } catch {
    return false;
  }
}

export function resolveWallpaperSrc(choice: WallpaperChoice): string {
  if (choice.presetId === 'custom' && choice.customDataUrl) return choice.customDataUrl;
  const p = WALLPAPERS.find((w) => w.id === choice.presetId);
  return (p ?? WALLPAPERS[0]).src;
}

/** Уменьшает изображение до разумных размеров и возвращает JPEG dataURL */
export function fileToWallpaperDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Файл не является изображением'));
      img.onload = () => {
        const maxW = 1920;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
