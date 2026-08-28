import { MIN_NUM as MULT_MIN, MAX_NUM as MULT_MAX } from './games/multiplication/logic'
import { getWeakFactPairs as getMultWeakPairs } from './games/multiplication/stats'
import { getAllFactPairs as getPowersAllPairs } from './games/powers/logic'
import { getWeakFactPairs as getPowersWeakPairs } from './games/powers/stats'
import { getAllFacts as getFactorialAllFacts } from './games/factorial/logic'
import { getWeakNumbers as getFactorialWeakNumbers } from './games/factorial/stats'
import { DIVISORS } from './games/division/logic'
import { getWeakNumbers as getDivisionWeakNumbers } from './games/division/stats'
import { PRIMES } from './games/primes/logic'
import { getPrimeLevel } from './games/primes/stats'
import { integersMasteryCounts } from './games/integers/stats'
import { CIRCLE_FACTS } from './games/circleParts/logic'
import { getWeakNumbers as getCirclePartsWeakNumbers } from './games/circleParts/stats'
import { POLYGON_FACTS } from './games/polygons/logic'
import { getWeakNumbers as getPolygonsWeakNumbers } from './games/polygons/stats'
import { TRIPLES, tripleId } from './games/pythagoras/logic'
import { getWeakIds as getPythagorasWeakIds } from './games/pythagoras/stats'
import { loadDictionary, getWords, getGroups } from './games/vocabulary/dictionary'
import { getGroupLevel } from './games/vocabulary/stats'
import { loadTemplateData, loadSynonymData, getSentences, getSynonymSets } from './games/essay/storage'
import { getSentenceLevel, getSynonymSetLevel } from './games/essay/stats'
import { loadDictionary as loadRootsDictionary, getRoots } from './games/roots/dictionary'
import { getFactLevel as getRootFactLevel, meaningKey, wordKey } from './games/roots/stats'

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

function divisionCounts() {
  return { green: DIVISORS.length - getDivisionWeakNumbers(DIVISORS).length, total: DIVISORS.length }
}

function primesCounts() {
  const green = PRIMES.filter((n) => getPrimeLevel(n) === 'green').length
  return { green, total: PRIMES.length }
}

function circlePartsCounts() {
  const degrees = CIRCLE_FACTS.map((f) => f.degrees)
  return { green: degrees.length - getCirclePartsWeakNumbers(degrees).length, total: degrees.length }
}

function polygonsCounts() {
  const sides = POLYGON_FACTS.map((f) => f.sides)
  return { green: sides.length - getPolygonsWeakNumbers(sides).length, total: sides.length }
}

function pythagorasCounts() {
  const ids = TRIPLES.map(tripleId)
  return { green: ids.length - getPythagorasWeakIds(ids).length, total: ids.length }
}

function vocabularyCounts() {
  const groups = getGroups(getWords())
  const green = groups.filter((g) => getGroupLevel(g.index) === 'green').length
  return { green, total: groups.length }
}

function essayCounts() {
  const sentences = getSentences()
  const synonymSets = getSynonymSets().filter((s) => s.synonyms.length > 0)
  const sentenceGreen = sentences.filter((s) => getSentenceLevel(s.id) === 'green').length
  const synonymGreen = synonymSets.filter((s) => getSynonymSetLevel(s) === 'green').length
  return {
    green: sentenceGreen + synonymGreen,
    total: sentences.length + synonymSets.length,
  }
}

function rootsCounts() {
  const keys = getRoots().flatMap((r) => [meaningKey(r.id), wordKey(r.id)])
  const green = keys.filter((key) => getRootFactLevel(key) === 'green').length
  return { green, total: keys.length }
}

function percentOf(parts) {
  const total = parts.reduce((sum, p) => sum + p.total, 0)
  if (total === 0) return 0
  const green = parts.reduce((sum, p) => sum + p.green, 0)
  return Math.round((green / total) * 100)
}

// Aggregates "green" (mastered) vs total across every quiz that tracks a
// mastery level - both quantitative (fact-based) and verbal (vocabulary
// groups) - into one platform-wide percentage, plus the same split by
// category. Vocabulary's word list loads asynchronously, so this resolves
// only once it's available rather than undercounting it as empty.
export async function getMasteryBreakdown() {
  await Promise.all([loadDictionary(), loadTemplateData(), loadSynonymData(), loadRootsDictionary()])

  const quantitativeParts = [
    multiplicationCounts(),
    powersCounts(),
    factorialCounts(),
    divisionCounts(),
    primesCounts(),
    circlePartsCounts(),
    polygonsCounts(),
    pythagorasCounts(),
    integersMasteryCounts(),
  ]
  const verbalParts = [vocabularyCounts(), essayCounts(), rootsCounts()]

  return {
    overall: percentOf([...quantitativeParts, ...verbalParts]),
    quantitative: percentOf(quantitativeParts),
    verbal: percentOf(verbalParts),
  }
}
