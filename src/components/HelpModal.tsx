import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CornerDownLeft } from 'lucide-react';

const FIELDS = [
  { name: 'Секунды', range: '0–59', special: ', - * /' },
  { name: 'Минуты', range: '0–59', special: ', - * /' },
  { name: 'Часы', range: '0–23', special: ', - * /' },
  { name: 'День месяца', range: '1–31', special: ', - * ? / L W C' },
  { name: 'Месяц', range: '1–12', special: ', - * /' },
  { name: 'День недели', range: 'Пн–Вс', special: ', - * ? / L # C' },
  { name: 'Год', range: '1970–2099', special: ', - * /' },
];

const TOKENS: Array<{ t: string; desc: string; ex: string }> = [
  { t: '*', desc: 'Любое значение поля', ex: '* в минутах = каждую минуту' },
  { t: '?', desc: '«Не задано» — только для дня месяца / дня недели', ex: '0 0 12 ? * MON — день месяца не важен' },
  { t: ',', desc: 'Список значений', ex: 'MON,WED,FRI' },
  { t: '-', desc: 'Диапазон значений', ex: '9-18, MON-FRI' },
  { t: '/', desc: 'Шаг (инкремент)', ex: '0/15 — каждые 15, начиная с 0' },
  { t: 'L', desc: '«Последний»: последний день месяца или последний такой день недели', ex: 'L (день мес.), 6L (посл. пятница)' },
  { t: 'L-n', desc: 'За n дней до конца месяца', ex: 'L-3 — за 3 дня до конца' },
  { t: 'W', desc: 'Ближайший будний день к указанной дате', ex: '15W — будний рядом с 15-м' },
  { t: 'LW', desc: 'Последний будний день месяца', ex: '0 0 18 LW * ?' },
  { t: '#', desc: 'N-й день недели в месяце', ex: 'FRI#2 — вторая пятница' },
];

const EXAMPLES: Array<{ label: string; expr: string }> = [
  { label: 'Пример из задачи: ежедневно в 11:00:00', expr: '0 00 11 ? * * *' },
  { label: 'Каждые 10 минут по будням', expr: '0 0/10 9-18 ? * MON-FRI' },
  { label: 'Вторая среда месяца, 14:30', expr: '0 30 14 ? * WED#2' },
  { label: 'Последний день месяца, 23:59:59', expr: '59 59 23 L * ?' },
];

export function HelpModal(props: { open: boolean; onClose: () => void; onApply: (expr: string) => void }) {
  useEffect(() => {
    if (!props.open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [props.open, props]);

  return (
    <AnimatePresence>
      {props.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
          onClick={props.onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[86%] w-[min(680px,92%)] flex-col overflow-hidden rounded-lg border border-white/[0.14] bg-[#282828]/95 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Справка по синтаксису cron (Quartz)</h2>
              <button
                type="button"
                onClick={props.onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 win-scroll">
              {/* Порядок полей */}
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Порядок полей</h3>
              <div className="flex flex-wrap items-center gap-1">
                {FIELDS.map((f, i) => (
                  <div key={f.name} className="flex items-center gap-1">
                    <div className="rounded-md border border-[#4cc2ff]/25 bg-[#4cc2ff]/[0.09] px-2 py-1 text-center">
                      <div className="text-[11px] font-medium text-[#9ae0ff]">{f.name}</div>
                      <div className="text-[9.5px] text-white/40">{f.range}</div>
                    </div>
                    {i < FIELDS.length - 1 && <span className="text-white/25">·</span>}
                  </div>
                ))}
              </div>
              <div className="mt-2 overflow-hidden rounded-md border border-white/[0.1]">
                <table className="w-full text-[11.5px]">
                  <thead>
                    <tr className="bg-white/[0.05] text-left text-white/50">
                      <th className="px-3 py-1.5 font-medium">Поле</th>
                      <th className="px-3 py-1.5 font-medium">Значения</th>
                      <th className="px-3 py-1.5 font-medium">Спецсимволы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELDS.map((f) => (
                      <tr key={f.name} className="border-t border-white/[0.06] text-white/75">
                        <td className="px-3 py-1.5">{f.name}</td>
                        <td className="px-3 py-1.5 font-mono">{f.range}</td>
                        <td className="px-3 py-1.5 font-mono text-[#9ae0ff]/90">{f.special}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Символы */}
              <h3 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">Специальные символы</h3>
              <div className="overflow-hidden rounded-md border border-white/[0.1]">
                <table className="w-full text-[11.5px]">
                  <tbody>
                    {TOKENS.map((row) => (
                      <tr key={row.t} className="border-t border-white/[0.06] first:border-t-0">
                        <td className="w-[64px] px-3 py-1.5 font-mono font-semibold text-[#ffd58a]">{row.t}</td>
                        <td className="px-3 py-1.5 text-white/75">{row.desc}</td>
                        <td className="hidden px-3 py-1.5 font-mono text-white/40 sm:table-cell">{row.ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Примеры */}
              <h3 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">Готовые примеры — нажмите, чтобы применить</h3>
              <div className="mb-2 space-y-1.5">
                {EXAMPLES.map((e) => (
                  <button
                    key={e.expr}
                    type="button"
                    onClick={() => { props.onApply(e.expr); props.onClose(); }}
                    className="group flex w-full items-center justify-between gap-3 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-[#4cc2ff]/40 hover:bg-[#4cc2ff]/[0.08]"
                  >
                    <span className="text-[12px] text-white/75 group-hover:text-white">{e.label}</span>
                    <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-[#9ae0ff]">
                      {e.expr}
                      <CornerDownLeft size={12} className="opacity-0 transition-opacity group-hover:opacity-70" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
