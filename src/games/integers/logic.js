// "שלמים" quiz: four rules about signs/parity of the result of an arithmetic
// chain, quizzed as fill-in-the-blank sentences answered via a word/number
// keypad (see KEYPAD_TOKENS) instead of typed digits.
export const LAWS = {
  SIGN: 1, // (+)/(-) chains under × and ÷
  PARITY: 2, // זוגי/אי-זוגי under +, -, ×
  FRACTION: 3, // זוגי/אי-זוגי under ÷ (result may be a fraction)
  PRODUCTS: 4, // special-products divisibility facts
  COMBINED: 'combined', // a mix of all four, only ever a settings.law value — never a per-question .law
}

const SIGN_LABEL = { plus: '+', minus: '-' }
const PARITY_LABEL = { even: 'זוגי', odd: 'אי-זוגי' }

// Every keypad button, in the order it should render (grid is LTR — see
// .integers-keypad — so this reading order lands left-to-right, top-to-bottom).
// plus/minus render as the actual sign (bigger font, see .keypad-sign-btn)
// instead of spelling out "פלוס"/"מינוס" — faster to scan mid-quiz.
export const KEYPAD_TOKENS = [
  { key: 'plus', label: '+', big: true },
  { key: 'minus', label: '-', big: true },
  { key: 'even', label: 'זוגי' },
  { key: 'odd', label: 'אי-זוגי' },
  { key: '2', label: '2' },
  { key: '4', label: '4' },
  { key: '6', label: '6' },
  { key: '8', label: '8' },
  { key: '24', label: '24' },
]

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function makeQuestion(law, before, after, answer, answerDisplay) {
  return { law, before, after, answer, answerDisplay }
}

// LAW 1 — a chain of 2-4 (+)/(-) operands joined by × or ÷. Sign-wise, ÷ by
// a negative flips the result exactly like ×, so only the total count of
// minus signs among *all* tokens (operands + result) matters: it's always
// even (parity math: result = XOR of the operand signs, i.e. XOR of every
// token in `slots` is always 0) — so whichever single token is blanked is
// always uniquely recoverable from the rest, regardless of position.
function genSignQuestion() {
  const n = randInt(2, 4)
  const signs = Array.from({ length: n }, () => (Math.random() < 0.5 ? 'plus' : 'minus'))
  const ops = Array.from({ length: n - 1 }, () => (Math.random() < 0.5 ? '×' : '÷'))
  const minusCount = signs.filter((s) => s === 'minus').length
  const result = minusCount % 2 === 0 ? 'plus' : 'minus'
  const slots = [...signs, result]
  const blankIdx = randInt(0, n) // 0..n-1 = an operand, n = the result

  let expr = ''
  for (let i = 0; i < n; i++) {
    expr += i === blankIdx ? '(___)' : `(${SIGN_LABEL[slots[i]]})`
    if (i < n - 1) expr += ` ${ops[i]} `
  }
  const resultText = blankIdx === n ? '(___)' : `(${SIGN_LABEL[slots[n]]})`
  const [before, after] = `${expr} = ${resultText}`.split('___')
  const answer = slots[blankIdx]
  return makeQuestion(LAWS.SIGN, before, after, answer, SIGN_LABEL[answer])
}

// LAW 2a — addition/subtraction parity chain. Same XOR structure as LAW 1
// (a-b has the same parity as a+b), just with זוגי/אי-זוגי instead of +/-,
// and the connecting + / - operators are never the blank (the rule is the
// same either way, so that blank wouldn't have a unique answer).
function genParityAddSub() {
  const n = randInt(2, 4)
  const parities = Array.from({ length: n }, () => (Math.random() < 0.5 ? 'odd' : 'even'))
  const ops = Array.from({ length: n - 1 }, () => (Math.random() < 0.5 ? '+' : '-'))
  const oddCount = parities.filter((p) => p === 'odd').length
  const result = oddCount % 2 === 0 ? 'even' : 'odd'
  const slots = [...parities, result]
  const blankIdx = randInt(0, n)

  let expr = ''
  for (let i = 0; i < n; i++) {
    expr += i === blankIdx ? '___' : PARITY_LABEL[slots[i]]
    if (i < n - 1) expr += ` ${ops[i]} `
  }
  const resultText = blankIdx === n ? '___' : PARITY_LABEL[slots[n]]
  const [before, after] = `${expr} = ${resultText}`.split('___')
  const answer = slots[blankIdx]
  return makeQuestion(LAWS.PARITY, before, after, answer, PARITY_LABEL[answer])
}

