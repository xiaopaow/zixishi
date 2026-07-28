# 栖时 · 东方疗愈自习室

「栖时」是一款本地优先的响应式专注 PWA。它把原创东方场景、液态玻璃界面、实时合成声音、可靠计时、每日任务和专注轨迹组合在同一套沉浸体验中。

<img src="public/scenes/rain-study.webp" alt="栖时江南雨夜书房场景" width="100%" />

## 主要功能

- 八套原创场景：江南雨夜书房、晨雾竹院、深夜城市阁楼、海边黄昏工作室、雪山云窗茶室、古寺银杏书阁、夜行山谷书厢、纸绘晨光课室
- 茶汽、雨痕、雾流、城市灯火、雪粒、银杏落叶、车窗流光、晨光浮尘与灯光呼吸等局部循环动效
- 统一的 Apple Liquid Glass 风格导航、卡片、表单、计时器、控制台和弹层
- 登录 / 注册前端预览、主理人定向邀请码、本地会话保持与未来会员权益模型（尚未接入真实账号服务）
- 登录后仅出现一次的原创励志语录欢迎卡，刷新不会重复打扰
- 倒计时、正计时、暂停、刷新恢复、后台校时与 Wake Lock 降级
- 多标签页实时同步同一计时，使用修订号拒绝陈旧写入，并以单个事务完成记录保存与计时清理
- 极简钢琴、Lo-fi 以及七通道程序化环境声混音，包含评论区点名的算珠声
- 每个场景独立保存声音预设，切回场景时恢复上次配置
- 每日任务、关联目标、专注历史、月历热力图和连续天数
- 跨午夜专注按实际运行区间分配统计时长，暂停间隔不会计入热力图
- IndexedDB 本机持久化，JSON 备份包含进行中的计时并支持完整恢复
- 运行中计时导出为暂停快照；导入前限制文件大小、数量、时长、时间顺序与重复 ID
- 可安装 PWA、离线应用外壳、场景按需更新缓存
- AVIF / WebP 双格式、1280 / 2560 / 原生分辨率响应式场景资源与静态失败回退
- 键盘焦点、跳过导航、动态页面标题、弹窗焦点圈定和减少动态效果支持
- 桌面、平板、手机竖屏与手机横屏响应式布局
- Android 7.0（API 24）及以上的 Capacitor 内测版，支持原生返回键、系统本地通知、安全区与系统栏、启动页和系统分享备份

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

## Android 内测版

Android 工程位于 `android/`，固定包名为 `com.xiaopaow.qishi`。构建要求 Node.js 22.12+、JDK 21 与 Android SDK Platform 36；Build Tools 版本由 Android Gradle Plugin 管理。

```bash
# 图标或启动页源文件变化时运行
pnpm android:assets

# 首次发布内测包前只运行一次，随后务必备份签名
pnpm android:signing

# 构建固定签名、可覆盖升级的内测包
pnpm android:beta

# 仅供开发者临时调试
pnpm android:debug
```

内测安装包默认生成在：

```text
android/app/build/outputs/apk/release/app-release.apk
```

`pnpm android:signing` 会生成独立于 Git 仓库的 PKCS#12 密钥和一份被 Git 忽略的本机构建配置。签名文件与配置中的密码必须一起安全备份；丢失任一文件，都无法再发布能覆盖升级的同包名版本。每次分发新版还必须递增 `android/app/build.gradle` 中的 `versionCode`。

原生 App 会直接把全部场景资源打入安装包，不注册 PWA Service Worker；离线首次启动也不需要下载场景。倒计时开始或继续时会安排 Android 本地通知，暂停、结束或清空数据时会取消。系统进入 Doze 或厂商深度省电后提醒可能延迟，因此当前不承诺秒级准点。后台声音会主动暂停，回到应用后需通过页面手势恢复，以避免 WebView 后台音频行为不一致。

应用要求 Android System WebView 109+；旧设备如果无法更新 WebView，可能无法运行。`pnpm android:open` 还需要另行安装 Android Studio。仓库路径可包含中文，但部分旧版 SDK 命令行工具读取中文路径时可能异常；此时可把 APK 复制到纯英文目录再检查。

## 技术结构

- React + TypeScript + Vite
- React Router
- Dexie / IndexedDB
- Web Audio API 程序化声音引擎
- Canvas 氛围粒子与 CSS 视差
- Vite PWA / Workbox
- Capacitor / Android WebView

`scripts/prepare-sites.mjs` 会在常规 Vite 构建后补充一个仅负责静态资源与 SPA 回退的 Sites Worker 入口；它不参与本地业务逻辑。

计时器以真实时间戳与单调时钟锚点而不是 `setInterval` 次数作为时间来源。正在进行的会话会在状态变化时持久化，刷新或切换后台后会自动校时，并防止同一浏览器会话内手动修改系统时间造成瞬间跳变。

场景视差通过 `requestAnimationFrame` 写入 CSS 变量，不触发 React 连续重渲染；粒子画布在页面不可见时暂停，省流画质限制为 30fps。路由页面按需加载，生产构建不发布源码映射。

## 隐私与素材

- 当前不需要账号，也不接入云端 API；预览登录只在当前浏览器或 App 本机保存昵称、邮箱与会话状态，不保存密码。邀请码由主理人定向发放，正式限次、作废与防泄漏校验需在未来账号服务端完成。
- 任务、目标、记录和偏好仅保存在当前浏览器或 Android 应用数据中；卸载 App 或清除应用数据会删除这些内容。
- 八张场景插画为本项目单独生成的原创素材。
- 音乐和环境声由 Web Audio API 实时合成，不包含抓取或转载的第三方音频。
- 完整素材来源与许可记录见 [`ASSET_LICENSES.md`](ASSET_LICENSES.md)。

## 浏览器支持

推荐最新版 Chrome、Edge、Safari 或其他支持 `backdrop-filter`、IndexedDB 与 Web Audio API 的现代浏览器。不支持液态玻璃的浏览器会自动使用高不透明度面板；Wake Lock、系统通知与全屏接口也都提供能力检测和安全降级。
