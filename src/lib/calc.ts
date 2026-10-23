// ---------------------------------------------------------------------------
// Безопасный вычислитель выражений для калькулятора (без eval)
// ---------------------------------------------------------------------------

type Tok =
  | { t: 'num'; v: number }
  | { t: 'op'; v: string }
  | { t: 'u-' }
  | { t: 'func'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'post'; v: '%' | '!' };

const FUNCS = new Set(['sqrt', 'sin', 'cos', 'tan', 'ln', 'log', 'abs']);

function tokenize(str: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (c === ' ') { i++; continue; }
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      let dots = 0;
      while (j < str.length && ((str[j] >= '0' && str[j] <= '9') || str[j] === '.')) {
        if (str[j] === '.') dots++;
        j++;
      }
      if (dots > 1) throw new Error('Ошибка в числе');
      out.push({ t: 'num', v: parseFloat(str.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '(') { out.push({ t: 'lp' }); i++; continue; }
    if (c === ')') { out.push({ t: 'rp' }); i++; continue; }
    if (c === '%') { out.push({ t: 'post', v: '%' }); i++; continue; }
    if (c === '!') { out.push({ t: 'post', v: '!' }); i++; continue; }
    if (c === 'π') { out.push({ t: 'num', v: Math.PI }); i++; continue; }
    if ((c >= 'a' && c <= 'z')) {
      let j = i;
      while (j < str.length && str[j] >= 'a' && str[j] <= 'z') j++;
      const w = str.slice(i, j);
      if (w === 'pi') out.push({ t: 'num', v: Math.PI });
      else if (w === 'e') out.push({ t: 'num', v: Math.E });
      else if (FUNCS.has(w)) out.push({ t: 'func', v: w });
      else throw new Error(`Неизвестная функция «${w}»`);
      i = j;
      continue;
    }
    throw new Error(`Недопустимый символ «${c}»`);
  }
  return out;
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, 'u-': 4 };
const LEFT_ASSOC: Record<string, boolean> = { '+': true, '-': true, '*': true, '/': true, '^': false, 'u-': false };

function toRpn(tokens: Tok[]): Tok[] {
  const out: Tok[] = [];
  const stack: Tok[] = [];
  let prev: Tok | null = null;
  for (const tok of tokens) {
    if (tok.t === 'num') { out.push(tok); }
    else if (tok.t === 'func') { stack.push(tok); }
    else if (tok.t === 'post') { out.push(tok); }
    else if (tok.t === 'op') {
      const unary = tok.v === '-' && (prev === null || prev.t === 'op' || prev.t === 'lp' || prev.t === 'func');
      const cur: Tok = unary ? { t: 'u-' } : tok;
      const cp = PREC[unary ? 'u-' : tok.v];
      while (stack.length) {
        const top = stack[stack.length - 1];
        const tp = top.t === 'u-' ? PREC['u-'] : top.t === 'op' ? PREC[top.v] : -1;
        if (tp < 0) break;
        if (tp > cp || (tp === cp && LEFT_ASSOC[unary ? 'u-' : tok.v])) {
          out.push(stack.pop() as Tok);
        } else break;
      }
      stack.push(cur);
    } else if (tok.t === 'lp') { stack.push(tok); }
    else if (tok.t === 'rp') {
      let found = false;
      while (stack.length) {
        const top = stack.pop() as Tok;
        if (top.t === 'lp') { found = true; break; }
        out.push(top);
      }
      if (!found) throw new Error('Лишняя закрывающая скобка');
      const top = stack[stack.length - 1];
      if (top && top.t === 'func') out.push(stack.pop() as Tok);
    }
    prev = tok;
  }
  while (stack.length) {
    const top = stack.pop() as Tok;
    if (top.t === 'lp') throw new Error('Не хватает закрывающей скобки');
    if (top.t === 'rp') throw new Error('Ошибка в выражении');
    out.push(top);
  }
  return out;
}

function factorial(n: number): number {
  if (n < 0 || Math.floor(n) !== n) throw new Error('Факториал определён для целых ≥ 0');
  if (n > 170) throw new Error('Слишком большое число');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function evaluateExpression(expr: string, deg = true): number {
  const rpn = toRpn(tokenize(expr));
  const st: number[] = [];
  const pop = () => {
    const v = st.pop();
    if (v === undefined) throw new Error('Ошибка в выражении');
    return v;
  };
  for (const tok of rpn) {
    if (tok.t === 'num') st.push(tok.v);
    else if (tok.t === 'u-') st.push(-pop());
    else if (tok.t === 'post') {
      const a = pop();
      st.push(tok.v === '%' ? a / 100 : factorial(a));
    } else if (tok.t === 'func') {
      const a = pop();
      const rad = deg ? (a * Math.PI) / 180 : a;
      switch (tok.v) {
        case 'sqrt': if (a < 0) throw new Error('√ из отрицательного'); st.push(Math.sqrt(a)); break;
        case 'sin': st.push(Math.sin(rad)); break;
        case 'cos': st.push(Math.cos(rad)); break;
        case 'tan': st.push(Math.tan(rad)); break;
        case 'ln': if (a <= 0) throw new Error('ln из неположительного'); st.push(Math.log(a)); break;
        case 'log': if (a <= 0) throw new Error('log из неположительного'); st.push(Math.log10(a)); break;
        case 'abs': st.push(Math.abs(a)); break;
        default: throw new Error('Неизвестная функция');
      }
    } else if (tok.t === 'op') {
      const b = pop();
      const a = pop();
      switch (tok.v) {
        case '+': st.push(a + b); break;
        case '-': st.push(a - b); break;
        case '*': st.push(a * b); break;
        case '/': if (b === 0) throw new Error('Деление на ноль'); st.push(a / b); break;
        case '^': st.push(Math.pow(a, b)); break;
        default: throw new Error('Ошибка в выражении');
      }
    }
  }
  if (st.length !== 1) throw new Error('Ошибка в выражении');
  const r = st[0];
  if (Number.isNaN(r)) throw new Error('Не число');
  if (!Number.isFinite(r)) throw new Error('Переполнение');
  return r;
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return 'Ошибка';
  const a = Math.abs(n);
  if (a !== 0 && (a >= 1e13 || a < 1e-9)) {
    return n.toExponential(6).replace('e+', 'e');
  }
  const s = String(parseFloat(n.toPrecision(12)));
  // ограничение длины
  if (s.length > 16) return String(parseFloat(n.toPrecision(10)));
  return s;
}

/** Красивое отображение выражения */
export function prettify(expr: string): string {
  return expr
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\+/g, ' + ')
    .replace(/(?<![\d)])-(?![\d(])/g, ' − ')
    .replace(/sqrt\(/g, '√(')
    .replace(/pi/g, 'π')
    .replace(/\^/g, '^');
}
