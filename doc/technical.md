# 脉冲星绒：技术文档

## 1. 技术栈

- 构建：Vite `6.4.3`，`base: './'`，ES modules。
- 渲染：Three.js `0.182.x`、WebGL、`InstancedBufferGeometry` 与自定义 GLSL。
- 界面：原生 HTML、CSS 与 JavaScript；无 UI 框架。
- 输入：Pointer Events；单指 raycast 塑形，双指相机旋转与捏合缩放。
- 音频：Web Audio API 即时合成。
- 平台：远程 `guest-shell.js`；本作没有图像/文字驱动身份输入、排行、存档或跨用户数据，因此不请求 Aigram 玩家资料。

## 2. 目录结构

- `index.html`：首屏关键 CSS、iOS 长按保护、根节点与 guest shell。
- `src/main.js`：DOM 状态机、首次触摸动态加载、幽灵手演示、完成/恢复、生命周期与可见性编排。
- `src/scene.js`：Three.js 场景、实例纤维、GLSL 波场、raycast、双指相机、响应式性能与资源释放。
- `src/audio.js`：唤醒、波纹、锁点、完成和重织的合成音。
- `src/i18n.js`：`zh/en` 语言检测与全部可见文案。
- `src/style.css`：视觉系统、睡眠/加载/活动/完成/错误状态与窄屏适配。
- `public/poster.png`：游戏与平台海报；`public/poster-source.webp` 保存 transit 原始输出。
- `public/THIRD_PARTY_NOTICES.txt`：Three.js MIT 分发 notice。
- `doc/`：需求、视觉、技术、海报来源、QA 与效果候选记录。
- `_qa/ui/`：platform-layout、external-guest、两档手机和海报缩略图证据。

## 3. 核心模块

### 状态与首帧

页面从 `sleeping` 开始，仅显示内联 CSS 星体。首次 `pointerdown` 后动态导入 `scene.js`；只有 renderer 完成第一帧时才进入 `active` 并淡入 Canvas。初始化异常进入 `error`，提供重试。

### 实例表面与波场

每根三棱纤维保存单位方向 `aDirection`、局部旋转 `aSpin` 和种子 `aSeed`。vertex shader 从方向构造正交切线基，将三棱锥定位到球面；最多 8 个动态波源以方向点积生成传播环和核心形变，最多 6 个永久节点生成持续光斑。fragment shader 计算方向光、视角虹彩、Fresnel、尖端发光和节点色谱。

### 触控与相机

单指用不可见球体 raycast，把命中点归一化后写入波源；每次按下尝试锁定与既有点相距至少 `24°` 的节点，拖动以 `70ms / 22px` 门槛追加短期波。双指中点变化控制方位和俯仰，指距变化控制 `0.82–1.25` 倍响应式相机距离。

### 屏幕适配与性能

相机基础距离使用 `clamp(5.34 / aspect, 8.8, 11.8)`，让竖屏星体保持接近固定屏宽。窄屏或低核心设备使用 1080 实例和 DPR 1.25；其他设备使用 1680 实例和 DPR 1.5。`visibilitychange` 与 `IntersectionObserver` 会在隐藏或可见比例低于 `0.15` 时停止 RAF。

### 音频与多语言

AudioContext 只在首次用户输入后创建；音频失败不影响视觉。音量、声部数和音高映射集中在 `audio.js`。`i18n.js` 优先读取 `localStorage.game_locale`，否则按浏览器语言选择中文或英文。

## 4. 扩展点

- 改波形、节点数量或实例尺寸：编辑 `src/scene.js` 顶部常量、shader 与 `tryLockNode()`。
- 换几何表面：替换 `buildFiberGeometry()` 的基础几何，并保持 `aDirection / aSpin / aSeed` 合同。
- 改玩法闭环：编辑 `src/main.js` 的 `onProgress / onComplete / reset` 状态处理。
- 改视觉与响应式布局：编辑 `src/style.css` 与 `doc/visual.md`。
- 改音阶或反馈时长：编辑 `src/audio.js`。
- 改中英文文案：编辑 `src/i18n.js`。
- 加存档、排行或身份功能：先按 `aigram-api` 与对应 persistence skill 同步 `shared/runtime`，再在 `main.js` 接入；当前版本没有这些后端依赖。
- 换正式海报：通过 Aigram transit 重新生成，并同名覆盖 `public/poster.png` 与 games 仓库 `posters/pulse-pelt.png`，同步更新 `doc/poster-source.md`。
