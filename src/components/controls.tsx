import React, { useState } from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

// ---------------------------------------------------------------------------
// Карточка-акрил в стиле Windows 11
// ---------------------------------------------------------------------------

export function Card(props: {
  icon?: React.ReactNode;
  title: string;
  value?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-white/[0.09] bg-[#2c2c2c]/[0.72] shadow-[0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-xl',
        props.accent && 'border-[#4cc2ff]/40',
        props.className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-2.5">
        {props.icon && <span className="text-[#4cc2ff]">{props.icon}</span>}
        <h3 className="text-[13px] font-semibold tracking-wide text-white/90">{props.title}</h3>
        {props.value && (
          <span className="ml-auto max-w-[55%] truncate rounded border border-[#4cc2ff]/25 bg-[#4cc2ff]/[0.12] px-2 py-0.5 font-mono text-[11px] text-[#9ae0ff]">
            {props.value}
          </span>
        )}
      </header>
      <div className="px-4 py-3">
        {props.hint && <p className="mb-2.5 text-[11.5px] leading-snug text-white/45">{props.hint}</p>}
        {props.children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Выпадающий список (нативный, стилизованный под Windows)
// ---------------------------------------------------------------------------

export function ModeSelect(props: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-white/[0.14] border-b-white/[0.28] bg-[#3a3a3a] px-3 py-[7px] pr-8 text-[12.5px] text-white/90 outline-none transition-colors hover:bg-[#414141] focus:border-[#4cc2ff] focus:border-b-[#4cc2ff]"
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#2b2b2b] text-white">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Степпер (NumberBox) с кнопками +/-
// ---------------------------------------------------------------------------

export function Stepper(props: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label?: string;
  suffix?: string;
  pad?: boolean;
}) {
  const clamp = (v: number) => Math.min(props.max, Math.max(props.min, v));
  const [text, setText] = useState<string | null>(null);
  const display = text !== null ? text : props.pad ? String(props.value).padStart(2, '0') : String(props.value);
  return (
    <label className="flex min-w-0 flex-col gap-1">
      {props.label && <span className="text-[11px] text-white/50">{props.label}</span>}
      <div className="flex items-stretch overflow-hidden rounded-md border border-white/[0.14] border-b-white/[0.28] bg-[#3a3a3a] focus-within:border-[#4cc2ff]">
        <button
          type="button"
          onClick={() => props.onChange(clamp(props.value - 1))}
          className="flex w-7 items-center justify-center text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
          tabIndex={-1}
        >
          <Minus size={12} />
        </button>
        <div className="relative flex-1">
          <input
            value={display}
            onChange={(e) => {
              setText(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) props.onChange(clamp(n));
            }}
            onBlur={() => setText(null)}
            inputMode="numeric"
            className="w-full bg-transparent px-1 py-[6px] text-center font-mono text-[12.5px] text-white outline-none"
          />
          {props.suffix && (
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-white/35">
              {props.suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => props.onChange(clamp(props.value + 1))}
          className="flex w-7 items-center justify-center text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
          tabIndex={-1}
        >
          <Plus size={12} />
        </button>
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Чип (переключаемая клетка значения)
// ---------------------------------------------------------------------------

export function Chip(props: {
  label: string;
  active: boolean;
  onToggle: () => void;
  small?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={props.onToggle}
      className={cn(
        'flex items-center justify-center rounded-[4px] border font-mono transition-all duration-100 active:scale-[0.94]',
        props.small ? 'h-[26px] text-[10.5px]' : 'h-[30px] text-[11.5px]',
        props.wide ? 'px-2' : 'min-w-0',
        props.active
          ? 'border-[#4cc2ff] bg-[#4cc2ff] font-semibold text-[#0a2233] shadow-[0_0_10px_rgba(76,194,255,0.35)]'
          : 'border-white/[0.1] bg-white/[0.045] text-white/65 hover:border-white/[0.25] hover:bg-white/[0.1] hover:text-white',
      )}
    >
      {props.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Маленькая служебная кнопка
// ---------------------------------------------------------------------------

export function MiniButton(props: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'accent' | 'danger';
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        'flex h-[30px] items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-all duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40',
        props.variant === 'accent'
          ? 'border-[#4cc2ff] bg-[#4cc2ff] text-[#08294a] hover:bg-[#6fd0ff] shadow-[0_1px_6px_rgba(76,194,255,0.35)]'
          : props.variant === 'danger'
            ? 'border-[#ff99a4]/30 bg-[#ff99a4]/10 text-[#ff99a4] hover:bg-[#ff99a4]/20'
            : 'border-white/[0.14] border-b-white/[0.28] bg-[#3f3f3f]/80 text-white/85 hover:bg-[#494949]',
      )}
    >
      {props.icon}
      {props.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Строка быстрых действий «всё / чётные / нечётные / сброс»
// ---------------------------------------------------------------------------

export function QuickRow(props: {
  min: number;
  max: number;
  onSet: (vals: number[]) => void;
}) {
  const { min, max, onSet } = props;
  const all: number[] = [];
  for (let i = min; i <= max; i++) all.push(i);
  const btn = (label: string, vals: number[]) => (
    <button
      key={label}
      type="button"
      onClick={() => onSet(vals)}
      className="rounded border border-transparent px-1.5 py-0.5 text-[10.5px] text-[#4cc2ff]/80 transition-colors hover:border-[#4cc2ff]/30 hover:bg-[#4cc2ff]/10 hover:text-[#7fd4ff]"
    >
      {label}
    </button>
  );
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {btn('Всё', all)}
      {max - min > 4 && btn('Чётные', all.filter((v) => v % 2 === 0))}
      {max - min > 4 && btn('Нечётные', all.filter((v) => v % 2 === 1))}
      {btn('Очистить', [])}
    </div>
  );
}
