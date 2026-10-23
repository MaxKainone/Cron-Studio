import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, Copy, Check, CircleAlert, TriangleAlert, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MiniButton } from './controls';

const SEG_LABELS = ['сек', 'мин', 'час', 'д.мес', 'мес', 'д.нед', 'год'];
const SEG_COLORS = [
  'text-[#9ae0ff]', 'text-[#a8e6a1]', 'text-[#ffd58a]', 'text-[#ffab9e]',
  'text-[#d3b5ff]', 'text-[#8ae8d4]', 'text-[#f2a7d8]',
];

export function ExpressionBar(props: {
  expression: string;
  fields7: string[];
  errors: string[];
  warnings: string[];
  onParseText: (text: string) => void;
  onCopy: () => void;
  onPaste: () => void;
  onReset: () => void;
  copied: boolean;
}) {
  const [text, setText] = useState(props.expression);
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(props.expression);
  }, [props.expression]);

  const apply = (value: string) => {
    props.onParseText(value);
    setDirty(false);
  };

  return (
    <div className="rounded-lg border border-white/[0.09] bg-[#2c2c2c]/[0.72] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
          Выражение cron · Quartz · 7 полей
        </span>
        <div className="flex items-center gap-1.5">
          <MiniButton label="Вставить" icon={<ClipboardPaste size={13} />} onClick={props.onPaste} title="Вставить из буфера обмена и разобрать" />
          <MiniButton
            label={props.copied ? 'Скопировано' : 'Копировать'}
            icon={props.copied ? <Check size={13} /> : <Copy size={13} />}
            variant={props.copied ? 'default' : 'accent'}
            onClick={props.onCopy}
          />
          <MiniButton label="Сброс" icon={<RotateCcw size={12} />} onClick={props.onReset} title="Вернуть пример по умолчанию" />
        </div>
      </div>

      <input
        ref={ref}
        value={text}
        spellCheck={false}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        onKeyDown={(e) => { if (e.key === 'Enter') apply(text); }}
        onBlur={() => { if (dirty && text.trim()) apply(text); }}
        placeholder="0 0 11 ? * * *"
        className={cn(
          'w-full rounded-md border bg-[#1d2126]/80 px-4 py-3 font-mono text-[19px] tracking-[0.06em] outline-none transition-colors md:text-[22px]',
          props.errors.length
            ? 'border-[#ff99a4]/60 text-[#ffb3bb] focus:border-[#ff99a4]'
            : 'border-[#4cc2ff]/25 text-white focus:border-[#4cc2ff]',
        )}
      />

      {/* разметка полей */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {props.fields7.map((f, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span className="text-[9.5px] uppercase tracking-wider text-white/30">{SEG_LABELS[i]}</span>
            <span className={cn('font-mono text-[12px] font-medium', SEG_COLORS[i])}>{f}</span>
          </div>
        ))}
      </div>

      {(props.errors.length > 0 || props.warnings.length > 0 || dirty) && (
        <div className="mt-2.5 space-y-1">
          {dirty && text.trim() !== '' && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-white/40">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#4cc2ff]" />
              Изменения применятся по Enter или при выходе из поля
            </p>
          )}
          {props.errors.map((e, i) => (
            <p key={i} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[#ff99a4]">
              <CircleAlert size={13} className="mt-[1px] shrink-0" /> {e}
            </p>
          ))}
          {props.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[#ffd58a]/90">
              <TriangleAlert size={13} className="mt-[1px] shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
