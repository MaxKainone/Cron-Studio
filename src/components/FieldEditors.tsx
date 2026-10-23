import { BaseField, FieldKey, RANGES, buildField, DOW_RU, MONTH_RU } from '@/lib/cron';
import { Card, ModeSelect, Stepper, Chip, QuickRow } from './controls';
import {
  Zap, Timer, Clock3, CalendarDays, Calendar, CalendarRange, CalendarClock,
} from 'lucide-react';

const DOW_ORDER = [2, 3, 4, 5, 6, 7, 1];

const FIELD_META: Record<FieldKey, { title: string; icon: React.ReactNode; hint: string }> = {
  second: { title: 'Секунды', icon: <Zap size={14} />, hint: 'Допустимые значения: 0–59.' },
  minute: { title: 'Минуты', icon: <Timer size={14} />, hint: 'Допустимые значения: 0–59.' },
  hour: { title: 'Часы', icon: <Clock3 size={14} />, hint: 'Допустимые значения: 0–23.' },
  dom: { title: 'День месяца', icon: <CalendarDays size={14} />, hint: '1–31, либо «?», если день задаётся через день недели.' },
  month: { title: 'Месяц', icon: <Calendar size={14} />, hint: '1–12 (январь–декабрь).' },
  dow: { title: 'День недели', icon: <CalendarRange size={14} />, hint: 'Пн–Вс, либо «?». Поддерживаются # и L.' },
  year: { title: 'Год', icon: <CalendarClock size={14} />, hint: '1970–2099. Необязательное поле.' },
};

type Patch = Partial<BaseField>;

// ---------------------------------------------------------------------------
// Общие тела режимов
// ---------------------------------------------------------------------------

function IntervalBody(props: { f: BaseField; k: FieldKey; up: (p: Patch) => void }) {
  const [min, max] = RANGES[props.k];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Stepper label="Начиная с" value={props.f.start} min={min} max={max} onChange={(v) => props.up({ start: v })} />
      <Stepper label="Каждые (шаг)" value={props.f.step} min={1} max={Math.max(1, max - min)} onChange={(v) => props.up({ step: v })} />
    </div>
  );
}

function RangeBody(props: { f: BaseField; k: FieldKey; up: (p: Patch) => void; withStep?: boolean }) {
  const [min, max] = RANGES[props.k];
  const isDow = props.k === 'dow';
  const isMon = props.k === 'month';
  const fmt = (v: number) => (isDow ? DOW_RU[v] ?? String(v) : isMon ? MONTH_RU[v] ?? String(v) : String(v).padStart(2, '0'));
  return (
    <div className={props.withStep ? 'grid grid-cols-3 gap-2.5' : 'grid grid-cols-2 gap-2.5'}>
      <Stepper label={`С (${fmt(props.f.rangeStart)})`} value={props.f.rangeStart} min={min} max={max} onChange={(v) => props.up({ rangeStart: v })} />
      <Stepper label={`По (${fmt(props.f.rangeEnd)})`} value={props.f.rangeEnd} min={min} max={max} onChange={(v) => props.up({ rangeEnd: v })} />
      {props.withStep && (
        <Stepper label="Шаг" value={props.f.step} min={1} max={Math.max(1, max - min)} onChange={(v) => props.up({ step: v })} />
      )}
    </div>
  );
}

function SpecificGrid(props: { vals: number[]; labels: Record<number, string> | null; values: number[]; up: (p: Patch) => void; wide?: boolean; small?: boolean }) {
  const toggle = (v: number) => {
    const has = props.vals.includes(v);
    props.up({ values: has ? props.vals.filter((x) => x !== v) : [...props.vals, v] });
  };
  return (
    <div className={props.wide ? 'grid grid-cols-3 gap-1' : props.small ? 'grid grid-cols-8 gap-[3px]' : 'grid grid-cols-7 gap-1'}>
      {props.values.map((v) => (
        <Chip
          key={v}
          label={props.labels ? props.labels[v] ?? String(v) : String(v).padStart(2, '0')}
          active={props.vals.includes(v)}
          onToggle={() => toggle(v)}
          small={props.small}
        />
      ))}
    </div>
  );
}

