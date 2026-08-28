import { checkAnswer as checkMeaningAnswer } from '../vocabulary/logic'

// `group` buckets each root into one of ROOT_GROUPS below, purely for the
// progress-map table's sectioning - `tag` is the finer-grained hint shown
// during gameplay and stays independent of it. Every root gets its own
// entry now (no "X- / Y-" combined variants) so each spelling is drilled and
// scored on its own - `example` is the single word shown after an answer is
// submitted, and doubles as the accepted answer for the "word" question kind.
export const ROOTS = [
  { id: 'mal', root: 'Mal-', tag: 'שלילי', group: 'negative', meaning: 'רע, לקוי, זדוני', example: 'Malevolent' },
  { id: 'bene', root: 'Bene-', tag: 'חיובי', group: 'positive', meaning: 'טוב, מועיל, נדיב', example: 'Benevolent' },
  { id: 'bon', root: 'Bon-', tag: 'חיובי', group: 'positive', meaning: 'טוב, מועיל, נדיב', example: 'Bonus' },
  { id: 'magna', root: 'Magna-', tag: 'חיובי / גודל', group: 'positive', meaning: 'גדול, אציל', example: 'Magnanimous' },
  { id: 'major', root: 'Major-', tag: 'חיובי / גודל', group: 'positive', meaning: 'גדול, אציל', example: 'Majority' },
  { id: 'in', root: 'In-', tag: 'שלילי', group: 'negative', meaning: 'לא, ביטול', example: 'Inaccurate' },
  { id: 'un', root: 'Un-', tag: 'שלילי', group: 'negative', meaning: 'לא, ביטול', example: 'Unaware' },
  { id: 'dis', root: 'Dis-', tag: 'שלילי', group: 'negative', meaning: 'לא, ביטול', example: 'Disparate' },
  { id: 'im', root: 'Im-', tag: 'שלילי', group: 'negative', meaning: 'לא, ביטול', example: 'Impartial' },
  { id: 'ir', root: 'Ir-', tag: 'שלילי', group: 'negative', meaning: 'לא, ביטול', example: 'Irreversible' },
  { id: 'ex', root: 'Ex-', tag: 'ניטרלי / יציאה', group: 'relational', meaning: 'החוצה, להסיר, לשעבר', example: 'Exonerate' },
  { id: 'e', root: 'E-', tag: 'ניטרלי / יציאה', group: 'relational', meaning: 'החוצה, להסיר, לשעבר', example: 'Eradicate' },
  { id: 'dict', root: 'Dict-', tag: 'ניטרלי / דיבור', group: 'communication', meaning: 'אמירה, דיבור', example: 'Predict' },
  { id: 'bell', root: 'Bell-', tag: 'שלילי', group: 'negative', meaning: 'מלחמה, תוקפנות', example: 'Belligerent' },
  { id: 'ver', root: 'Ver-', tag: 'חיובי', group: 'positive', meaning: 'אמת, נכונות', example: 'Verify' },
  { id: 'luc', root: 'Luc-', tag: 'חיובי', group: 'positive', meaning: 'אור, בהירות', example: 'Lucid' },
  { id: 'lum', root: 'Lum-', tag: 'חיובי', group: 'positive', meaning: 'אור, בהירות', example: 'Illuminate' },
  { id: 'path', root: 'Path-', tag: 'רגש / סבל', group: 'relational', meaning: 'רגש, מחלה', example: 'Empathy' },
  { id: 'chron', root: 'Chron-', tag: 'זמן', group: 'relational', meaning: 'זמן, משך', example: 'Chronic' },
  { id: 'loq', root: 'Loq-', tag: 'דיבור', group: 'communication', meaning: 'פטפוט, שפה', example: 'Eloquent' },
  { id: 'loc', root: 'Loc-', tag: 'דיבור', group: 'communication', meaning: 'פטפוט, שפה', example: 'Interlocutor' },
  { id: 'cred', root: 'Cred-', tag: 'אמונה / אמון', group: 'relational', meaning: 'אמונה, יחס רציני', example: 'Credible' },
  { id: 'sub', root: 'Sub-', tag: 'מיקום / הפחתה', group: 'relational', meaning: 'מתחת, פחות', example: 'Subtle' },
  { id: 'ant', root: 'Ant-', tag: 'שלילי / ניגוד', group: 'negative', meaning: 'נגד, מנוגד', example: 'Antarctic' },
  { id: 'anti', root: 'Anti-', tag: 'שלילי / ניגוד', group: 'negative', meaning: 'נגד, מנוגד', example: 'Antipathy' },
]

export const ROOTS_BY_ID = new Map(ROOTS.map((r) => [r.id, r]))

export const ROOT_GROUPS = [
  { key: 'positive', label: 'חיובי' },
  { key: 'negative', label: 'שלילי' },
  { key: 'communication', label: 'תקשורת' },
  { key: 'relational', label: 'יחסי' },
]

export const QUESTION_KINDS = {
  MEANING: 'meaning',
  WORD: 'word',
  COMBINED: 'combined',
}

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// One question per root per requested kind - "combined" asks both, so every
// root's meaning AND word get drilled once per round (full coverage, same
// spirit as every other quiz's buffered-retry pool).
export function generateRound(kind, roots = ROOTS) {
  const questions = []
  for (const r of roots) {
    if (kind === QUESTION_KINDS.MEANING || kind === QUESTION_KINDS.COMBINED) {
      questions.push({ id: `${r.id}-meaning`, kind: QUESTION_KINDS.MEANING, rootId: r.id })
    }
    if (kind === QUESTION_KINDS.WORD || kind === QUESTION_KINDS.COMBINED) {
      questions.push({ id: `${r.id}-word`, kind: QUESTION_KINDS.WORD, rootId: r.id })
    }
  }
  return shuffle(questions)
}

const NON_LETTER_RE = /[^a-z]/g

function normalizeWord(str) {
  return str.toLowerCase().replace(NON_LETTER_RE, '')
}

// Same tolerance idea as vocabulary's Hebrew isCloseMatch (one wrong letter,
// an adjacent swap, or up to one missing/extra letter) - short English words
// don't get the swap/two-letter leniency since a 4-5 letter word has much
// less room for a typo before it stops meaning the same word.
function isCloseWordMatch(a, b) {
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return false
  const lenDiff = Math.abs(a.length - b.length)
  if (lenDiff > 1) return false

  if (lenDiff === 0) {
    let diffCount = 0
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) diffCount++
      if (diffCount > 1) return false
    }
    return diffCount <= 1
  }

  const shorter = a.length < b.length ? a : b
  const longer = a.length < b.length ? b : a
  let i = 0
  for (let j = 0; j < longer.length && i < shorter.length; j++) {
    if (shorter[i] === longer[j]) i++
  }
  return i === shorter.length
}

export function checkWordAnswer(userAnswer, words) {
  const norm = normalizeWord(userAnswer)
  if (!norm) return false
  return words.some((w) => isCloseWordMatch(norm, normalizeWord(w)))
}

// Inverse of the `${rootId}-meaning` / `${rootId}-word` ids generateRound
// builds - used to turn stats.js's weak keys (same id shape) back into
// playable questions for "תרגול חולשות"/"רק טעויות".
export function questionFromKey(key) {
  if (key.endsWith('-meaning')) {
    return { id: key, kind: QUESTION_KINDS.MEANING, rootId: key.slice(0, -'-meaning'.length) }
  }
  return { id: key, kind: QUESTION_KINDS.WORD, rootId: key.slice(0, -'-word'.length) }
}

export { checkMeaningAnswer }