// LAW 2b — multiplication parity (one even factor makes the whole product
// even). Unlike addition, this is an AND, not an XOR: blanking an operand
// instead of the result is only solvable when every *other* factor is odd —
// and in that case the result would just equal the blank's own value,
// literally handing the answer over. So the result is always the blank here.
function genParityMultiply() {
  const n = Math.random() < 0.7 ? 2 : 3
  const parities = Array.from({ length: n }, () => (Math.random() < 0.5 ? 'odd' : 'even'))
  const allOdd = parities.every((p) => p === 'odd')
  const result = allOdd ? 'odd' : 'even'

  const expr = parities.map((p) => PARITY_LABEL[p]).join(' × ')
  const [before, after] = `${expr} = ___`.split('___')
  return makeQuestion(LAWS.PARITY, before, after, result, PARITY_LABEL[result])
}

function genParityQuestion() {
  return Math.random() < 0.5 ? genParityAddSub() : genParityMultiply()
}

// LAW 3 — division parity. Only "אי-זוגי ÷ זוגי" is a deterministic result
// (always a fraction); the other three rows can go either way, so the
// *result* is never a fair blank — only the numerator/denominator are. The
// result text (e.g. "אי-זוגי או שבר") is always shown in full, so "שבר"
// itself is never something the learner has to type — it has no keypad
// button. All four rows produce distinct result text, so whichever operand
// is blanked is always uniquely recoverable from the other operand + result.
const FRACTION_ROWS = [
  { num: 'odd', den: 'odd', resultText: 'אי-זוגי או שבר' },
  { num: 'even', den: 'odd', resultText: 'זוגי או שבר' },
  { num: 'odd', den: 'even', resultText: 'שבר' },
  { num: 'even', den: 'even', resultText: 'אי-זוגי, זוגי או שבר' },
]

// Rendered as a real numerator/denominator fraction bar (see FractionText in
// GamePlay.jsx), not a "÷" sign — so these carry fracNumerator/fracDenominator/
// resultText instead of before/after; `null` marks whichever side is blank.
function buildFractionQuestions() {
  const questions = []
  for (const row of FRACTION_ROWS) {
    questions.push({
      law: LAWS.FRACTION,
      fracNumerator: null,
      fracDenominator: PARITY_LABEL[row.den],
      resultText: row.resultText,
      answer: row.num,
      answerDisplay: PARITY_LABEL[row.num],
    })
    questions.push({
      law: LAWS.FRACTION,
      fracNumerator: PARITY_LABEL[row.num],
      fracDenominator: null,
      resultText: row.resultText,
      answer: row.den,
      answerDisplay: PARITY_LABEL[row.den],
    })
  }
  return questions
}

// LAW 4 — special-products divisibility facts. The divisor is always a fair
// blank (2/4/6/8/24 are all keypad buttons); the count is only a fair blank
// when it's 2 or 4 (there's no "3" button) — the "kind" text (עוקבים /
// זוגיים / זוגיים עוקבים) has no keypad button at all, so it's never blanked.
const PRODUCT_FACTS = [
  { count: 2, kind: 'עוקבים', divisor: 2 },
  { count: 3, kind: 'עוקבים', divisor: 6 },
  { count: 4, kind: 'עוקבים', divisor: 24 },
  { count: 2, kind: 'זוגיים', divisor: 4 },
  { count: 3, kind: 'זוגיים', divisor: 8 },
  { count: 2, kind: 'זוגיים עוקבים', divisor: 8 },
]

