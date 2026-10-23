// ---------------------------------------------------------------------------
// Cron Studio — ядро: парсинг, сборка, валидация, описание и расчёт запусков
// Формат Quartz: сек мин час день-месяца месяц день-недели [год]
// Дни недели (Quartz): 1=Вс, 2=Пн, 3=Вт, 4=Ср, 5=Чт, 6=Пт, 7=Сб
// ---------------------------------------------------------------------------

export type FieldKey = 'second' | 'minute' | 'hour' | 'dom' | 'month' | 'dow' | 'year';

export interface BaseField {
  mode: string;
  values: number[];   // specific
  start: number;      // interval start
  step: number;       // interval / rangeInterval step
  rangeStart: number;
  rangeEnd: number;
  custom: string;     // raw text for custom mode
  offset: number;     // dom: L-n
  weekday: number;    // dom: nW / dow: nth & lastDow target
  nth: number;        // dow: #n
}

export interface CronState {
  second: BaseField;
  minute: BaseField;
  hour: BaseField;
  dom: BaseField;
  month: BaseField;
  dow: BaseField;
  year: BaseField;
}

export const FIELD_ORDER: FieldKey[] = ['second', 'minute', 'hour', 'dom', 'month', 'dow', 'year'];

export const RANGES: Record<FieldKey, [number, number]> = {
  second: [0, 59],
  minute: [0, 59],
  hour: [0, 23],
  dom: [1, 31],
  month: [1, 12],
  dow: [1, 7],
  year: [1970, 2099],
};

export const DOW_EN = ['', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const DOW_ALIAS: Record<string, number> = {
  SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7,
};
export const MON_ALIAS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

export const DOW_RU: Record<number, string> = {
  1: 'Вс', 2: 'Пн', 3: 'Вт', 4: 'Ср', 5: 'Чт', 6: 'Пт', 7: 'Сб',
};
export const DOW_RU_FULL: Record<number, string> = {
  1: 'воскресенье', 2: 'понедельник', 3: 'вторник', 4: 'среда',
  5: 'четверг', 6: 'пятница', 7: 'суббота',
};
export const DOW_RU_PLURAL: Record<number, string> = {
  1: 'воскресеньям', 2: 'понедельникам', 3: 'вторникам', 4: 'средам',
  5: 'четвергам', 6: 'пятницам', 7: 'субботам',
};
export const MONTH_RU: Record<number, string> = {
  1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр', 5: 'Май', 6: 'Июн',
  7: 'Июл', 8: 'Авг', 9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек',
};
export const MONTH_RU_FULL: Record<number, string> = {
  1: 'январь', 2: 'февраль', 3: 'март', 4: 'апрель', 5: 'май', 6: 'июнь',
  7: 'июль', 8: 'август', 9: 'сентябрь', 10: 'октябрь', 11: 'ноябрь', 12: 'декабрь',
};
export const MONTH_RU_PREP: Record<number, string> = {
  1: 'январе', 2: 'феврале', 3: 'марте', 4: 'апреле', 5: 'мае', 6: 'июне',
  7: 'июле', 8: 'августе', 9: 'сентябре', 10: 'октябре', 11: 'ноябре', 12: 'декабре',
};

export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m = Math.abs(n) % 100;
  const d = m % 10;
  if (m > 10 && m < 20) return many;
  if (d > 1 && d < 5) return few;
  if (d === 1) return one;
  return many;
}

export function blankField(): BaseField {
  return {
    mode: 'every', values: [], start: 0, step: 5,
    rangeStart: 0, rangeEnd: 5, custom: '', offset: 3, weekday: 6, nth: 2,
  };
}

export function defaultState(): CronState {
  const second = blankField(); second.mode = 'specific'; second.values = [0];
  const minute = blankField(); minute.mode = 'specific'; minute.values = [0];
  const hour = blankField(); hour.mode = 'specific'; hour.values = [11];
  const dom = blankField(); dom.mode = 'none';
  const month = blankField(); month.mode = 'every';
  const dow = blankField(); dow.mode = 'every';
  const year = blankField(); year.mode = 'every';
  return { second, minute, hour, dom, month, dow, year };
}

// ---------------------------------------------------------------------------
// Сборка выражения из состояния
// ---------------------------------------------------------------------------

