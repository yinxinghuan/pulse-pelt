# 可复用效果记录

## Capability

- Working name：directional instanced surface ripple
- One-sentence visual result：在任意封闭曲面的方向场上批量实例化纤维/鳞片，并以指针命中方向驱动 GPU 局部环形波、永久节点和全局协调波。
- Reuse verdict：candidate
- Example game：Pulse Pelt / 脉冲星绒

## Upstream

- Work：原创实现
- Author：AlterU game project
- Demo：Pulse Pelt
- Source：本仓库 `src/scene.js`
- Revision：首发 revision 由发布提交固定
- License：项目自有代码；运行时使用 Three.js MIT
- Required notices/assets：`public/THIRD_PARTY_NOTICES.txt`

本能力没有复制 `emmelleppi/threejs-challenge-0` 的代码、shader、纹理、参数或素材。该无许可仓库只触发了对“球形表面响应触摸”这一问题空间的重新立项。

## Rendering recipe

- Engine and minimum versions：Three.js `0.182.x`，WebGL 2 优先，WebGL 1 可编译固定循环 shader 时可运行。
- Geometry/data representation：`InstancedBufferGeometry`；每实例保存单位方向、绕法线旋转角与随机种子；基础几何为三棱锥。
- Simulation/update passes：CPU 只更新最多 8 个短期波源和 6 个永久节点的 uniform；全部纤维形变在 vertex shader 完成。
- Material/shader stages：方向场构造局部切线基；以方向点积构造核心高斯与传播环；fragment shader 组合视角虹彩、边缘 Fresnel、尖端渐亮和节点色谱。
- Camera and lighting：透视相机；shader 内方向光与视角项，不依赖 shadow map。
- Post-processing：无。
- Defining constants：`MAX_WAVES=8`、`MAX_NODES=6`、基础半径 `1.32`、波环速度系数 `0.32`。

## Interaction hooks

- Primary pointer input：将 raycast 命中点归一化为方向并调用 `seedAt(direction, lock, strength)`。
- Secondary/multitouch input：双指中点控制方位/俯仰，指距控制响应式相机缩放。
- Parameters safe to expose：实例数量、基础半径、纤维尺寸、波源数量、传播速度、衰减、节点间隔、色谱与全局波强度。
- Inputs that destabilize or break the effect：超过 12 个实时波源会增加 uniform 压力；纤维根部半径过大时会产生明显穿插；节点夹角小于约 `18°` 会难以视觉区分。

## Performance envelope

- Desktop tier：1680 实例，DPR 上限 1.5。
- 390×844 mobile tier：1680 实例，DPR 上限 1.5，已验证。
- 320×568 low tier：1080 实例，DPR 上限 1.25，已验证。
- GPU/feature requirements：WebGL、vertex shader uniform 数组、instancing。
- Offscreen pause strategy：`visibilitychange` + `IntersectionObserver`，可见比例低于 `0.15` 停止 RAF。
- Tap-to-start requirement：需要；Three.js chunk 与 renderer 在首次主动触摸后加载/创建。
- Memory/disposal notes：销毁 geometry、material、node meshes 和 renderer；短期波源固定上限。

## Portability

- Build/import requirements：Vite `base: './'`；Three.js npm import。
- Runtime assets：无图片、模型、纹理或音频资产。
- Relative-path concerns：无运行素材路径；动态 chunk 由 Vite 相对基址解析。
- Browser/Safari caveats：必须保留全局 iOS 长按保护；Pointer Events 画布使用 `touch-action:none`。
- Fallback or skip condition：无 WebGL 时显示错误与重试，不用静态假动画伪装互动成功。

## Failure ledger

- Visual parity failures：不适用；这是获批的原创降级路线，不是无许可参考的复刻。
- Touch conflicts：隐藏 loading 文案首稿截获唤醒输入，已通过 `pointer-events:none` 修复。
- Aspect-ratio failures：固定世界距离让球体在竖屏占满高度；改为按 aspect 计算基础相机距离。
- Performance failures：未发现；Three.js 被动态拆分，预唤醒阶段不创建 renderer。
- Misleading approximations to avoid：不要重做成灰白胶囊球、自动环绕玻璃球或复用无许可 shader 表达式。

## Skill boundary

- Include in reusable skill：方向场实例几何生成器、固定上限波源 uniform 合同、局部波/永久节点 GLSL、raycast 方向输入、性能分档与销毁合同。
- Keep in game-specific code：六点完成规则、标题、文案、色谱、星体故事、音阶、睡眠态和完成 UI。
- Suggested skill name：`directional-instanced-surface`

结论：机制具备明确的跨游戏价值，可用于毛皮、草场、鳞片、刷毛护盾和行星表面，但当前只有一个真实消费者。先登记为候选，不立即创建正式 Skill；出现第二个不同题材消费者后再用 `skill-creator` 晋升，可避免把本作的六点状态机过早固化为通用接口。