function buildProductQuestions() {
  const questions = []
  for (const fact of PRODUCT_FACTS) {
    questions.push(
      makeQuestion(
        LAWS.PRODUCTS,
        `מכפלה של ${fact.count} מספרים ${fact.kind} תמיד מתחלקת ב-`,
        '',
        String(fact.divisor),
        String(fact.divisor)
      )
    )
    if (fact.count === 2 || fact.count === 4) {
      questions.push(
        makeQuestion(
          LAWS.PRODUCTS,
          'מכפלה של ',
          ` מספרים ${fact.kind} תמיד מתחלקת ב-${fact.divisor}`,
          String(fact.count),
          String(fact.count)
        )
      )
    }
  }
  return questions
}

// Question text length varies wildly here (a 2-operand sign chain vs. a full
// law-4 sentence), unlike every other quant quiz's fixed-shape "a × b" — so
// the base 46px .question-text would either overflow or wrap to near-nothing
// per line. This maps rendered length to a font-size tier instead of using
// one fixed size; called from GamePlay.jsx as an inline style.
export function questionFontSize(question) {
  let totalLen
  if (question.law === LAWS.FRACTION) {
    const numLen = (question.fracNumerator ?? question.answerDisplay).length
    const denLen = (question.fracDenominator ?? question.answerDisplay).length
    // The fraction stacks vertically, so its own width is only the wider of
    // the two sides, not their sum - only resultText runs alongside it.
    totalLen = Math.max(numLen, denLen) + question.resultText.length + 4
  } else {
    const blankLen = Math.max(3, question.answerDisplay.length)
    totalLen = question.before.length + blankLen + question.after.length
  }
  if (totalLen <= 14) return 30
  if (totalLen <= 22) return 25
  if (totalLen <= 30) return 21
  if (totalLen <= 40) return 18
  if (totalLen <= 50) return 16
  return 14
}

// LAW 1/2 have a huge combinatorial space (random chain length + random
// signs), so a round samples a fixed count instead of enumerating it —
// deduped by rendered text so the same sentence doesn't show up twice.
const SINGLE_LAW_RANDOM_COUNT = 14
// LAW 1/2's sample size within a COMBINED round — smaller, since laws 3/4
// (always fully exhaustive: 8 + 10 = 18 questions) already make up most of it.
const COMBINED_LAW_RANDOM_COUNT = 6

function generateUnique(genFn, count) {
  const seen = new Set()
  const list = []
  let attempts = 0
  while (list.length < count && attempts < count * 30) {
    attempts++
    const q = genFn()
    const key = `${q.before}|${q.after}|${q.answer}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push(q)
  }
  return list
}

// LAW 3/4 are small closed fact sets (8 and 10 questions respectively), so —
// like every other quant quiz's "every question in the range once" —
// a round is the full set, shuffled, not a sample.
export function getRoundQuestions(settings) {
  let pool
  if (settings.law === 'weak') {
    pool = settings.weakQuestions
  } else if (settings.law === LAWS.SIGN) {
    pool = generateUnique(genSignQuestion, SINGLE_LAW_RANDOM_COUNT)
  } else if (settings.law === LAWS.PARITY) {
    pool = generateUnique(genParityQuestion, SINGLE_LAW_RANDOM_COUNT)
  } else if (settings.law === LAWS.FRACTION) {
    pool = buildFractionQuestions()
  } else if (settings.law === LAWS.PRODUCTS) {
    pool = buildProductQuestions()
  } else {
    pool = [
      ...generateUnique(genSignQuestion, COMBINED_LAW_RANDOM_COUNT),
      ...generateUnique(genParityQuestion, COMBINED_LAW_RANDOM_COUNT),
      ...buildFractionQuestions(),
      ...buildProductQuestions(),
    ]
  }

  return shuffle(pool).map((q, id) => ({ ...q, id }))
}

const LAW_LABELS = {
  [LAWS.SIGN]: 'סימנים בכפל ובחילוק',
  [LAWS.PARITY]: 'זוגי ואי-זוגי',
  [LAWS.FRACTION]: 'חילוק ושברים',
  [LAWS.PRODUCTS]: 'מכפלות מיוחדות',
  [LAWS.COMBINED]: 'מעורבב - כל הסוגים',
}

export function describeSettings(settings) {
  if (settings.law === 'weak') return `תרגול חולשות (${settings.weakQuestions.length} שאלות)`
  return LAW_LABELS[settings.law]
}
