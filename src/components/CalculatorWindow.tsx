import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Calculator, Delete } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FloatingWindow } from './FloatingWindow';
import { evaluateExpression, formatNumber, prettify } from '@/lib/calc';

type Mode = 'std' | 'sci';

const LS_CALC = 'cronstudio.calc';

function loadCalcPrefs(): { mode: Mode; deg: boolean } {
  try {
    const raw = localStorage.getItem(LS_CALC);
    if (raw) {
      const p = JSON.parse(raw);
      return { mode: p.mode === 'sci' ? 'sci' : 'std', deg: p.deg !== false };
    }
  } catch { /* ignore */ }
  return { mode: 'std', deg: true };
}

const TRAIL_FUNC = /(sqrt|sin|cos|tan|ln|log|abs)\($/;

export function CalculatorWindow(props: {
  open: boolean;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
}) {
  const [expr, setExpr] = useState('');
  const [lastExpr, setLastExpr] = useState<string | null>(null);
  const [justEval, setJustEval] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(loadCalcPrefs);
  const { mode, deg } = prefs;

  useEffect(() => {
    localStorage.setItem(LS_CALC, JSON.stringify(prefs));
  }, [prefs]);

  const preview = useMemo(() => {
    if (!expr || justEval) return '';
    try {
      return '= ' + formatNumber(evaluateExpression(expr, deg));
    } catch {
      return '';
    }
  }, [expr, deg, justEval]);

  const flashErr = (msg: string) => {
    setErr(msg);
    setTimeout(() => setErr(null), 2200);
  };

  /** Вставка токена: после "=" цифры начинают новое выражение, операторы продолжают */
  const insert = useCallback((token: string, kind: 'num' | 'op' | 'func' | 'misc') => {
    setErr(null);
    setExpr((prev) => {
      if (justEval) {
        if (kind === 'op') return prev + token;
        if (kind === 'misc' && token === '%') return prev + token;
        if (token === '.') return '0.';
        return token; // цифра/функция — новое выражение
      }
      if (token === '.' && /(?:^|[+\-*/^(][^.]*)\d*\.$/.test(prev)) return prev;
      // не даём две точки в одном числе
      if (token === '.') {
        const m = prev.match(/(\d*\.?\d*)$/);
        if (m && m[1].includes('.')) return prev;
        if (m && m[1] === '') return prev + '0.';
      }
      if (kind === 'num' && /[)!%]$/.test(prev)) return prev + '*' + token; // 2( → 2*(
      if (kind === 'func' && /[\d)!%]$/.test(prev) && !/[+\-*/^(]$/.test(prev)) return prev + '*' + token;
      if (kind === 'op' && prev === '' ) return token === '-' ? '-' : prev;
      // замена хвостового бинарного оператора
      if (kind === 'op' && /[+*/^]$/.test(prev)) return prev.replace(/[+*/^]$/, token);
      if (kind === 'op' && token !== '-' && prev.endsWith('-') && /[+*/^(]-$/.test(prev)) {
        return prev.slice(0, -1) + token;
      }
      return prev + token;
    });
    setJustEval(false);
  }, [justEval]);

  const clearAll = useCallback(() => {
    setExpr('');
    setLastExpr(null);
    setJustEval(false);
    setErr(null);
  }, []);

  const clearEntry = useCallback(() => {
    setExpr((prev) => {
      if (justEval) return '';
      const m = prev.match(/^(.*?)[\d.]+$/);
      if (m) return m[1];
      return prev.slice(0, -1);
    });
  }, [justEval]);

  const backspace = useCallback(() => {
    if (justEval) { setJustEval(false); return; }
    setExpr((prev) => {
      if (TRAIL_FUNC.test(prev)) return prev.replace(TRAIL_FUNC, '');
      return prev.slice(0, -1);
    });
  }, [justEval]);

  const equals = useCallback(() => {
    if (!expr) return;
    try {
      const r = evaluateExpression(expr, deg);
      const formatted = String(parseFloat(r.toPrecision(12)));
      setLastExpr(prettify(expr) + ' =');
      setExpr(formatted);
      setJustEval(true);
      setErr(null);
    } catch (e) {
      flashErr(e instanceof Error ? e.message : 'Ошибка');
    }
  }, [expr, deg]);

  /** постфиксные операторы допустимы только после числа/скобки */
  const postfix = (t: string) => {
    setErr(null);
    setExpr((prev) => (/[\d)!%]$/.test(prev) ? prev + t : prev));
    setJustEval(false);
  };

  const pow2 = () => postfix('^2');

  const negate = () => {
    setExpr((prev) => {
      if (!prev) return '-';
      if (/^-?\d+(\.\d+)?$/.test(prev)) {
        return prev.startsWith('-') ? prev.slice(1) : '-' + prev;
      }
      return `0-(${prev})`;
    });
    setJustEval(false);
  };

  const wrap = (before: string, after: string) => {
    setExpr((prev) => {
      if (!prev) return prev;
      return `${before}(${prev})${after}`;
    });
    setJustEval(false);
  };

  // ---- клавиатура ----
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^\d$/.test(k)) insert(k, 'num');
      else if (k === '.') insert('.', 'num');
      else if (k === '+' || k === '-' || k === '*' || k === '/' || k === '^') insert(k, 'op');
      else if (k === '(' || k === ')' || k === '!') insert(k, 'misc');
      else if (k === '%') insert('%', 'misc');
      else if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); }
      else if (k === 'Backspace') backspace();
      else if (k === 'Escape' || k === 'Delete') clearAll();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [insert, equals, backspace, clearAll]);

  type V = 'num' | 'op' | 'util' | 'accent';
  const Btn = (p: { label: React.ReactNode; v?: V; onClick: () => void; title?: string }) => (
    <button
      type="button"
      title={p.title}
      onClick={p.onClick}
      className={cn(
        'flex h-[38px] select-none items-center justify-center rounded-[4px] border-b text-[13.5px] font-medium transition-all duration-75 active:translate-y-[1px] active:brightness-90',
        p.v === 'accent'
          ? 'border-[#2aa5e0] bg-[#4cc2ff] text-[#08294a] hover:bg-[#5ec8ff]'
          : p.v === 'num'
            ? 'border-white/[0.14] bg-white/[0.09] text-white hover:bg-white/[0.15]'
            : 'border-white/[0.08] bg-white/[0.04] text-white/85 hover:bg-white/[0.1]',
      )}
    >
      {p.label}
    </button>
  );

  return (
    <AnimatePresence>
      {props.open && (
        <FloatingWindow
          title="Калькулятор"
          icon={<Calculator size={13} />}
          width={mode === 'sci' ? 332 : 312}
          zIndex={props.zIndex}
          onClose={props.onClose}
          onFocus={props.onFocus}
        >
          {/* переключатель режимов */}
          <div className="flex items-center gap-1 px-3 pt-2.5">
            {([['std', 'Стандартный'], ['sci', 'Расширенный']] as Array<[Mode, string]>).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, mode: m }))}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11.5px] transition-colors',
                  mode === m
                    ? 'bg-[#4cc2ff]/[0.16] font-semibold text-[#9ae0ff] ring-1 ring-[#4cc2ff]/40'
                    : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85',
                )}
              >
                {label}
              </button>
            ))}
            {mode === 'sci' && (
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, deg: !p.deg }))}
                className="ml-auto rounded border border-white/[0.15] bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-white/60 transition-colors hover:border-[#4cc2ff]/40 hover:text-[#9ae0ff]"
                title="Переключить градусы/радианы"
              >
                {deg ? 'DEG' : 'RAD'}
              </button>
            )}
          </div>

          {/* дисплей */}
          <div className="px-3 pb-1.5 pt-2 text-right">
            <div className="h-[16px] truncate text-[11.5px] text-white/40">
              {err ? <span className="text-[#ff99a4]">{err}</span> : lastExpr ?? ''}
            </div>
            <div
              className={cn(
                'min-h-[38px] break-all font-light leading-tight text-white',
                (expr.length > 14 ? 'text-[24px]' : 'text-[30px]'),
              )}
            >
              {expr ? prettify(expr) : '0'}
            </div>
            <div className="h-[15px] truncate text-[11.5px] text-[#7fd4ff]">{preview}</div>
          </div>

          {/* научный блок */}
          {mode === 'sci' && (
            <div className="grid grid-cols-4 gap-[5px] px-3 pb-[5px]">
              <Btn label="(" v="util" onClick={() => insert('(', 'misc')} />
              <Btn label=")" v="util" onClick={() => insert(')', 'misc')} />
              <Btn label={<span>x<sup>y</sup></span>} v="util" title="Степень" onClick={() => insert('^', 'op')} />
              <Btn label="n!" v="util" title="Факториал" onClick={() => postfix('!')} />
              <Btn label="sin" v="util" onClick={() => insert('sin(', 'func')} />
              <Btn label="cos" v="util" onClick={() => insert('cos(', 'func')} />
              <Btn label="tan" v="util" onClick={() => insert('tan(', 'func')} />
              <Btn label="ln" v="util" onClick={() => insert('ln(', 'func')} />
              <Btn label="π" v="util" onClick={() => insert('pi', 'num')} />
              <Btn label="e" v="util" onClick={() => insert('e', 'num')} />
              <Btn label="log" v="util" onClick={() => insert('log(', 'func')} />
              <Btn label="|x|" v="util" title="Модуль" onClick={() => wrap('abs', '')} />
            </div>
          )}

          {/* стандартный блок */}
          <div className="grid grid-cols-4 gap-[5px] p-3 pt-[5px]">
            <Btn label="%" v="op" onClick={() => postfix('%')} />
            <Btn label="CE" v="op" onClick={clearEntry} />
            <Btn label="C" v="op" onClick={clearAll} />
            <Btn label={<Delete size={15} />} v="op" onClick={backspace} title="Стереть" />
            <Btn label={<span>1∕<i className="not-italic">x</i></span>} v="op" title="Обратное" onClick={() => wrap('1/', '')} />
            <Btn label={<span>x<sup>2</sup></span>} v="op" title="Квадрат" onClick={pow2} />
            <Btn label="√x" v="op" title="Корень" onClick={() => wrap('sqrt', '')} />
            <Btn label="÷" v="op" onClick={() => insert('/', 'op')} />
            <Btn label="7" v="num" onClick={() => insert('7', 'num')} />
            <Btn label="8" v="num" onClick={() => insert('8', 'num')} />
            <Btn label="9" v="num" onClick={() => insert('9', 'num')} />
            <Btn label="×" v="op" onClick={() => insert('*', 'op')} />
            <Btn label="4" v="num" onClick={() => insert('4', 'num')} />
            <Btn label="5" v="num" onClick={() => insert('5', 'num')} />
            <Btn label="6" v="num" onClick={() => insert('6', 'num')} />
            <Btn label="−" v="op" onClick={() => insert('-', 'op')} />
            <Btn label="1" v="num" onClick={() => insert('1', 'num')} />
            <Btn label="2" v="num" onClick={() => insert('2', 'num')} />
            <Btn label="3" v="num" onClick={() => insert('3', 'num')} />
            <Btn label="+" v="op" onClick={() => insert('+', 'op')} />
            <Btn label="±" v="num" title="Сменить знак" onClick={negate} />
            <Btn label="0" v="num" onClick={() => insert('0', 'num')} />
            <Btn label="." v="num" onClick={() => insert('.', 'num')} />
            <Btn label="=" v="accent" onClick={equals} />
          </div>
        </FloatingWindow>
      )}
    </AnimatePresence>
  );
}
