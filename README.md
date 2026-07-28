# 栖时 · 东方疗愈自习室

「栖时」是一款本地优先的响应式专注 PWA。它把原创东方场景、液态玻璃界面、实时合成声音、可靠计时、每日任务和专注轨迹组合在同一套沉浸体验中。

<img src="public/scenes/rain-study.webp" alt="栖时江南雨夜书房场景" width="100%" />

## 主要功能

- 八套原创场景：江南雨夜书房、晨雾竹院、深夜城市阁楼、海边黄昏工作室、雪山云窗茶室、古寺银杏书阁、夜行山谷书厢、纸绘晨光课室
- 茶汽、雨痕、雾流、城市灯火、雪粒、银杏落叶、车窗流光、晨光浮尘与灯光呼吸等局部循环动效
- 统一的 Apple Liquid Glass 风格导航、卡片、表单、计时器、控制台和弹层
- 登录 / 注册前端预览、内测邀请码入口与未来会员权益模型（尚未接入真实账号服务）
- 登录后仅出现一次的原创励志语录欢迎卡，刷新不会重复打扰
- 倒计时、正计时、暂停、刷新恢复、后台校时与 Wake Lock 降级
- 极简钢琴、Lo-fi 以及七通道程序化环境声混音，包含评论区点名的算珠声
- 每个场景独立保存声音预设，切回场景时恢复上次配置
- 每日任务、关联目标、专注历史、月历热力图和连续天数
- 跨午夜专注按本地日期分配统计时长
- IndexedDB 本机持久化，支持 JSON 导入、导出和清空
- 可安装 PWA、离线应用外壳、场景按需缓存
- AVIF / WebP 双格式、多尺寸场景资源与静态失败回退
- 桌面、平板、手机竖屏与手机横屏响应式布局

## 本地运行

```bash
pnpm install
pnpm dev
```

生产构建与测试：

```bash
pnpm test
pnpm build
pnpm preview
```

## 技术结构

- React + TypeScript + Vite
- React Router
- Dexie / IndexedDB
- Web Audio API 程序化声音引擎
- Canvas 氛围粒子与 CSS 视差
- Vite PWA / Workbox

`scripts/prepare-sites.mjs` 会在常规 Vite 构建后补充一个仅负责静态资源与 SPA 回退的 Sites Worker 入口；它不参与本地业务逻辑。

计时器以真实时间戳而不是 `setInterval` 次数作为时间来源。正在进行的会话只在状态发生变化时持久化，刷新或切换后台后会根据 `runningSince` 自动校时。

## 隐私与素材

- 当前不需要账号，也不接入云端 API；登录、邀请码和 Plus 会员仅为未来服务的前端与数据契约预留。
- 任务、目标、记录和偏好仅保存在当前浏览器。
- 八张场景插画为本项目单独生成的原创素材。
- 音乐和环境声由 Web Audio API 实时合成，不包含抓取或转载的第三方音频。
- 完整素材来源与许可记录见 [`ASSET_LICENSES.md`](ASSET_LICENSES.md)。

## 浏览器支持

推荐最新版 Chrome、Edge、Safari 或其他支持 `backdrop-filter`、IndexedDB 与 Web Audio API 的现代浏览器。不支持液态玻璃的浏览器会自动使用高不透明度面板；Wake Lock、系统通知与全屏接口也都提供能力检测和安全降级。
