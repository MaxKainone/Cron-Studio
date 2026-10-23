import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock, Minus, Square, X, FolderClosed, Calculator, Settings,
  Wifi, Volume2, BatteryMedium, ChevronUp, Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { CalculatorWindow } from './CalculatorWindow';
import { SettingsWindow } from './SettingsWindow';
import {
  WallpaperChoice, loadWallpaper, saveWallpaper, resolveWallpaperSrc,
} from '@/lib/wallpaper';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function WinLogo() {
  return (
    <div className="grid h-[18px] w-[18px] grid-cols-2 gap-[2px]">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-[1px] transition-colors"
          style={{ background: i === 1 || i === 2 ? '#4cc2ff' : '#35a5e0' }}
        />
      ))}
    </div>
  );
}

function pad(n: number) {
  return n < 10 ? '0' + n : String(n);
}

// ---------------------------------------------------------------------------
// Панель задач
// ---------------------------------------------------------------------------

function Taskbar(props: {
  appOpen: boolean;
  appMinimized: boolean;
  onAppClick: () => void;
  calcOpen: boolean;
  onCalcClick: () => void;
  settingsOpen: boolean;
  onSettingsClick: () => void;
}) {
  const now = useClock();

  const Pinned = (p: { title: string; running: boolean; onClick: () => void; children: React.ReactNode }) => (
    <div className="relative">
      <button
        type="button"
        title={p.title}
        onClick={p.onClick}
        className={cn(
          'flex h-[40px] w-[42px] items-center justify-center rounded-md transition-colors',
          p.running ? 'bg-white/[0.08]' : 'hover:bg-white/[0.07]',
        )}
      >
        {p.children}
      </button>
      <span
        className={cn(
          'absolute -bottom-[3px] left-1/2 h-[3px] -translate-x-1/2 rounded-full transition-all',
          p.running ? 'w-[14px] bg-[#4cc2ff]' : 'w-0 bg-transparent',
        )}
      />
    </div>
  );

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex h-[52px] items-center justify-center border-t border-white/[0.08] bg-[#1c1c1c]/[0.82] backdrop-blur-2xl">
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Пуск"
          className="flex h-[40px] w-[42px] items-center justify-center rounded-md transition-colors hover:bg-white/[0.07]"
        >
          <WinLogo />
        </button>

        <div className="relative">
          <button
            type="button"
            title="Cron Studio"
            onClick={props.onAppClick}
            className={cn(
              'flex h-[40px] w-[42px] items-center justify-center rounded-md transition-colors',
              props.appOpen ? 'bg-white/[0.08]' : 'hover:bg-white/[0.07]',
            )}
          >
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-gradient-to-br from-[#1b4d6e] to-[#0e323f] ring-1 ring-[#4cc2ff]/40">
              <CalendarClock size={15} className="text-[#7fd4ff]" />
            </div>
          </button>
          <span
            className={cn(
              'absolute -bottom-[3px] left-1/2 h-[3px] -translate-x-1/2 rounded-full transition-all',
              props.appOpen
                ? props.appMinimized
                  ? 'w-[8px] bg-white/40'
                  : 'w-[16px] bg-[#4cc2ff]'
                : 'w-0 bg-transparent',
            )}
          />
        </div>

        <button
          type="button"
          title="Проводник (демо)"
          className="flex h-[40px] w-[42px] items-center justify-center rounded-md transition-colors hover:bg-white/[0.07]"
        >
          <FolderClosed size={20} className="text-[#ffd58a]" />
        </button>

        <Pinned title="Калькулятор" running={props.calcOpen} onClick={props.onCalcClick}>
          <Calculator size={19} className="text-[#8ae8d4]" />
        </Pinned>

        <Pinned title="Параметры" running={props.settingsOpen} onClick={props.onSettingsClick}>
          <Settings size={19} className="text-white/60" />
        </Pinned>
      </div>

      <div className="absolute right-2 flex h-full items-center gap-3 pr-2">
        <ChevronUp size={14} className="text-white/50" />
        <div className="flex items-center gap-[9px] text-white/70">
          <Wifi size={14} />
          <Volume2 size={14} />
          <BatteryMedium size={15} />
        </div>
        <div className="text-right leading-[1.15]">
          <div className="text-[11.5px] text-white/85">{pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}</div>
          <div className="text-[10.5px] text-white/50">
            {pad(now.getDate())}.{pad(now.getMonth() + 1)}.{now.getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopIcon(props: { label: string; icon: React.ReactNode; onOpen?: () => void; dim?: boolean }) {
  const [sel, setSel] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setSel(true)}
      onDoubleClick={props.onOpen}
      onBlur={() => setSel(false)}
      className={cn(
        'flex w-[86px] flex-col items-center gap-1.5 rounded-md border px-1 py-2.5 transition-colors',
        sel ? 'border-[#4cc2ff]/50 bg-[#4cc2ff]/[0.13]' : 'border-transparent hover:bg-white/[0.07]',
        props.dim && 'opacity-80',
      )}
    >
      {props.icon}
      <span className="text-center text-[11px] leading-tight text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
        {props.label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Оболочка рабочего стола
// ---------------------------------------------------------------------------

export function DesktopShell(props: { children: React.ReactNode; titleRight?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ sx: 0, sy: 0, bx: 0, by: 0 });

  // --- дополнительные "приложения" ---
  const [calcOpen, setCalcOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [topWin, setTopWin] = useState<'calc' | 'settings'>('calc');

  // --- обои ---
  const [wallChoice, setWallChoice] = useState<WallpaperChoice>(() => loadWallpaper());
  const [persistFailed, setPersistFailed] = useState(false);
  const wallSrc = resolveWallpaperSrc(wallChoice);

  const applyWallpaper = (c: WallpaperChoice) => {
    setWallChoice(c);
    setPersistFailed(!saveWallpaper(c));
  };

  const showWindow = open && !minimized;

  const onTitlePointerDown = (e: React.PointerEvent) => {
    if (maximized) return;
    if ((e.target as HTMLElement).closest('[data-wc]')) return;
    drag.current = { sx: e.clientX, sy: e.clientY, bx: pos.x, by: pos.y };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onTitlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    const maxX = window.innerWidth / 2 - 120;
    const maxY = window.innerHeight / 2 - 90;
    setPos({ x: Math.max(-maxX, Math.min(maxX, drag.current.bx + dx)), y: Math.max(-maxY, Math.min(maxY, drag.current.by + dy)) });
  };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#0d1117]">
      {/* Обои с плавной сменой */}
      <AnimatePresence mode="sync">
        <motion.img
          key={wallSrc.slice(0, 64)}
          src={wallSrc}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_10%,transparent_40%,rgba(6,10,16,0.55)_100%)]" />

      {/* Значки рабочего стола */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
        <DesktopIcon
          label="Cron Studio"
          icon={
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#1b4d6e] to-[#0c2c38] shadow-lg ring-1 ring-[#4cc2ff]/40">
              <CalendarClock size={22} className="text-[#7fd4ff]" />
            </div>
          }
          onOpen={() => { setOpen(true); setMinimized(false); }}
        />
        <DesktopIcon
          label="Калькулятор"
          icon={
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#123f35] to-[#0a2822] shadow-lg ring-1 ring-[#8ae8d4]/30">
              <Calculator size={21} className="text-[#8ae8d4]" />
            </div>
          }
          onOpen={() => { setCalcOpen(true); setTopWin('calc'); }}
        />
        <DesktopIcon label="Корзина" dim icon={<Trash2 size={34} className="text-white/70" strokeWidth={1.2} />} />
      </div>

      {/* Окно приложения */}
      <AnimatePresence>
        {showWindow && (
          <motion.div
            key="app-window"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 110, transition: { duration: 0.22, ease: 'easeIn' } }}
            transition={dragging ? { duration: 0.05 } : { duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
            className={cn(
              'absolute z-20 flex flex-col overflow-hidden border border-white/[0.12] bg-[#252525]/[0.88] shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
              maximized
                ? 'inset-x-0 bottom-[52px] top-0 rounded-none border-x-0 border-t-0'
                : 'inset-x-0 bottom-[52px] top-0 m-auto rounded-lg',
              dragging && 'select-none',
            )}
            style={
              maximized
                ? undefined
                : {
                    width: 'min(1560px, 95vw)',
                    height: 'min(940px, calc(100vh - 140px))',
                    x: pos.x,
                    y: pos.y,
                  }
            }
          >
            {/* Заголовок окна */}
            <div
              className={cn(
                'flex h-[42px] shrink-0 items-center border-b border-white/[0.08] bg-[#202020]/70 pl-3',
                !maximized && 'cursor-move',
              )}
              onPointerDown={onTitlePointerDown}
              onPointerMove={onTitlePointerMove}
              onPointerUp={() => setDragging(false)}
              onDoubleClick={() => setMaximized((m) => !m)}
            >
              <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-gradient-to-br from-[#1b4d6e] to-[#0c2c38] ring-1 ring-[#4cc2ff]/40">
                <CalendarClock size={12} className="text-[#7fd4ff]" />
              </div>
              <span className="ml-2.5 text-[12.5px] font-medium text-white/85">
                Cron Studio — конструктор cron-выражений
              </span>
              <span className="ml-2 hidden rounded border border-white/[0.14] bg-white/[0.05] px-1.5 py-[1px] text-[10px] text-white/45 sm:inline">
                Quartz · 7 полей
              </span>
              <div className="ml-auto flex items-center gap-1 pr-2" data-wc>
                {props.titleRight}
              </div>
              <div className="flex h-full items-center" data-wc>
                <WinCtrl title="Свернуть" onClick={() => setMinimized(true)}>
                  <Minus size={15} />
                </WinCtrl>
                <WinCtrl title={maximized ? 'Восстановить' : 'Развернуть'} onClick={() => setMaximized((m) => !m)}>
                  {maximized ? <Square size={11} /> : <Square size={12} />}
                </WinCtrl>
                <WinCtrl title="Закрыть" close onClick={() => setOpen(false)}>
                  <X size={15} />
                </WinCtrl>
              </div>
            </div>

            {/* Тело окна */}
            <div className="min-h-0 flex-1">{props.children}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Калькулятор */}
      <CalculatorWindow
        open={calcOpen}
        zIndex={topWin === 'calc' ? 34 : 32}
        onClose={() => setCalcOpen(false)}
        onFocus={() => setTopWin('calc')}
      />

      {/* Параметры */}
      <SettingsWindow
        open={settingsOpen}
        zIndex={topWin === 'settings' ? 34 : 32}
        choice={wallChoice}
        persistFailed={persistFailed}
        onChoice={applyWallpaper}
        onClose={() => setSettingsOpen(false)}
        onFocus={() => setTopWin('settings')}
      />

      {/* Сообщение о закрытии */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/[0.12] bg-[#252525]/80 px-6 py-5 text-center shadow-2xl backdrop-blur-xl"
          >
            <p className="text-[13.5px] text-white/85">Приложение закрыто</p>
            <p className="mt-1 text-[11.5px] text-white/45">
              Дважды щёлкните значок «Cron Studio» на рабочем столе или нажмите кнопку ниже
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3.5 rounded-md border border-[#4cc2ff] bg-[#4cc2ff] px-4 py-1.5 text-[12.5px] font-medium text-[#08294a] transition-colors hover:bg-[#6fd0ff]"
            >
              Запустить снова
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Taskbar
        appOpen={open}
        appMinimized={minimized}
        onAppClick={() => {
          if (!open) { setOpen(true); setMinimized(false); return; }
          setMinimized((m) => !m);
        }}
        calcOpen={calcOpen}
        onCalcClick={() => { setCalcOpen((v) => !v); setTopWin('calc'); }}
        settingsOpen={settingsOpen}
        onSettingsClick={() => { setSettingsOpen((v) => !v); setTopWin('settings'); }}
      />
    </div>
  );
}

function WinCtrl(props: { children: React.ReactNode; title: string; onClick: () => void; close?: boolean }) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      className={cn(
        'flex h-[42px] w-[46px] items-center justify-center text-white/70 transition-colors',
        props.close ? 'hover:bg-[#e81123] hover:text-white' : 'hover:bg-white/[0.09] hover:text-white',
      )}
    >
      {props.children}
    </button>
  );
}
