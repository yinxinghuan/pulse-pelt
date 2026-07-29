const copy = {
  zh: {
    eyebrow: 'TOUCH-BORN CELESTIAL',
    title: '脉冲星绒',
    wake: '触摸唤醒',
    waking: '正在聚拢星绒…',
    hint: '单指编织 · 双指旋转',
    complete: '共振已定',
    completeSub: '六个触点正在共同呼吸',
    restart: '重织一颗',
    mute: '静音',
    unmute: '开启声音',
    error: '这台设备没能唤醒星绒',
    errorDetail: '需要支持 WebGL 的浏览器。',
    retry: '重试',
    progress: (n) => `已锁定 ${n} / 6 个共振点`,
  },
  en: {
    eyebrow: 'TOUCH-BORN CELESTIAL',
    title: 'Pulse Pelt',
    wake: 'Touch to wake',
    waking: 'Gathering the fibers…',
    hint: 'One finger weaves · Two fingers orbit',
    complete: 'Resonance held',
    completeSub: 'Six touches are breathing together',
    restart: 'Weave again',
    mute: 'Mute',
    unmute: 'Sound on',
    error: 'This device could not wake the pelt',
    errorDetail: 'A WebGL-capable browser is required.',
    retry: 'Retry',
    progress: (n) => `${n} of 6 resonances held`,
  },
}

function detectLocale() {
  const override = localStorage.getItem('game_locale')
  if (override === 'zh' || override === 'en') return override
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const locale = detectLocale()
export const t = (key, value) => {
  const entry = copy[locale][key]
  return typeof entry === 'function' ? entry(value) : entry
}