function CustomBody(props: { f: BaseField; up: (p: Patch) => void; placeholder: string }) {
  return (
    <input
      value={props.f.custom}
      onChange={(e) => props.up({ custom: e.target.value })}
      placeholder={props.placeholder}
      spellCheck={false}
      className="w-full rounded-md border border-[#4cc2ff]/30 bg-[#1b2831]/60 px-3 py-[7px] font-mono text-[12.5px] text-[#9ae0ff] outline-none placeholder:text-white/25 focus:border-[#4cc2ff]"
    />
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11.5px] leading-relaxed text-white/55">{children}</p>;
}

// ---------------------------------------------------------------------------
// Редактор поля
// ---------------------------------------------------------------------------

export function FieldEditorCard(props: {
  fieldKey: FieldKey;
  field: BaseField;
  onChange: (patch: Patch) => void;
}) {
  const { fieldKey: k, field: f } = props;
  const up = props.onChange;
  const meta = FIELD_META[k];
  const built = buildField(k, f);
  const [min, max] = RANGES[k];

  const numericModes = [
    { value: 'every', label: k === 'year' ? 'Каждый год ( * )' : 'Все значения ( * )' },
    { value: 'interval', label: 'Интервал ( x/n )' },
    { value: 'specific', label: 'Конкретные значения ( 1,5,10 )' },
    { value: 'range', label: 'Диапазон ( a-b )' },
    { value: 'rangeInterval', label: 'Диапазон с шагом ( a-b/n )' },
    { value: 'custom', label: 'Свой вариант (текст)' },
  ];
  const domModes = [
    { value: 'none', label: 'Не задано ( ? )' },
    { value: 'every', label: 'Каждый день ( * )' },
    { value: 'specific', label: 'По числам ( 1,15,31 )' },
    { value: 'interval', label: 'Интервал ( 1/n )' },
    { value: 'range', label: 'Диапазон ( a-b )' },
    { value: 'rangeInterval', label: 'Диапазон с шагом ( a-b/n )' },
    { value: 'last', label: 'Последний день месяца ( L )' },
    { value: 'lastOffset', label: 'За N дней до конца ( L-N )' },
    { value: 'lastWeekday', label: 'Последний будний день ( LW )' },
    { value: 'nearestWeekday', label: 'Ближайший будний к числу ( NW )' },
    { value: 'custom', label: 'Свой вариант (текст)' },
  ];
  const dowModes = [
    { value: 'none', label: 'Не задано ( ? )' },
    { value: 'every', label: 'Каждый день ( * )' },
    { value: 'specific', label: 'По дням недели ( Пн,Ср,Пт )' },
    { value: 'range', label: 'Диапазон ( Пн-Пт )' },
    { value: 'nth', label: 'N-й день недели месяца ( # )' },
    { value: 'lastDow', label: 'Последний такой день месяца ( xL )' },
    { value: 'custom', label: 'Свой вариант (текст)' },
  ];

  const modes = k === 'dom' ? domModes : k === 'dow' ? dowModes : numericModes;

  const renderBody = () => {
    switch (f.mode) {
      case 'every':
        return <Note>Поле равно <b className="font-mono text-[#9ae0ff]">*</b> — подходят все допустимые значения.</Note>;
      case 'none':
        return <Note>Поле равно <b className="font-mono text-[#9ae0ff]">?</b> — значение не задано. Используйте, когда день определяется вторым полем (день месяца / день недели).</Note>;
      case 'interval':
        return <IntervalBody f={f} k={k} up={up} />;
      case 'range':
        return <RangeBody f={f} k={k} up={up} />;
      case 'rangeInterval':
        return <RangeBody f={f} k={k} up={up} withStep />;
      case 'specific': {
        if (k === 'month') {
          return (
            <>
              <SpecificGrid vals={f.values} values={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]} labels={MONTH_RU} up={up} wide />
              <QuickRow min={1} max={12} onSet={(v) => up({ values: v })} />
            </>
          );
        }
        if (k === 'dow') {
          return <SpecificGrid vals={f.values} values={DOW_ORDER} labels={DOW_RU} up={up} />;
        }
        if (k === 'year') {
          const now = new Date().getFullYear();
          const base = new Set<number>(f.values);
          for (let i = 0; i < 6; i++) base.add(now + i);
          const years = Array.from(base).sort((a, b) => a - b).filter((y) => y >= 1970 && y <= 2099);
          return (
            <>
              <SpecificGrid vals={f.values} values={years} labels={null} up={up} wide />
              <div className="mt-2 flex items-center gap-2">
                <div className="w-[130px]">
                  <Stepper label="Добавить год" value={now} min={1970} max={2099} onChange={(v) => up({ values: [...f.values, v] })} />
                </div>
              </div>
            </>
          );
        }
        const vals: number[] = [];
        for (let i = min; i <= max; i++) vals.push(i);
        return (
          <>
            <SpecificGrid vals={f.values} values={vals} labels={null} up={up} small={k !== 'hour'} />
            <QuickRow min={min} max={max} onSet={(v) => up({ values: v })} />
          </>
        );
      }
      case 'last':
        return <Note><b className="font-mono text-[#9ae0ff]">L</b> — запуск в самый последний день текущего месяца (28–31, учитывается автоматически).</Note>;
      case 'lastOffset':
        return (
          <div className="flex items-end gap-3">
            <div className="w-[150px]">
              <Stepper label="За сколько дней до конца" value={f.offset} min={0} max={30} onChange={(v) => up({ offset: v })} />
            </div>
            <p className="pb-2 font-mono text-[12px] text-white/40">L-{f.offset}</p>
          </div>
        );
      case 'lastWeekday':
        return <Note><b className="font-mono text-[#9ae0ff]">LW</b> — последний будний день (пн–пт) месяца. Удобно для отчётов в конце месяца.</Note>;
      case 'nearestWeekday':
        return (
          <div className="flex items-end gap-3">
            <div className="w-[150px]">
              <Stepper label="Число месяца" value={f.weekday} min={1} max={31} onChange={(v) => up({ weekday: v })} />
            </div>
            <p className="pb-2 font-mono text-[12px] text-white/40">{f.weekday}W</p>
          </div>
        );
      case 'nth':
        return (
          <div className="flex flex-col gap-2.5">
            <div>
              <span className="mb-1 block text-[11px] text-white/50">Какая по счёту неделя</span>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip key={n} label={['1-я', '2-я', '3-я', '4-я', '5-я'][n - 1]} active={f.nth === n} onToggle={() => up({ nth: n })} />
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-white/50">День недели</span>
              <div className="grid grid-cols-7 gap-1">
                {DOW_ORDER.map((d) => (
                  <Chip key={d} label={DOW_RU[d]} active={f.weekday === d} onToggle={() => up({ weekday: d })} />
                ))}
              </div>
            </div>
            <Note>Пример: «3-я + Пт» = каждая третья пятница месяца (<b className="font-mono text-[#9ae0ff]">FRI#3</b>).</Note>
          </div>
        );
      case 'lastDow':
        return (
          <div className="flex flex-col gap-2.5">
            <div>
              <span className="mb-1 block text-[11px] text-white/50">День недели</span>
              <div className="grid grid-cols-7 gap-1">
                {DOW_ORDER.map((d) => (
                  <Chip key={d} label={DOW_RU[d]} active={f.weekday === d} onToggle={() => up({ weekday: d })} />
                ))}
              </div>
            </div>
            <Note><b className="font-mono text-[#9ae0ff]">{buildField(k, f)}</b> — последний такой день недели в месяце.</Note>
          </div>
        );
      default:
        return <CustomBody f={f} up={up} placeholder={k === 'dow' ? 'например: MON-FRI или 6#3' : k === 'dom' ? 'например: 1,15 или L-2' : 'например: */10 или 5-15'} />;
    }
  };

  return (
    <Card title={meta.title} icon={meta.icon} value={built}>
      <ModeSelect value={modes.some((m) => m.value === f.mode) ? f.mode : 'custom'} onChange={(v) => up({ mode: v })} options={modes} />
      <div className="mt-3">{renderBody()}</div>
    </Card>
  );
}
