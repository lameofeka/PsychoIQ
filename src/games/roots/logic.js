import { checkAnswer as checkMeaningAnswer } from '../vocabulary/logic'

// `group` buckets each root into one of ROOT_GROUPS below, purely for the
// progress-map table's sectioning - `tag` is the finer-grained hint shown
// during gameplay and stays independent of it.
export const ROOTS = [
  { id: 'mal', root: 'Mal-', tag: 'שלילי', group: 'negative', meaning: 'רע, לקוי, זדוני', words: ['Malevolent', 'Malicious', 'Malfunction'] },
  { id: 'bene', root: 'Bene- / Bon-', tag: 'חיובי', group: 'positive', meaning: 'טוב, מועיל, נדיב', words: ['Benevolent', 'Beneficial', 'Benign'] },
  { id: 'magna', root: 'Magna- / Major-', tag: 'חיובי / גודל', group: 'positive', meaning: 'גדול, אציל', words: ['Magnanimous', 'Magnify', 'Magnitude'] },
  { id: 'in', root: 'In- / Un- / Dis- / Im- / Ir-', tag: 'שלילי', group: 'negative', meaning: 'לא, ביטול', words: ['Irreversible', 'Impartial', 'Disparate'] },
  { id: 'ex', root: 'Ex- / E-', tag: 'ניטרלי / יציאה', group: 'relational', meaning: 'החוצה, להסיר, לשעבר', words: ['Exonerate', 'Eradicate', 'Exclude'] },
  { id: 'dict', root: 'Dict-', tag: 'ניטרלי / דיבור', group: 'communication', meaning: 'אמירה, דיבור', words: ['Predict', 'Contradict', 'Dictate'] },
  { id: 'bell', root: 'Bell-', tag: 'שלילי', group: 'negative', meaning: 'מלחמה, תוקפנות', words: ['Belligerent', 'Bellicose', 'Rebellion'] },
  { id: 'ver', root: 'Ver-', tag: 'חיובי', group: 'positive', meaning: 'אמת, נכונות', words: ['Verify', 'Veracity', 'Verdict'] },
  { id: 'luc', root: 'Luc- / Lum-', tag: 'חיובי', group: 'positive', meaning: 'אור, בהירות', words: ['Lucid', 'Illuminate', 'Elucidate'] },
  { id: 'path', root: 'Path-', tag: 'רגש / סבל', group: 'relational', meaning: 'רגש, מחלה', words: ['Empathy', 'Apathy', 'Pathological'] },
  { id: 'chron', root: 'Chron-', tag: 'זמן', group: 'relational', meaning: 'זמן, משך', words: ['Chronic', 'Chronological', 'Anachronism'] },
  { id: 'loq', root: 'Loq- / Loc-', tag: 'דיבור', group: 'communication', meaning: 'פטפוט, שפה', words: ['Eloquent', 'Loquacious', 'Colloquial'] },
  { id: 'cred', root: 'Cred-', tag: 'אמונה / אמון', group: 'relational', meaning: 'אמונה, יחס רציני', words: ['Credible', 'Incredible', 'Credulous'] },
  { id: 'sub', root: 'Sub-', tag: 'מיקום / הפחתה', group: 'relational', meaning: 'מתחת, פחות', words: ['Subtle', 'Subside', 'Subordinate'] },
  { id: 'ant', root: 'Ant- / Anti-', tag: 'שלילי / ניגוד', group: 'negative', meaning: 'נגד, מנוגד', words: ['Antipathy', 'Antagonist', 'Antidote'] },
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
