let context = null
let master = null
let muted = localStorage.getItem('pulse-pelt-muted') === '1'
const voices = new Set()

function ensureAudio() {
  if (muted) return null
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null
    context = new AudioContext()
    master = context.createGain()
    master.gain.value = 0.72
    master.connect(context.destination)
  }
  if (context.state === 'suspended') context.resume().catch(() => {})
  return context
}

function tone({ from, to = from, duration, gain = 0.06, type = 'sine', delay = 0 }) {
  const ctx = ensureAudio()
  if (!ctx || voices.size >= 4) return
  const start = ctx.currentTime + delay
  const oscillator = ctx.createOscillator()
  const envelope = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(from, start)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration)
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.018)
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(envelope)
  envelope.connect(master)
  voices.add(oscillator)
  oscillator.onended = () => voices.delete(oscillator)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.03)
}

export function playWake() {
  tone({ from: 180, to: 420, duration: 0.32, gain: 0.1 })
}

export function playRipple(index, locked) {
  const notes = [220, 262, 294, 330, 392, 440]
  const base = notes[index % notes.length]
  tone({ from: base, to: base * 1.03, duration: locked ? 0.28 : 0.16, gain: locked ? 0.075 : 0.045, type: 'sine' })
  if (locked) tone({ from: base * 1.5, duration: 0.2, gain: 0.027, type: 'triangle', delay: 0.025 })
}

export function playComplete() {
  ;[220, 262, 330, 392, 494, 587].forEach((frequency, index) => {
    tone({ from: frequency, to: frequency * 1.01, duration: 0.62, gain: 0.04, delay: index * 0.055 })
  })
}

export function playReset() {
  tone({ from: 420, to: 170, duration: 0.3, gain: 0.06 })
}

export function isMuted() {
  return muted
}

export function toggleMute() {
  muted = !muted
  localStorage.setItem('pulse-pelt-muted', muted ? '1' : '0')
  if (!muted) ensureAudio()
  if (master) master.gain.setTargetAtTime(muted ? 0.0001 : 0.72, context.currentTime, 0.03)
  return muted
}
