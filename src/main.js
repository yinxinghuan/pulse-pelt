import './style.css'
import { t } from './i18n.js'
import { isMuted, playComplete, playReset, playRipple, playWake, toggleMute } from './audio.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="pp" data-state="sleeping">
    <canvas class="pp__canvas" aria-label="${t('title')}"></canvas>
    <div class="pp__mist" aria-hidden="true"></div>
    <header class="pp__header">
      <p class="pp__eyebrow">${t('eyebrow')}</p>
      <h1 class="pp__title">${t('title')}</h1>
      <div class="pp__progress" role="status" aria-label="${t('progress', 0)}">
        ${Array.from({ length: 6 }, (_, index) => `<span class="pp__progress-dot" data-progress-dot="${index}"></span>`).join('')}
      </div>
    </header>
    <button class="pp__sound" type="button" aria-label="${isMuted() ? t('unmute') : t('mute')}">
      <svg class="pp__icon pp__icon--sound-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10"/></svg>
      <svg class="pp__icon pp__icon--sound-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="m17 9 5 5m0-5-5 5"/></svg>
    </button>
    <section class="pp__wake">
      <div class="pp__sleep-orb" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <button class="pp__wake-button" type="button">
        <svg class="pp__wake-hand" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M22 27V11a3 3 0 0 1 6 0v11-6a3 3 0 0 1 6 0v8-4a3 3 0 0 1 6 0v11c0 9-6 14-14 14h-2c-5 0-8-3-11-7l-5-7a3 3 0 0 1 5-4l4 4V19a3 3 0 0 1 5 0"/>
          <circle cx="25" cy="11" r="9"/>
        </svg>
        <span>${t('wake')}</span>
      </button>
      <p class="pp__loading-copy" aria-live="polite">${t('waking')}</p>
    </section>
    <div class="pp__ghost" aria-hidden="true">
      <svg viewBox="0 0 48 48"><path d="M22 27V11a3 3 0 0 1 6 0v11-6a3 3 0 0 1 6 0v8-4a3 3 0 0 1 6 0v11c0 9-6 14-14 14h-2c-5 0-8-3-11-7l-5-7a3 3 0 0 1 5-4l4 4V19a3 3 0 0 1 5 0"/></svg>
    </div>
    <p class="pp__hint">${t('hint')}</p>
    <section class="pp__complete" aria-live="polite">
      <p class="pp__complete-kicker">${t('complete')}</p>
      <p class="pp__complete-copy">${t('completeSub')}</p>
      <button class="pp__restart" type="button">
        <svg class="pp__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7"/><path d="M4 4v4.7h4.7"/></svg>
        <span>${t('restart')}</span>
      </button>
    </section>
    <section class="pp__error" role="alert">
      <svg class="pp__error-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7 43 40H5L24 7Z"/><path d="M24 18v10m0 6h.01"/></svg>
      <h2>${t('error')}</h2>
      <p>${t('errorDetail')}</p>
      <button class="pp__retry" type="button">${t('retry')}</button>
    </section>
  </main>
`

const root = app.querySelector('.pp')
const canvas = app.querySelector('.pp__canvas')
const wakeButton = app.querySelector('.pp__wake-button')
const soundButton = app.querySelector('.pp__sound')
const restartButton = app.querySelector('.pp__restart')
const retryButton = app.querySelector('.pp__retry')
const progress = app.querySelector('.pp__progress')
const progressDots = [...app.querySelectorAll('[data-progress-dot]')]
let sceneController = null
let started = false
let ghostTimers = []
let visibilityRatio = 1

function syncSoundButton() {
  const muted = isMuted()
  soundButton.classList.toggle('pp__sound--muted', muted)
  soundButton.setAttribute('aria-label', muted ? t('unmute') : t('mute'))
}

function updateProgress(count) {
  progressDots.forEach((dot, index) => dot.classList.toggle('pp__progress-dot--active', index < count))
  progress.setAttribute('aria-label', t('progress', count))
}

function clearGhost() {
  ghostTimers.forEach(clearTimeout)
  ghostTimers = []
  root.classList.remove('pp--show-ghost')
}

function runGhostDemo() {
  if (localStorage.getItem('pulse-pelt-seen-hint') === '1') return
  root.classList.add('pp--show-ghost')
  ;[320, 860, 1400].forEach((delay, index) => {
    ghostTimers.push(setTimeout(() => sceneController?.injectDemoWave(index), delay))
  })
  ghostTimers.push(setTimeout(() => {
    clearGhost()
    localStorage.setItem('pulse-pelt-seen-hint', '1')
  }, 2350))
}

function pauseForVisibility() {
  sceneController?.setPaused(document.hidden || visibilityRatio < 0.15)
}

async function startScene() {
  if (started) return
  started = true
  root.dataset.state = 'loading'
  playWake()
  try {
    const { createPulsePeltScene } = await import('./scene.js')
    sceneController = createPulsePeltScene({
      canvas,
      onFirstFrame() {
        root.dataset.state = 'active'
        root.classList.add('pp--scene-ready')
        runGhostDemo()
      },
      onProgress: updateProgress,
      onRipple(locked, index) {
        playRipple(index, locked)
        clearGhost()
      },
      onComplete() {
        root.dataset.state = 'complete'
        clearGhost()
        playComplete()
      },
    })
    pauseForVisibility()
  } catch (error) {
    console.error('Pulse Pelt initialization failed', error)
    started = false
    root.dataset.state = 'error'
  }
}

wakeButton.addEventListener('pointerdown', startScene, { once: true })
soundButton.addEventListener('click', () => {
  toggleMute()
  syncSoundButton()
})
restartButton.addEventListener('pointerdown', () => {
  root.dataset.state = 'active'
  updateProgress(0)
  playReset()
  sceneController?.reset()
})
retryButton.addEventListener('click', () => {
  root.dataset.state = 'sleeping'
  startScene()
})
addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r' && sceneController) restartButton.dispatchEvent(new PointerEvent('pointerdown'))
  if (event.key.toLowerCase() === 'm') soundButton.click()
})
document.addEventListener('visibilitychange', pauseForVisibility)
const observer = new IntersectionObserver(
  ([entry]) => {
    visibilityRatio = entry?.intersectionRatio ?? 0
    pauseForVisibility()
  },
  { threshold: [0, 0.15, 0.5, 1] },
)
observer.observe(root)
syncSoundButton()
