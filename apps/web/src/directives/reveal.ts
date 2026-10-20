import type { Directive } from 'vue'

export interface RevealOptions {
  delay?: number
  distance?: number
  duration?: number
  once?: boolean
  threshold?: number
}

const observers = new WeakMap<HTMLElement, IntersectionObserver>()
const animations = new WeakMap<HTMLElement, Animation>()

const scrollReveal: Directive<HTMLElement, RevealOptions | undefined> = {
  mounted(element, binding) {
    const options = binding.value ?? {}
    const delay = Math.max(0, options.delay ?? 0)
    const distance = Math.max(0, options.distance ?? 26)
    const duration = Math.max(160, options.duration ?? 680)

    element.classList.add('reveal-on-scroll')
    element.style.setProperty('--reveal-distance', `${distance}px`)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('is-revealed')
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        if (!element.classList.contains('is-revealed')) {
          const animation = element.animate([
            { opacity: 0, filter: 'blur(5px)', transform: `translate3d(0,${distance}px,0)` },
            { opacity: 1, filter: 'blur(0)', transform: 'translate3d(0,0,0)' },
          ], {
            delay,
            duration,
            easing: 'cubic-bezier(.22,1,.36,1)',
            fill: 'both',
          })
          animations.set(element, animation)
          void animation.finished.then(() => {
            if (animations.get(element) !== animation) return
            element.classList.add('is-revealed')
            animation.cancel()
            animations.delete(element)
          }).catch(() => undefined)
        }
        if (options.once !== false) observer.unobserve(element)
      } else if (options.once === false) {
        animations.get(element)?.cancel()
        animations.delete(element)
        element.classList.remove('is-revealed')
      }
    }, {
      threshold: options.threshold ?? 0.12,
      rootMargin: '0px 0px -7% 0px',
    })

    observers.set(element, observer)
    observer.observe(element)
  },
  unmounted(element) {
    observers.get(element)?.disconnect()
    observers.delete(element)
    animations.get(element)?.cancel()
    animations.delete(element)
  },
}

export default scrollReveal
