import { MIN_NUM as MULT_MIN, MAX_NUM as MULT_MAX } from './games/multiplication/logic'
import { getWeakFactPairs as getMultWeakPairs } from './games/multiplication/stats'
import { getAllFactPairs as getPowersAllPairs } from './games/powers/logic'
import { getWeakFactPairs as getPowersWeakPairs } from './games/powers/stats'
import { getAllFacts as getFactorialAllFacts } from './games/factorial/logic'
import { getWeakNumbers as getFactorialWeakNumbers } from './games/factorial/stats'
import { PRIMES } from './games/primes/logic'
import { getPrimeLevel } from './games/primes/stats'
import { CIRCLE_FACTS } from './games/circleParts/logic'
import { getWeakNumbers as getCirclePartsWeakNumbers } from './games/circleParts/stats'
import { loadDictionary, getWords, getGroups } from './games/vocabulary/dictionary'
import { getGroupLevel } from './games/vocabulary/stats'

function multiplicationCounts() {
  let total = 0
  for (let a = MULT_MIN; a <= MULT_MAX; a++) {
    for (let b = a; b <= MULT_MAX; b++) total++
  }
  return { green: total - getMultWeakPairs().length, total }
}

function powersCounts() {
  const all = getPowersAllPairs()
  return { green: all.length - getPowersWeakPairs(all).length, total: all.length }
}

function factorialCounts() {
  const all = getFactorialAllFacts()
  return { green: all.length - getFactorialWeakNumbers(all).length, total: all.length }
}

function primesCounts() {
  const green = PRIMES.filter((n) => getPrimeLevel(n) === 'green').length
  return { green, total: PRIMES.length }
}

function circlePartsCounts() {
  const degrees = CIRCLE_FACTS.map((f) => f.degrees)
  return { green: degrees.length - getCirclePartsWeakNumbers(degrees).length, total: degrees.length }
}

function vocabularyCounts() {
  const groups = getGroups(getWords())
  const green = groups.filter((g) => getGroupLevel(g.index) === 'green').length
  return { green, total: groups.length }
}

// Aggregates "green" (mastered) vs total across every quiz that tracks a
// mastery level - both quantitative (fact-based) and verbal (vocabulary
// groups) - into one platform-wide percentage. Vocabulary's word list loads
// asynchronously, so this resolves only once it's available rather than
// undercounting it as empty.
export async function getOverallMasteryPercent() {
  await loadDictionary()

  const parts = [
    multiplicationCounts(),
    powersCounts(),
    factorialCounts(),
    primesCounts(),
    circlePartsCounts(),
    vocabularyCounts(),
  ]

  const total = parts.reduce((sum, p) => sum + p.total, 0)
  if (total === 0) return 0

  const green = parts.reduce((sum, p) => sum + p.green, 0)
  return Math.round((green / total) * 100)
}
