import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Settings, Image as ImageIcon, Check, Upload, RotateCcw, Palette, CircleAlert } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FloatingWindow } from './FloatingWindow';
import {
  WALLPAPERS, DEFAULT_WALLPAPER_ID, WallpaperChoice, fileToWallpaperDataUrl,
} from '@/lib/wallpaper';

export function SettingsWindow(props: {
  open: boolean;
  zIndex: number;
  choice: WallpaperChoice;
  persistFailed: boolean;
  onChoice: (c: WallpaperChoice) => void;
  onClose: () => void;
  onFocus: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { choice } = props;

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErr('Выберите файл изображения (PNG, JPG…)');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = await fileToWallpaperDataUrl(f);
      props.onChoice({ presetId: 'custom', customDataUrl: dataUrl });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось загрузить изображение');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <AnimatePresence>
      {props.open && (
        <FloatingWindow
          title="Параметры"
          icon={<Settings size={13} />}
          width={430}
          zIndex={props.zIndex}
          onClose={props.onClose}
          onFocus={props.onFocus}
        >
          <div className="win-scroll max-h-[62vh] overflow-y-auto px-4 py-3.5">
            {/* шапка раздела */}
            <div className="mb-1 flex items-center gap-2 text-[11px] text-white/40">
              <Palette size={12} />
              Персонализация
              <span className="text-white/25">›</span>
              <span className="text-white/70">Фон</span>
            </div>
            <h3 className="mb-3 text-[14px] font-semibold text-white">Картинка рабочего стола</h3>

            {/* пресеты */}
            <div className="grid grid-cols-2 gap-2.5">
              {WALLPAPERS.map((w) => {
                const active = choice.presetId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => props.onChoice({ ...choice, presetId: w.id })}
                    className="group text-left"
                  >
                    <div
                      className={cn(
                        'relative aspect-[16/9] overflow-hidden rounded-md border-2 transition-all',
                        active
                          ? 'border-[#4cc2ff] shadow-[0_0_14px_rgba(76,194,255,0.35)]'
                          : 'border-white/[0.12] group-hover:border-white/40',
                      )}
                    >
                      <img src={w.src} alt={w.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" draggable={false} />
                      {active && (
                        <span className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#4cc2ff] shadow">
                          <Check size={11} strokeWidth={3} className="text-[#08294a]" />
                        </span>
                      )}
                    </div>
                    <span className={cn('mt-1 block text-[11.5px]', active ? 'text-[#9ae0ff]' : 'text-white/60')}>
                      {w.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* своя картинка */}
            <div className="mt-4 border-t border-white/[0.08] pt-3.5">
              <div className="mb-2 flex items-center gap-2">
                <ImageIcon size={13} className="text-[#7fd4ff]" />
                <span className="text-[12.5px] font-medium text-white/85">Своя картинка</span>
              </div>

              <div className="flex items-start gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'flex h-[86px] w-[150px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed transition-colors',
                    busy
                      ? 'cursor-wait border-white/20 text-white/35'
                      : 'border-[#4cc2ff]/40 text-[#9ae0ff] hover:border-[#4cc2ff] hover:bg-[#4cc2ff]/[0.07]',
                  )}
                >
                  <Upload size={16} />
                  <span className="text-[11px]">{busy ? 'Загрузка…' : 'Выбрать файл'}</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />

                {choice.customDataUrl && (
                  <button
                    type="button"
                    onClick={() => props.onChoice({ ...choice, presetId: 'custom' })}
                    className="group text-left"
                  >
                    <div
                      className={cn(
                        'relative h-[86px] w-[150px] overflow-hidden rounded-md border-2 transition-all',
                        choice.presetId === 'custom'
                          ? 'border-[#4cc2ff] shadow-[0_0_14px_rgba(76,194,255,0.35)]'
                          : 'border-white/[0.12] group-hover:border-white/40',
                      )}
                    >
                      <img src={choice.customDataUrl} alt="Своя картинка" className="h-full w-full object-cover" draggable={false} />
                      {choice.presetId === 'custom' && (
                        <span className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#4cc2ff] shadow">
                          <Check size={11} strokeWidth={3} className="text-[#08294a]" />
                        </span>
                      )}
                    </div>
                    <span className={cn('mt-1 block text-[11.5px]', choice.presetId === 'custom' ? 'text-[#9ae0ff]' : 'text-white/60')}>
                      Моя картинка
                    </span>
                  </button>
                )}
              </div>

              <p className="mt-2.5 text-[10.5px] leading-snug text-white/35">
                Изображение уменьшается до 1920 px и сохраняется в браузере — выбор
                запомнится между запусками.
              </p>

              {err && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#ff99a4]">
                  <CircleAlert size={12} /> {err}
                </p>
              )}
              {props.persistFailed && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#ffd58a]">
                  <CircleAlert size={12} /> Картинка применена, но не сохранилась: хранилище браузера переполнено. Попробуйте файл поменьше.
                </p>
              )}

              <button
                type="button"
                onClick={() => props.onChoice({ ...choice, presetId: DEFAULT_WALLPAPER_ID })}
                className="mt-3 flex items-center gap-1.5 rounded-md border border-white/[0.14] bg-white/[0.04] px-3 py-1.5 text-[11.5px] text-white/70 transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                <RotateCcw size={12} />
                Вернуть обои по умолчанию
              </button>
            </div>
          </div>
        </FloatingWindow>
      )}
    </AnimatePresence>
  );
}
