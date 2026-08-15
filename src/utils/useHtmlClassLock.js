import { useEffect } from 'react'

// Even with the class toggle below, standalone iOS PWAs sometimes don't
// recomposite the translucent status-bar strip right away after a
// background change with no real page navigation behind it — the strip
// just keeps showing whatever was painted there before. A real scroll is
// the one thing that reliably makes WebKit resample it, so this fakes a
// 1px scroll-and-back on the next two frames to force that resample even
// on pages with nothing to actually scroll.
export function nudgeStatusBarRepaint() {
  requestAnimationFrame(() => {
    window.scrollTo(0, 1)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  })
}

// Toggles a class on <html> for as long as the calling component is mounted.
// Used alongside (not instead of) the app's :has()-driven CSS, as a
// belt-and-suspenders fallback for iOS status-bar coloring — some WebKit
// versions have been flaky about repainting the safe-area strip purely from
// a :has() selector reacting to a deep DOM change with no navigation.
export function useHtmlClassLock(className) {
  useEffect(() => {
    document.documentElement.classList.add(className)
    nudgeStatusBarRepaint()
    return () => {
      document.documentElement.classList.remove(className)
      nudgeStatusBarRepaint()
    }
  }, [className])
}
