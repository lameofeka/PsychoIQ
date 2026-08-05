import { useCallback, useRef, useState } from 'react'

const PRESS_HOLD_MS = 500

// Tracks which keypad key should show the "pressed" fill. It stays lit
// until PRESS_HOLD_MS passes or a different key is pressed, whichever
// comes first — unlike the native :active pseudo-class, which clears the
// instant the finger lifts.
export function useKeypadPress() {
  const [pressedKey, setPressedKey] = useState(null)
  const timeoutRef = useRef(null)

  const press = useCallback((key) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setPressedKey(key)
    timeoutRef.current = setTimeout(() => {
      setPressedKey(null)
      timeoutRef.current = null
    }, PRESS_HOLD_MS)
  }, [])

  return [pressedKey, press]
}
