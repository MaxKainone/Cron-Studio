import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export function FloatingWindow(props: {
  title: string;
  icon: React.ReactNode;
  width: number;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ sx: 0, sy: 0, bx: 0, by: 0 });

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-wc]')) return;
    drag.current = { sx: e.clientX, sy: e.clientY, bx: pos.x, by: pos.y };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    const maxX = Math.max(120, window.innerWidth / 2 - 80);
    const maxY = Math.max(80, window.innerHeight / 2 - 60);
    setPos({
      x: Math.max(-maxX, Math.min(maxX, drag.current.bx + dx)),
      y: Math.max(-maxY + 60, Math.min(maxY, drag.current.by + dy)),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 10, transition: { duration: 0.16 } }}
      transition={dragging ? { duration: 0.05 } : { duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }}
      onPointerDown={props.onFocus}
      className="absolute left-1/2 flex flex-col overflow-hidden rounded-lg border border-white/[0.14] bg-[#2b2b2b]/[0.96] shadow-[0_28px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
      style={{
        width: props.width,
        top: 96,
        marginLeft: -props.width / 2,
        zIndex: props.zIndex,
        x: pos.x,
        y: pos.y,
      }}
    >
      <div
        className="flex h-[36px] shrink-0 cursor-move items-center gap-2 border-b border-white/[0.08] bg-white/[0.03] pl-3"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => setDragging(false)}
      >
        <span className="text-[#7fd4ff]">{props.icon}</span>
        <span className="text-[12px] font-medium text-white/85">{props.title}</span>
        <button
          type="button"
          data-wc
          onClick={props.onClose}
          title="Закрыть"
          className="ml-auto flex h-[36px] w-[40px] items-center justify-center text-white/60 transition-colors hover:bg-[#e81123] hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      {props.children}
    </motion.div>
  );
}