function dedupeSort(arr: number[]): number[] {
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

function dowTok(v: number): string {
  return DOW_EN[v] ?? String(v);
}

export function buildField(key: FieldKey, f: BaseField): string {
  const [min, max] = RANGES[key];
  const isDow = key === 'dow';
  const t = (v: number) => (isDow ? dowTok(v) : String(v));
  switch (f.mode) {
    case 'every':
      return '*';
    case 'none':
      return '?';
    case 'interval': {
      const start = Math.min(Math.max(f.start, min), max);
      return `${isDow ? t(start) : start}/${Math.max(1, f.step)}`;
    }
    case 'specific': {
      const vs = dedupeSort(f.values.filter((v) => v >= min && v <= max));
      if (!vs.length) return key === 'dom' || key === 'dow' ? '?' : '*';
      return isDow ? vs.map(dowTok).join(',') : vs.join(',');
    }
    case 'range': {
      const a = Math.min(Math.max(f.rangeStart, min), max);
      const b = Math.min(Math.max(f.rangeEnd, min), max);
      return `${t(Math.min(a, b))}-${t(Math.max(a, b))}`;
    }
    case 'rangeInterval': {
      const a = Math.min(Math.max(f.rangeStart, min), max);
      const b = Math.min(Math.max(f.rangeEnd, min), max);
      return `${t(Math.min(a, b))}-${t(Math.max(a, b))}/${Math.max(1, f.step)}`;
    }
    case 'last':
      return 'L';
    case 'lastOffset':
      return `L-${Math.min(Math.max(f.offset, 0), 30)}`;
    case 'lastWeekday':
      return 'LW';
    case 'nearestWeekday':
      return `${Math.min(Math.max(f.weekday, 1), 31)}W`;
    case 'nth':
      return `${dowTok(f.weekday)}#${Math.min(Math.max(f.nth, 1), 5)}`;
    case 'lastDow':
      return `${dowTok(f.weekday)}L`;
    default:
      return f.custom.trim() || (key === 'dom' || key === 'dow' ? '?' : '*');
  }
}

export function buildExpression(s: CronState): string {
  return FIELD_ORDER.map((k) => buildField(k, s[k])).join(' ');
}

// ---------------------------------------------------------------------------
// Парсинг текста в состояние
// ---------------------------------------------------------------------------

function parseToken(tok: string, alias: Record<string, number> | null): number {
  const up = tok.toUpperCase();
  if (alias && up in alias) return alias[up];
  const n = parseInt(up, 10);
  return Number.isNaN(n) ? -9999 : n;
}

export function parseFieldSpec(key: FieldKey, spec: string): BaseField {
  const f = blankField();
  f.custom = spec;
  const s = spec.trim().toUpperCase();
  const alias = key === 'dow' ? DOW_ALIAS : key === 'month' ? MON_ALIAS : null;
  const [min] = RANGES[key];

  if (s === '*') { f.mode = 'every'; return f; }
  if (s === '?') { f.mode = key === 'dom' || key === 'dow' ? 'none' : 'custom'; return f; }

  if (key === 'dom') {
    if (s === 'L') { f.mode = 'last'; return f; }
    let m = s.match(/^L-(\d{1,2})$/);
    if (m) { f.mode = 'lastOffset'; f.offset = parseInt(m[1], 10); return f; }
    if (s === 'LW') { f.mode = 'lastWeekday'; return f; }
    m = s.match(/^(\d{1,2})W$/);
    if (m) { f.mode = 'nearestWeekday'; f.weekday = parseInt(m[1], 10); return f; }
  }
  if (key === 'dow') {
    let m = s.match(/^([A-Z]{3}|\d)#([1-5])$/);
    if (m) {
      f.mode = 'nth';
      f.weekday = parseToken(m[1], alias);
      f.nth = parseInt(m[2], 10);
      return f;
    }
    m = s.match(/^([A-Z]{3}|\d)L$/);
    if (m) { f.mode = 'lastDow'; f.weekday = parseToken(m[1], alias); return f; }
    if (s === 'L') { f.mode = 'lastDow'; f.weekday = 7; return f; }
  }

  let m = s.match(/^(\*|\?|[A-Z]{3}|\d{1,4})\/(\d{1,3})$/);
  if (m) {
    f.mode = 'interval';
    f.start = m[1] === '*' || m[1] === '?' ? min : parseToken(m[1], alias);
    f.step = Math.max(1, parseInt(m[2], 10));
    return f;
  }
  m = s.match(/^([A-Z]{3}|\d{1,4})-([A-Z]{3}|\d{1,4})(?:\/(\d{1,3}))?$/);
  if (m) {
    f.rangeStart = parseToken(m[1], alias);
    f.rangeEnd = parseToken(m[2], alias);
    if (m[3]) { f.mode = 'rangeInterval'; f.step = Math.max(1, parseInt(m[3], 10)); }
    else f.mode = 'range';
    return f;
  }
  if (/^([A-Z]{3}|\d{1,4})(,([A-Z]{3}|\d{1,4}))*$/.test(s)) {
    f.mode = 'specific';
    f.values = s.split(',').map((x) => parseToken(x, alias));
    return f;
  }
  f.mode = 'custom';
  return f;
}

export type FieldFormat = 5 | 6 | 7;

/** Конвертация нумерации дня недели из классического cron (0=Вс..6=Сб, 7=Вс) в Quartz (1=Вс..7=Сб) */
function classicDowToQuartz(spec: string): string {
  return spec.replace(/\d+/g, (d) => {
    const n = parseInt(d, 10);
    if (n >= 0 && n <= 7) return String(n === 0 || n === 7 ? 1 : n + 1);
    return d;
  });
}

export interface ParseOk {
  ok: true;
  state: CronState;
  format: FieldFormat;
  fields7: string[];
  warnings: string[];
}
export interface ParseErr {
  ok: false;
  error: string;
}
export type ParseResult = ParseOk | ParseErr;

export function parseExpression(input: string): ParseResult {
  const clean = input.trim().replace(/\s+/g, ' ');
  if (!clean) return { ok: false, error: 'Пустое выражение' };
  const parts = clean.split(' ');
  const warnings: string[] = [];
  let fields7: string[];
  let format: FieldFormat;

  if (parts.length === 5) {
    format = 5;
    fields7 = ['0', parts[0], parts[1], parts[2], parts[3], classicDowToQuartz(parts[4]), '*'];
    warnings.push('5 полей: добавлены секунды (0) и год (*), день недели пересчитан в формат Quartz');
  } else if (parts.length === 6) {
    format = 6;
    fields7 = [...parts, '*'];
    warnings.push('6 полей: добавлен год (*)');
  } else if (parts.length === 7) {
    format = 7;
    fields7 = [...parts];
  } else {
    return { ok: false, error: `Ожидается 5, 6 или 7 полей, получено: ${parts.length}` };
  }

  const state: CronState = {
    second: parseFieldSpec('second', fields7[0]),
    minute: parseFieldSpec('minute', fields7[1]),
    hour: parseFieldSpec('hour', fields7[2]),
    dom: parseFieldSpec('dom', fields7[3]),
    month: parseFieldSpec('month', fields7[4]),
    dow: parseFieldSpec('dow', fields7[5]),
    year: parseFieldSpec('year', fields7[6]),
  };
  return { ok: true, state, format, fields7, warnings };
}

// ---------------------------------------------------------------------------
// Компиляция выражения для расчёта и валидации
// ---------------------------------------------------------------------------

export interface CompiledCron {
  seconds: number[] | null;
  minutes: number[] | null;
  hours: number[] | null;
  months: number[] | null;
  years: number[] | null;
  domAny: boolean;
  domSet: number[] | null;
  domLast: boolean;
  domLastOffset: number | null;
  domLastWeekday: boolean;
  domNearestWeekday: number | null;
  dowAny: boolean;
  dowSet: number[] | null;
  dowNth: { dow: number; n: number } | null;
  dowLastSet: number[];
}

function expandSpec(spec: string, min: number, max: number, alias: Record<string, number> | null): number[] | null {
  const out = new Set<number>();
  const parts = spec.split(',');
  for (const rawPart of parts) {
    const tok = rawPart.trim().toUpperCase();
    if (!tok) throw new Error('Пустой элемент списка');
    const sm = tok.match(/^(.+)\/(\d+)$/);
    const base = sm ? sm[1] : tok;
    const step = sm ? parseInt(sm[2], 10) : 1;
    if (step < 1) throw new Error(`Шаг должен быть ≥ 1: «${tok}»`);
    let lo: number;
    let hi: number;
    if (base === '*' || base === '?') {
      lo = min; hi = max;
    } else {
      const rm = base.match(/^([A-Z]+|\d+)-([A-Z]+|\d+)$/);
      if (rm) {
        lo = parseToken(rm[1], alias);
        hi = parseToken(rm[2], alias);
        if (lo > hi) throw new Error(`Диапазон обратный: «${base}»`);
      } else {
        lo = parseToken(base, alias);
        hi = sm ? max : lo;
      }
    }
    if (lo < min || hi > max || lo < 0) {
      throw new Error(`Значение вне диапазона ${min}–${max}: «${base}»`);
    }
    for (let i = lo; i <= hi; i += step) out.add(i);
  }
  const arr = Array.from(out).sort((a, b) => a - b);
  if (arr.length >= max - min + 1) return null; // охватывает всё
  return arr;
}

export function compileFields(fields7: string[]): { cron?: CompiledCron; error?: string } {
  try {
    const sec = expandSpec(fields7[0], 0, 59, null);
    const min = expandSpec(fields7[1], 0, 59, null);
    const hour = expandSpec(fields7[2], 0, 23, null);
    const months = expandSpec(fields7[3 + 1], 1, 12, MON_ALIAS);
    const years = expandSpec(fields7[6], 1970, 2099, null);

    // --- день месяца ---
    let domAny = false;
    let domSet: number[] | null = null;
    let domLast = false;
    let domLastOffset: number | null = null;
    let domLastWeekday = false;
    let domNearestWeekday: number | null = null;
    const domNormal: string[] = [];
    for (const tokRaw of fields7[3].split(',')) {
      const tok = tokRaw.trim().toUpperCase();
      if (tok === '*' || tok === '?') { domAny = true; continue; }
      if (tok === 'L') { domLast = true; continue; }
      let m = tok.match(/^L-(\d{1,2})$/);
      if (m) { domLastOffset = parseInt(m[1], 10); continue; }
      if (tok === 'LW') { domLastWeekday = true; continue; }
      m = tok.match(/^(\d{1,2})W$/);
      if (m) { domNearestWeekday = parseInt(m[1], 10); continue; }
      if (tok === 'C') { domAny = true; continue; }
      domNormal.push(tok);
    }
    if (domNormal.length) {
      domSet = expandSpec(domNormal.join(','), 1, 31, null);
      if (domSet === null && !domLast && domLastOffset === null && !domLastWeekday && domNearestWeekday === null) {
        domAny = true;
      }
    }
    if (!domAny && domSet === null && !domLast && domLastOffset === null && !domLastWeekday && domNearestWeekday === null) {
      domAny = true;
    }

    // --- день недели ---
    let dowAny = false;
    let dowSet: number[] | null = null;
    let dowNth: { dow: number; n: number } | null = null;
    const dowLastSet: number[] = [];
    const dowNormal: string[] = [];
    for (const tokRaw of fields7[5].split(',')) {
      const tok = tokRaw.trim().toUpperCase();
      if (tok === '*' || tok === '?') { dowAny = true; continue; }
      let m = tok.match(/^([A-Z]{3}|\d)#([1-5])$/);
      if (m) {
        dowNth = { dow: parseToken(m[1], DOW_ALIAS), n: parseInt(m[2], 10) };
        continue;
      }
      m = tok.match(/^([A-Z]{3}|\d)L$/);
      if (m) { dowLastSet.push(parseToken(m[1], DOW_ALIAS)); continue; }
      if (tok === 'L') { dowLastSet.push(7); continue; }
      dowNormal.push(tok);
    }
    if (dowNormal.length) {
      const expanded = expandSpec(dowNormal.join(','), 1, 7, DOW_ALIAS);
      if (expanded === null) dowAny = true; else dowSet = expanded;
    }
    if (!dowAny && dowSet === null && dowNth === null && dowLastSet.length === 0) {
      dowAny = true;
    }

    return {
      cron: {
        seconds: sec, minutes: min, hours: hour, months, years,
        domAny, domSet, domLast, domLastOffset, domLastWeekday, domNearestWeekday,
        dowAny, dowSet, dowNth, dowLastSet,
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка разбора' };
  }
}

export function validateFields(fields7: string[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const labels: Record<number, string> = {
    0: 'Секунды', 1: 'Минуты', 2: 'Часы', 3: 'День месяца', 4: 'Месяц', 5: 'День недели', 6: 'Год',
  };
  const single: Array<[number, number, number, Record<string, number> | null]> = [
    [0, 0, 59, null], [1, 0, 59, null], [2, 0, 23, null], [3, 1, 31, null],
    [4, 1, 12, MON_ALIAS], [5, 1, 7, DOW_ALIAS], [6, 1970, 2099, null],
  ];
  for (const [idx, a, b, alias] of single) {
    const spec = fields7[idx];
    try {
      if (idx === 3 || idx === 5) {
        expandLoose(spec, a, b, alias);
      } else {
        expandSpec(spec, a, b, alias);
      }
    } catch (e) {
      errors.push(`${labels[idx]}: ${e instanceof Error ? e.message : 'ошибка'}`);
    }
  }
  const dom = fields7[3];
  const dow = fields7[5];
  const domRestr = dom !== '?' && dom !== '*';
  const dowRestr = dow !== '?' && dow !== '*';
  if (domRestr && dowRestr) {
    warnings.push('Quartz рекомендует использовать «?» в одном из полей «день месяца» / «день недели». Сейчас ограничены оба — расчёт выполняется по совпадению обоих условий.');
  }
  return { errors, warnings };
}

function expandLoose(spec: string, min: number, max: number, alias: Record<string, number> | null): number[] | null {
  const cleaned = spec
    .split(',')
    .map((t) => t.trim())
    .filter((t) => !/[LWC#?*]/i.test(t) || /^(\*|\?)(\/\d+)?$/.test(t))
    .map((t) => t.replace(/\*(?=\d)/, ''))
    .filter((t) => !/L|W|C|#/i.test(t));
  if (!cleaned.length) return null;
  return expandSpec(cleaned.join(','), min, max, alias);
}

// ---------------------------------------------------------------------------
// Расчёт ближайших запусков
// ---------------------------------------------------------------------------

function daysInMonth(y: number, m1: number): number {
  return new Date(y, m1, 0).getDate();
}

function lastWeekdayDate(y: number, m1: number): number {
  let d = daysInMonth(y, m1);
  while (true) {
    const wd = new Date(y, m1 - 1, d).getDay();
    if (wd !== 0 && wd !== 6) return d;
    d--;
  }
}

function nearestWeekdayDate(y: number, m1: number, day: number): number {
  const dim = daysInMonth(y, m1);
  const d = Math.min(day, dim);
  const wd = new Date(y, m1 - 1, d).getDay();
  if (wd === 6) return d > 1 ? d - 1 : d + 2; // суббота → пт (или пн, если 1-е)
  if (wd === 0) return d + 2 <= dim ? d + 1 : d - 2; // воскресенье → пн
  return d;
}

function nthDowDate(y: number, m1: number, dowQ: number, n: number): number {
  const dim = daysInMonth(y, m1);
  let count = 0;
  for (let d = 1; d <= dim; d++) {
    if (new Date(y, m1 - 1, d).getDay() + 1 === dowQ) {
      count++;
      if (count === n) return d;
    }
  }
  return -1;
}

function lastDowDate(y: number, m1: number, dowQ: number): number {
  let d = daysInMonth(y, m1);
  while (new Date(y, m1 - 1, d).getDay() + 1 !== dowQ) d--;
  return d;
}

function dayMatches(c: CompiledCron, t: Date): boolean {
  const y = t.getFullYear();
  const m1 = t.getMonth() + 1;
  const date = t.getDate();
  const dim = daysInMonth(y, m1);
  const dowQ = t.getDay() + 1;

  let domOk = false;
  if (c.domAny) domOk = true;
  else {
    if (c.domSet && c.domSet.includes(Math.min(date, 31)) && c.domSet.includes(date)) domOk = true;
    if (!domOk && c.domLast && date === dim) domOk = true;
    if (!domOk && c.domLastOffset !== null && date === Math.max(1, dim - c.domLastOffset)) domOk = true;
    if (!domOk && c.domLastWeekday && date === lastWeekdayDate(y, m1)) domOk = true;
    if (!domOk && c.domNearestWeekday !== null && date === nearestWeekdayDate(y, m1, c.domNearestWeekday)) domOk = true;
  }

  let dowOk = false;
  if (c.dowAny) dowOk = true;
  else {
    if (c.dowSet && c.dowSet.includes(dowQ)) dowOk = true;
    if (!dowOk && c.dowNth && nthDowDate(y, m1, c.dowNth.dow, c.dowNth.n) === date) dowOk = true;
    if (!dowOk && c.dowLastSet.length) {
      for (const ld of c.dowLastSet) {
        if (lastDowDate(y, m1, ld) === date) { dowOk = true; break; }
      }
    }
  }
  return domOk && dowOk;
}

function nextGT(arr: number[], v: number): number | null {
  for (const x of arr) if (x > v) return x;
  return null;
}

export function nextRuns(c: CompiledCron, count: number, from: Date = new Date(), maxRuns?: number): Date[] {
  const out: Date[] = [];
  const limit = new Date(from.getTime() + 1000 * 60 * 60 * 24 * 366 * 12);
  let t = new Date(from.getTime() + 1000);
  t.setMilliseconds(0);
  const target = maxRuns ?? count;
  let guard = 0;
  while (out.length < target && t < limit && guard++ < 3_000_000) {
    const y = t.getFullYear();
    if (c.years && !c.years.includes(y)) { t = new Date(y + 1, 0, 1, 0, 0, 0, 0); continue; }
    if (c.months && !c.months.includes(t.getMonth() + 1)) {
      t = new Date(y, t.getMonth() + 1, 1, 0, 0, 0, 0);
      continue;
    }
    if (!dayMatches(c, t)) { t = new Date(y, t.getMonth(), t.getDate() + 1, 0, 0, 0, 0); continue; }
    const h = t.getHours();
    if (c.hours && !c.hours.includes(h)) {
      const nh = nextGT(c.hours, h);
      if (nh === null) t = new Date(y, t.getMonth(), t.getDate() + 1, 0, 0, 0, 0);
      else t = new Date(y, t.getMonth(), t.getDate(), nh, 0, 0, 0);
      continue;
    }
    const mi = t.getMinutes();
    if (c.minutes && !c.minutes.includes(mi)) {
      const nm = nextGT(c.minutes, mi);
      if (nm === null) t = new Date(y, t.getMonth(), t.getDate(), h + 1, 0, 0, 0);
      else t = new Date(y, t.getMonth(), t.getDate(), h, nm, 0, 0);
      continue;
    }
    const s = t.getSeconds();
    if (c.seconds && !c.seconds.includes(s)) {
      const ns = nextGT(c.seconds, s);
      if (ns === null) t = new Date(y, t.getMonth(), t.getDate(), h, mi + 1, 0, 0);
      else t = new Date(y, t.getMonth(), t.getDate(), h, mi, ns, 0);
      continue;
    }
    out.push(new Date(t));
    t = new Date(t.getTime() + 1000);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Человекочитаемое описание (русский)
// ---------------------------------------------------------------------------

const ORD_M = ['', 'первый', 'второй', 'третий', 'четвёртый', 'пятый'];
const ORD_F = ['', 'первую', 'вторую', 'третью', 'четвёртую', 'пятую'];
const ORD_N = ['', 'первое', 'второе', 'третье', 'четвёртое', 'пятое'];
const ORD_M_ACC = ['', 'каждый первый', 'каждый второй', 'каждый третий', 'каждый четвёртый', 'каждый пятый'];
const ORD_F_ACC = ['', 'каждую первую', 'каждую вторую', 'каждую третью', 'каждую четвёртую', 'каждую пятую'];
const ORD_N_ACC = ['', 'каждое первое', 'каждое второе', 'каждое третье', 'каждое четвёртое', 'каждое пятое'];
const DOW_LAST: Record<number, string> = {
  1: 'последнее воскресенье', 2: 'последний понедельник', 3: 'последний вторник',
  4: 'последнюю среду', 5: 'последний четверг', 6: 'последнюю пятницу', 7: 'последнюю субботу',
};
const DOW_GENDER: Record<number, 'm' | 'f' | 'n'> = {
  1: 'n', 2: 'm', 3: 'm', 4: 'f', 5: 'm', 6: 'f', 7: 'f',
};
export const DOW_RU_ACC: Record<number, string> = {
  1: 'воскресенье', 2: 'понедельник', 3: 'вторник', 4: 'среду',
  5: 'четверг', 6: 'пятницу', 7: 'субботу',
};

function singleValue(spec: string, alias: Record<string, number> | null): number | null {
  const m = spec.trim().toUpperCase();
  if (/^([A-Z]{3}|\d{1,4})$/.test(m)) {
    const v = parseToken(m, alias);
    return v === -9999 ? null : v;
  }
  return null;
}

function intervalOf(spec: string): { start: string; step: number } | null {
  const m = spec.trim().toUpperCase().match(/^(\*|\?|[A-Z]{3}|\d{1,4})\/(\d{1,3})$/);
  if (!m) return null;
  return { start: m[1], step: parseInt(m[2], 10) };
}

function describeTime(sec: string, min: string, hour: string): { lead: string } {
  const s = singleValue(sec, null);
  const m = singleValue(min, null);
  const h = singleValue(hour, null);
  if (s !== null && m !== null && h !== null) {
    return { lead: `в ${pad2(h)}:${pad2(m)}:${pad2(s)}` };
  }
  // каждые N секунд
  const si = intervalOf(sec);
  if (si && (min === '*' || min === '?') && (hour === '*' || hour === '?')) {
    return { lead: `каждые ${si.step} ${plural(si.step, 'секунду', 'секунды', 'секунд')}` };
  }
  if (sec === '*') return { lead: 'каждую секунду' };
  // каждые N минут
  const mi = intervalOf(min);
  if (s !== null && mi && (hour === '*' || hour === '?')) {
    const base = mi.start !== '*' && mi.start !== '?' && mi.start !== '0' ? `, начиная с ${mi.start}-й` : '';
    return { lead: `каждые ${mi.step} ${plural(mi.step, 'минуту', 'минуты', 'минут')}${base}` };
  }
  // каждые N часов
  const hi = intervalOf(hour);
  if (s === 0 && m === 0 && hi) {
    const base = hi.start !== '*' && hi.start !== '?' && hi.start !== '0' ? `, начиная с ${hi.start}:00` : '';
    return { lead: `каждые ${hi.step} ${plural(hi.step, 'час', 'часа', 'часов')}${base}` };
  }
  // каждый час в mm:ss
  if (s !== null && m !== null && (hour === '*' || hour === '?')) {
    return { lead: `каждый час в ${pad2(m)}:${pad2(s)}` };
  }
  // каждую минуту
  if (s !== null && (min === '*' || min === '?') && (hour === '*' || hour === '?')) {
    return { lead: `каждую минуту на ${s}-й секунде` };
  }
  // диапазоны часов
  const hr = hour.trim().match(/^(\d{1,2})-(\d{1,2})(?:\/(\d{1,2}))?$/);
  if (hr) {
    if (s !== null && mi) {
      return { lead: `каждые ${mi.step} ${plural(mi.step, 'минуту', 'минуты', 'минут')} с ${hr[1]}:00 до ${hr[2]}:59` };
    }
    if (s !== null && m !== null && !hr[3]) {
      return { lead: `каждый час с ${hr[1]} до ${hr[2]} ч в ${pad2(m)}:${pad2(s)}` };
    }
    if (s === 0 && m === 0 && hr[3]) {
      const n = parseInt(hr[3], 10);
      return { lead: `каждые ${n} ${plural(n, 'час', 'часа', 'часов')} с ${hr[1]}:00 до ${hr[2]}:59` };
    }
  }
  return { lead: `время: сек=${sec}, мин=${min}, ч=${hour}` };
}

function dowListText(spec: string): number[] {
  try {
    const v = expandSpec(spec, 1, 7, DOW_ALIAS);
    return v ?? [1, 2, 3, 4, 5, 6, 7];
  } catch {
    return [];
  }
}

function describeDay(dom: string, dow: string): string {
  const domU = dom.trim().toUpperCase();
  const dowU = dow.trim().toUpperCase();
  const domAnyV = domU === '?' || domU === '*' || domU === 'C';
  const dowAnyV = dowU === '?' || dowU === '*';

  if (domAnyV && dowAnyV) return 'каждый день';

  if (!domAnyV) {
    if (domU === 'L') return 'в последний день месяца';
    const lo = domU.match(/^L-(\d{1,2})$/);
    if (lo) {
      const n = parseInt(lo[1], 10);
      return `за ${n} ${plural(n, 'день', 'дня', 'дней')} до конца месяца`;
    }
    if (domU === 'LW') return 'в последний будний день месяца';
    const nw = domU.match(/^(\d{1,2})W$/);
    if (nw) return `в ближайший будний день к ${nw[1]}-му числу месяца`;
    const iv = intervalOf(domU);
    if (iv) {
      const n = iv.step;
      return `каждые ${n} ${plural(n, 'день', 'дня', 'дней')} месяца`;
    }
    if (/^\d{1,2}$/.test(domU)) return `каждое ${domU}-е число месяца`;
    if (/^\d{1,2}(,\d{1,2})+$/.test(domU)) return `по числам: ${domU.split(',').join(', ')}`;
    const rm = domU.match(/^(\d{1,2})-(\d{1,2})(?:\/(\d+))?$/);
    if (rm) {
      if (rm[3]) return `с ${rm[1]}-го по ${rm[2]}-е число каждые ${rm[3]} дн.`;
      return `с ${rm[1]}-го по ${rm[2]}-е число`;
    }
    return `в дни месяца: ${dom}`;
  }

  // dow restricted
  if (dowU.includes('#')) {
    const m = dowU.match(/^([A-Z]{3}|\d)#([1-5])$/);
    if (m) {
      const d = parseToken(m[1], DOW_ALIAS);
      const n = parseInt(m[2], 10);
      const g = DOW_GENDER[d] ?? 'm';
      const ord = g === 'f' ? ORD_F_ACC[n] : g === 'n' ? ORD_N_ACC[n] : ORD_M_ACC[n];
      return `${ord} ${DOW_RU_ACC[d] ?? m[1]} месяца`;
    }
  }
  if (dowU.endsWith('L') && dowU !== 'L') {
    const base = dowU.slice(0, -1);
    const d = parseToken(base, DOW_ALIAS);
    return `в ${DOW_LAST[d] ?? 'последний день недели'} месяца`;
  }
  const list = dowListText(dowU);
  if (list.length === 7) return 'каждый день';
  const isWeekdays = list.length === 5 && [2, 3, 4, 5, 6].every((x) => list.includes(x));
  if (isWeekdays) return 'по будням';
  const isWeekend = list.length === 2 && list.includes(1) && list.includes(7);
  if (isWeekend) return 'по выходным';
  if (list.length === 1) return `по ${DOW_RU_PLURAL[list[0]] ?? dowU}`;
  if (list.length > 1) {
    return `по ${list.map((d) => DOW_RU[d]).join(', ')}`;
  }
  return `в дни недели: ${dow}`;
}

function describeMonth(spec: string): string {
  const s = spec.trim().toUpperCase();
  if (s === '*' || s === '?') return '';
  const iv = intervalOf(s);
  if (iv) {
    const n = iv.step;
    return `каждые ${n} ${plural(n, 'месяц', 'месяца', 'месяцев')}`;
  }
  const rm = s.match(/^([A-Z]{3}|\d{1,2})-([A-Z]{3}|\d{1,2})$/);
  if (rm) {
    const a = parseToken(rm[1], MON_ALIAS);
    const b = parseToken(rm[2], MON_ALIAS);
    return `с ${MONTH_RU_FULL[a] ?? rm[1]} по ${MONTH_RU_FULL[b] ?? rm[2]}`;
  }
  try {
    const v = expandSpec(s, 1, 12, MON_ALIAS);
    if (v && v.length && v.length < 12) {
      return `в ${v.map((x) => MONTH_RU_PREP[x] ?? x).join(', ')}`;
    }
  } catch { /* noop */ }
  return `в месяцы: ${spec}`;
}

function describeYear(spec: string): string {
  const s = spec.trim().toUpperCase();
  if (s === '*' || s === '?') return '';
  const iv = intervalOf(s);
  if (iv) {
    const n = iv.step;
    return `каждые ${n} ${plural(n, 'год', 'года', 'лет')}`;
  }
  const rm = s.match(/^(\d{4})-(\d{4})$/);
  if (rm) return `с ${rm[1]} по ${rm[2]} год`;
  if (/^\d{4}(,\d{4})*$/.test(s)) return `в ${s} г.`;
  return `год: ${spec}`;
}

export function describeExpression(fields7: string[]): string {
  const [sec, min, hour, dom, mon, dow, year] = fields7;
  const time = describeTime(sec, min, hour);
  const day = describeDay(dom, dow);
  const monS = describeMonth(mon);
  const yearS = describeYear(year);

  const everyXPat = /^кажд(ые|ую|ый)\s/.test(time.lead);
  let text: string;
  if (everyXPat) {
    const dayPart = day === 'каждый день' ? '' : ` ${day}`;
    text = `${time.lead}${dayPart}`;
  } else if (time.lead.startsWith('время:')) {
    text = `Запуск (${time.lead}), ${day}`;
  } else {
    text = `${capitalize(day)} ${time.lead}`;
  }
  if (monS) text += ` ${monS}`;
  if (yearS) text += ` ${yearS}`;
  let out = capitalize(text.replace(/\s+/g, ' ').trim());
  if (!out.endsWith('.')) out += '.';
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Построчная расшифровка полей (для панели «Разбор»)
// ---------------------------------------------------------------------------

export function describeFieldValue(key: FieldKey, spec: string): string {
  const s = spec.trim().toUpperCase();
  const [min, max] = RANGES[key];
  const alias = key === 'dow' ? DOW_ALIAS : key === 'month' ? MON_ALIAS : null;
  if (s === '*') {
    switch (key) {
      case 'second': return 'каждую секунду';
      case 'minute': return 'каждую минуту';
      case 'hour': return 'каждый час';
      case 'dom': return 'каждый день месяца';
      case 'month': return 'каждый месяц';
      case 'dow': return 'каждый день недели';
      case 'year': return 'каждый год';
    }
  }
  if (s === '?') return 'не задано';
  if (key === 'dom') {
    if (s === 'L') return 'последний день месяца';
    const lo = s.match(/^L-(\d+)$/);
    if (lo) return `за ${lo[1]} дн. до конца месяца`;
    if (s === 'LW') return 'последний будний день (LW)';
    const nw = s.match(/^(\d+)W$/);
    if (nw) return `ближайший будний к ${nw[1]}-му числу`;
  }
  if (key === 'dow') {
    const nth = s.match(/^([A-Z]{3}|\d)#([1-5])$/);
    if (nth) {
      const d = parseToken(nth[1], DOW_ALIAS);
      const n = parseInt(nth[2], 10);
      const g = DOW_GENDER[d] ?? 'm';
      const ord = g === 'f' ? ORD_F[n] : g === 'n' ? ORD_N[n] : ORD_M[n];
      return `${ord} ${DOW_RU_FULL[d] ?? nth[1]} месяца`;
    }
    if (s.endsWith('L') && s !== 'L') {
      const d = parseToken(s.slice(0, -1), DOW_ALIAS);
      return `${(DOW_LAST[d] ?? 'последний').replace(/^последн/, 'последн')} месяца`;
    }
    if (s === 'L') return 'последняя суббота месяца';
  }
  const iv = intervalOf(s);
  if (iv) {
    const names: Record<FieldKey, [string, string, string]> = {
      second: ['секунду', 'секунды', 'секунд'],
      minute: ['минуту', 'минуты', 'минут'],
      hour: ['час', 'часа', 'часов'],
      dom: ['день', 'дня', 'дней'],
      month: ['месяц', 'месяца', 'месяцев'],
      dow: ['день недели', 'дня недели', 'дней недели'],
      year: ['год', 'года', 'лет'],
    };
    const base = iv.start !== '*' && iv.start !== '?' ? `начиная с ${iv.start}` : `с ${min}`;
    return `каждые ${iv.step} ${plural(iv.step, ...names[key] as [string, string, string])}, ${base}`;
  }
  try {
    const v = expandSpec(s, min, max, alias);
    if (v) {
      if (key === 'dow') return v.map((x) => DOW_RU_FULL[x] ?? x).join(', ');
      if (key === 'month') return v.map((x) => MONTH_RU_FULL[x] ?? x).join(', ');
      return v.join(', ');
    }
  } catch { /* noop */ }
  return spec;
}

// ---------------------------------------------------------------------------
// Экспорт в другие форматы
// ---------------------------------------------------------------------------

function quartzDowToClassic(spec: string): string {
  return spec.replace(/\d+/g, (d) => {
    const n = parseInt(d, 10);
    if (n >= 1 && n <= 7) return String(n === 1 ? 0 : n - 1);
    return d;
  });
}

export function exportFormat(fields7: string[], fmt: FieldFormat): { text: string; note?: string } {
  if (fmt === 7) return { text: fields7.join(' ') };
  if (fmt === 6) return { text: fields7.slice(0, 6).join(' '), note: 'Поле «год» отброшено' };
  const note = fields7[0] !== '0' ? 'Внимание: значение секунд отброшено' : 'Поле «секунды» и «год» отброшены, день недели пересчитан (0=Вс)';
  return {
    text: [fields7[1], fields7[2], fields7[3], fields7[4], quartzDowToClassic(fields7[5])].join(' '),
    note,
  };
}

// ---------------------------------------------------------------------------
// Относительное время
// ---------------------------------------------------------------------------

export function relativeTime(from: Date, to: Date): string {
  let diff = Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
  if (diff < 60) return `через ${diff} ${plural(diff, 'секунду', 'секунды', 'секунд')}`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `через ${mins} ${plural(mins, 'минуту', 'минуты', 'минут')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const rmin = mins % 60;
    return `через ${hours} ${plural(hours, 'час', 'часа', 'часов')}${rmin ? ` ${rmin} мин` : ''}`;
  }
  const days = Math.floor(hours / 24);
  const rh = hours % 24;
  diff = days;
  return `через ${days} ${plural(days, 'день', 'дня', 'дней')}${rh ? ` ${rh} ч` : ''}`;
}

export function formatRunDate(d: Date, now: Date): string {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  if (sameDay(d, now)) return `Сегодня, ${time}`;
  if (sameDay(d, tomorrow)) return `Завтра, ${time}`;
  const wd = DOW_RU[d.getDay() + 1];
  return `${wd}, ${d.getDate()} ${MONTH_RU[d.getMonth() + 1].toLowerCase()} ${d.getFullYear()}, ${time}`;
}

// ---------------------------------------------------------------------------
// Пресеты
// ---------------------------------------------------------------------------

export interface Preset {
  label: string;
  expr: string;
  hint?: string;
}

export const PRESETS: Preset[] = [
  { label: 'Каждую минуту', expr: '0 * * * * ?' },
  { label: 'Каждые 5 минут', expr: '0 0/5 * * * ?' },
  { label: 'Каждые 15 минут', expr: '0 0/15 * * * ?' },
  { label: 'Каждый час', expr: '0 0 * * * ?' },
  { label: 'Каждые 6 часов', expr: '0 0 0/6 * * ?' },
  { label: 'Ежедневно в 00:00', expr: '0 0 0 * * ?' },
  { label: 'Ежедневно в 11:00', expr: '0 0 11 ? * *' },
  { label: 'По будням в 9:00', expr: '0 0 9 ? * MON-FRI' },
  { label: 'По понедельникам в 9:30', expr: '0 30 9 ? * MON' },
  { label: 'По выходным в 10:00', expr: '0 0 10 ? * SAT,SUN' },
  { label: '1-го числа месяца', expr: '0 0 0 1 * ?' },
  { label: 'Последний день месяца', expr: '0 59 23 L * ?' },
  { label: 'Последний будень месяца', expr: '0 0 18 LW * ?' },
  { label: 'Каждую 2-ю пятницу', expr: '0 0 12 ? * FRI#2' },
  { label: '1 января, ежегодно', expr: '0 0 0 1 1 ? *' },
];
