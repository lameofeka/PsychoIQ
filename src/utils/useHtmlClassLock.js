import { useEffect } from 'react'

// Toggles a class on <html> for as long as the calling component is mounted.
// Used alongside (not instead of) the app's :has()-driven CSS, as a
// belt-and-suspenders fallback for iOS status-bar coloring — some WebKit
// versions have been flaky about repainting the safe-area strip purely from
// a :has() selector reacting to a deep DOM change with no navigation.
export function useHtmlClassLock(className) {
  useEffect(() => {
    document.documentElement.classList.add(className)
    return () => document.documentElement.classList.remove(className)
  }, [className])
}
