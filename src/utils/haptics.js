// Short haptic pulse for a correct answer. No-op on desktop or browsers
// without the Vibration API (e.g. iOS Safari).
export function vibrateSuccess() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(15)
  }
}
