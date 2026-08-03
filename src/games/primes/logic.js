export const MAX_PRIME = 97

function isPrime(n) {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false
  }
  return true
}

export const PRIMES = Array.from({ length: MAX_PRIME - 1 }, (_, i) => i + 2).filter(isPrime)
