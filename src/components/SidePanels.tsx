import { useState } from 'react';
import {
  BookOpenText, CalendarClock, ClipboardCopy, Check, FileOutput, Play,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, MiniButton } from './controls';
import {
  CronState, FieldKey, FIELD_ORDER, buildField, describeExpression, describeFieldValue,
  exportFormat, FieldFormat, nextRuns, CompiledCron, formatRunDate, relativeTime,
} from '@/lib/cron';

const FIELD_TITLES: Record<FieldKey, string> = {
  second: 'Секунды', minute: 'Минуты', hour: 'Часы', dom: 'День месяца',
  month: 'Месяц', dow: 'День недели', year: 'Год',
};

// ---------------------------------------------------------------------------
// Панель «Описание»
// ---------------------------------------------------------------------------

export function DescriptionCard(props: { state: CronState; fields7: string[]; valid: boolean }) {
  return (
    <Card title="Человеческим языком" icon={<BookOpenText size={14} />}>
      {props.valid ? (
        <>
          <p className="rounded-md border border-[#4cc2ff]/25 bg-gradient-to-br from-[#4cc2ff]/[0.13] to-[#4cc2ff]/[0.04] px-3 py-2.5 text-[13px] font-medium leading-relaxed text-[#cdeeff]">
            {describeExpression(props.fields7)}
          </p>
          <div className="mt-3 space-y-1">
            {FIELD_ORDER.map((k: FieldKey) => (
              <div key={k} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11.5px] transition-colors hover:bg-white/[0.04]">
                <span className="shrink-0 text-white/40">{FIELD_TITLES[k]}</span>
                <span className="truncate text-right text-white/80" title={describeFieldValue(k, buildField(k, props.state[k]))}>
                  {describeFieldValue(k, buildField(k, props.state[k]))}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[12px] text-white/40">Исправьте ошибки в выражении, чтобы увидеть расшифровку.</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Панель «Ближайшие запуски»
// ---------------------------------------------------------------------------

export function NextRunsCard(props: { cron: CompiledCron | null; now: Date }) {
  if (!props.cron) {
    return (
      <Card title="Ближайшие запуски" icon={<CalendarClock size={14} />}>
        <p className="text-[12px] text-white/40">—</p>
      </Card>
    );
  }
  const runs = nextRuns(props.cron, 8, props.now);
  return (
    <Card title="Ближайшие запуски" icon={<CalendarClock size={14} />}>
      <ol className="space-y-[3px]">
        {runs.length === 0 && (
          <p className="py-1 text-[12px] text-white/40">Не найдено запусков в ближайшие 12 лет.</p>
        )}
        {runs.map((r, i) => (
          <li
            key={i}
            className={cn(
              'flex items-center justify-between gap-2 rounded-md border px-2.5 py-[7px]',
              i === 0
                ? 'border-[#4cc2ff]/30 bg-[#4cc2ff]/[0.1]'
                : 'border-transparent hover:bg-white/[0.045]',
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Play size={9} className={i === 0 ? 'shrink-0 text-[#4cc2ff]' : 'shrink-0 text-white/25'} />
              <span className={cn('truncate text-[12px]', i === 0 ? 'font-medium text-white' : 'text-white/70')}>
                {formatRunDate(r, props.now)}
              </span>
            </div>
            <span className={cn('shrink-0 text-[10.5px]', i === 0 ? 'text-[#9ae0ff]' : 'text-white/35')}>
              {relativeTime(props.now, r)}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Панель «Экспорт»
// ---------------------------------------------------------------------------

export function ExportCard(props: { fields7: string[]; notify: (msg: string) => void }) {
  const [fmt, setFmt] = useState<FieldFormat>(7);
  const [copied, setCopied] = useState<FieldFormat | null>(null);
  const res = exportFormat(props.fields7, fmt);

  const options: Array<{ v: FieldFormat; label: string }> = [
    { v: 7, label: '7 полей · Quartz (с годом)' },
    { v: 6, label: '6 полей · Quartz (без года)' },
    { v: 5, label: '5 полей · классический cron' },
  ];

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(res.text);
      setCopied(fmt);
      props.notify(`Скопировано (${fmt} полей)`);
    } catch {
      props.notify('Не удалось получить доступ к буферу');
    }
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Card title="Экспорт выражения" icon={<FileOutput size={14} />}>
      <div className="mb-2.5 space-y-1">
        {options.map((o) => (
          <label
            key={o.v}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-[7px] text-[12px] transition-colors',
              fmt === o.v
                ? 'border-[#4cc2ff]/40 bg-[#4cc2ff]/[0.1] text-white'
                : 'border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/85',
            )}
          >
            <span
              className={cn(
                'flex h-[14px] w-[14px] items-center justify-center rounded-full border',
                fmt === o.v ? 'border-[#4cc2ff] bg-[#4cc2ff]' : 'border-white/35',
              )}
            >
              {fmt === o.v && <span className="h-[5px] w-[5px] rounded-full bg-[#0a2233]" />}
            </span>
            <input
              type="radio"
              className="hidden"
              checked={fmt === o.v}
              onChange={() => setFmt(o.v)}
            />
            {o.label}
          </label>
        ))}
      </div>
      <div className="flex items-stretch gap-2">
        <code className="flex flex-1 items-center overflow-x-auto whitespace-nowrap rounded-md border border-white/[0.12] bg-[#1d2126]/80 px-3 py-2 font-mono text-[12.5px] text-[#9ae0ff]">
          {res.text}
        </code>
        <MiniButton
          label=""
          title="Скопировать"
          icon={copied === fmt ? <Check size={13} /> : <ClipboardCopy size={13} />}
          variant={copied === fmt ? 'default' : 'accent'}
          onClick={doCopy}
        />
      </div>
      {res.note && <p className="mt-2 text-[10.5px] leading-snug text-white/35">{res.note}</p>}
    </Card>
  );
}
