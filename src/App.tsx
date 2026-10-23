import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2, CircleAlert, CircleHelp, MousePointerClick, Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { DesktopShell } from '@/components/Desktop';
import { ExpressionBar } from '@/components/ExpressionBar';
import { FieldEditorCard } from '@/components/FieldEditors';
import { DescriptionCard, NextRunsCard, ExportCard } from '@/components/SidePanels';
import { HelpModal } from '@/components/HelpModal';
import {
  CronState, defaultState, buildExpression, parseExpression, validateFields,
  compileFields, PRESETS, pad2, FIELD_ORDER,
} from '@/lib/cron';

async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      ta.remove();
    }
  }
}

function pad(n: number) {
  return n < 10 ? '0' + n : String(n);
}

export default function App() {
  const [state, setState] = useState<CronState>(() => defaultState());
  const [parseError, setParseError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const notify = (msg: string, kind: 'ok' | 'err' = 'ok') => setToast({ msg, kind });

  const expression = useMemo(() => buildExpression(state), [state]);
  const fields7 = useMemo(() => expression.split(' '), [expression]);

  const validation = useMemo(() => validateFields(fields7), [fields7]);
  const compiled = useMemo(() => compileFields(fields7), [fields7]);
  const compileError = !compiled.cron ? compiled.error ?? null : null;
  const errors = useMemo(() => {
    const list = [...validation.errors];
    if (compileError && !list.some((e) => e.includes(compileError))) list.push(compileError);
    if (parseError) list.push(parseError);
    return list;
  }, [validation.errors, compileError, parseError]);
  const valid = errors.length === 0;
  const cron = valid ? compiled.cron ?? null : null;

  const patchField = (key: keyof CronState) => (patch: Partial<CronState[typeof key]>) => {
    setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
    setParseError(null);
  };

  const parseText = (text: string) => {
    const res = parseExpression(text);
    if (res.ok) {
      setState(res.state);
      setParseError(null);
      notify(
        res.format === 7
          ? 'Выражение разобрано (7 полей)'
          : `Выражение разобрано (${res.format} полей → приведено к 7)`,
      );
    } else {
      setParseError(res.error);
      notify(`Ошибка разбора: ${res.error}`, 'err');
    }
  };

  const doCopy = async () => {
    const ok = await copyText(expression);
    if (ok) {
      setCopied(true);
      notify('Выражение скопировано в буфер обмена');
      setTimeout(() => setCopied(false), 1600);
    } else {
      notify('Нет доступа к буферу обмена', 'err');
    }
  };

  const doPaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t.trim()) {
        notify('Буфер обмена пуст', 'err');
        return;
      }
      parseText(t);
    } catch {
      notify('Нет доступа к буферу — вставьте текст в поле вручную (Ctrl+V)', 'err');
    }
  };

  const tzOffset = -now.getTimezoneOffset();
  const tzStr = `GMT${tzOffset >= 0 ? '+' : '−'}${Math.abs(tzOffset) / 60}`;

  return (
    <DesktopShell
      titleRight={
        <button
          type="button"
          title="Справка по синтаксису"
          onClick={() => setHelpOpen(true)}
          className="mr-1 flex h-[26px] items-center gap-1.5 rounded-md border border-white/[0.12] bg-white/[0.05] px-2.5 text-[11.5px] text-white/70 transition-colors hover:border-[#4cc2ff]/40 hover:bg-[#4cc2ff]/10 hover:text-[#9ae0ff]"
        >
          <CircleHelp size={13} />
          Справка
        </button>
      }
    >
      <div className="relative flex h-full flex-col">
        {/* Контент */}
        <div className="win-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1720px] space-y-3.5 p-3.5 md:p-4">
            <ExpressionBar
              expression={expression}
              fields7={fields7}
              errors={errors}
              warnings={valid ? validation.warnings : []}
              onParseText={parseText}
              onCopy={doCopy}
              onPaste={doPaste}
              onReset={() => { setState(defaultState()); setParseError(null); notify('Установлен пример по умолчанию'); }}
              copied={copied}
            />

            {/* Шаблоны */}
            <div className="rounded-lg border border-white/[0.09] bg-[#2c2c2c]/[0.72] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={12} className="text-[#4cc2ff]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
                  Быстрые шаблоны
                </span>
                <span className="ml-auto hidden items-center gap-1 text-[10.5px] text-white/30 sm:flex">
                  <MousePointerClick size={11} /> один щелчок — и выражение готово
                </span>
              </div>
              <div className="win-scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.expr}
                    type="button"
                    title={p.expr}
                    onClick={() => parseText(p.expr)}
                    className={cn(
                      'shrink-0 rounded-md border px-2.5 py-[7px] text-[11.5px] font-medium transition-all active:scale-[0.97]',
                      expression === p.expr && valid
                        ? 'border-[#4cc2ff]/60 bg-[#4cc2ff]/[0.16] text-[#9ae0ff]'
                        : 'border-white/[0.1] bg-white/[0.04] text-white/65 hover:border-white/[0.25] hover:bg-white/[0.09] hover:text-white',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Основная сетка */}
            <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,1fr)_370px]">
              {/* Конструктор полей */}
              <div className="grid grid-cols-1 content-start gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
                {FIELD_ORDER.map((k) => (
                  <FieldEditorCard key={k} fieldKey={k} field={state[k]} onChange={patchField(k)} />
                ))}
              </div>

              {/* Правая колонка */}
              <div className="flex content-start flex-col gap-3.5">
                <DescriptionCard state={state} fields7={fields7} valid={valid} />
                <NextRunsCard cron={cron} now={now} />
                <ExportCard fields7={fields7} notify={notify} />
              </div>
            </div>
          </div>
        </div>

        {/* Строка состояния */}
        <footer className="flex h-[30px] shrink-0 items-center gap-4 border-t border-white/[0.08] bg-[#202020]/80 px-3 text-[11px] text-white/50 backdrop-blur-xl">
          <span className={cn('flex items-center gap-1.5', valid ? 'text-[#7fdc9a]' : 'text-[#ff99a4]')}>
            {valid ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />}
            {valid ? 'Выражение корректно' : 'Есть ошибки'}
          </span>
          <span className="hidden sm:inline">Полей: 7 (Quartz)</span>
          <span className="hidden md:inline">Длина: {expression.length} симв.</span>
          <span className="hidden lg:inline">Дни недели: 1=Вс … 7=Сб</span>
          <span className="ml-auto font-mono text-white/70">
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad2(now.getSeconds())} · {tzStr}
          </span>
        </footer>

        {/* Тост */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className={cn(
                'absolute bottom-12 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-md border px-3.5 py-2 text-[12px] shadow-2xl backdrop-blur-xl',
                toast.kind === 'ok'
                  ? 'border-[#7fdc9a]/30 bg-[#1d3226]/95 text-[#a9e8bd]'
                  : 'border-[#ff99a4]/30 bg-[#3a2226]/95 text-[#ffb3bb]',
              )}
            >
              {toast.kind === 'ok' ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} onApply={parseText} />
      </div>
    </DesktopShell>
  );
}
