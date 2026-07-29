# 脉冲星绒：视觉 QA

## 证据

- `_qa/ui/platform-layout-active-390x844.png`
- `_qa/ui/platform-layout-complete-390x844.png`
- `_qa/ui/platform-layout-active-320x568.png`
- `_qa/ui/platform-layout-complete-320x568.png`
- `_qa/ui/external-guest-active-390x844.png`
- `_qa/ui/poster-thumbnail-160.png`

platform-layout 使用完整平台参数模拟，使生产 guest shell 不安装外部访客栏；external-guest 使用普通外部 URL，访客栏保持可见。

## 首轮发现与修复

| 严重度 | 状态 | 可见问题 | 修复 | 复验 |
|---|---|---|---|---|
| P0 | sleeping | 透明 loading 文案覆盖唤醒按钮命中区 | 为 `.pp__loading-copy` 设置 `pointer-events:none` | 真实触摸唤醒进入 active，首帧握手完成 |
| P1 | active | 固定世界相机距离让竖屏星体几乎填满整屏 | 基础距离改为按 aspect 计算并限制捏合倍数 | 390 与 320 均保持主体约 78% 屏宽 |
| P2 | closure | `34°` 节点间隔使可见半球难以放满六点 | 调整为 `24°`，仍保证节点视觉分离 | 两档尺寸均可六次触摸完成 |

## 最终评分

| 类别 | 分数（1–5） | 结论 |
|---|---:|---|
| 层级 | 5 | 标题、星体、触摸目标与完成操作一眼可辨 |
| 一致性 | 5 | 三棱纤维、线性图标、色谱和动效属于同一视觉世界 |
| 可读性 | 4 | 中英文、进度和完成状态在两档手机清楚；external banner 会遮住标题但只属于外部覆盖检查 |
| 游戏手感 | 4 | 触摸同帧形变、锁点音阶与全局完成波明确 |
| 素材质量 | 5 | 运行视觉完全程序化；正式海报通过 1024 与 160 检查 |
| 响应式 UX | 5 | 390×844、320×568 无横向溢出，完成按钮保持可达 |
| 完成度 | 4 | 主要状态、错误恢复、重织、声音与 reduced-motion 均已覆盖 |

平均分：`4.57 / 5`。无类别低于 3。
