# 栖时素材与许可清单

更新日期：2026-07-28

本清单覆盖首版仓库中随应用发布的视觉、声音、图标与字体资源。项目没有抓取、复制或重新分发参考作品的图片、音乐、名称与品牌素材。

## 原创场景插画

以下八套场景使用 OpenAI 内置 ImageGen 为本项目单独生成，之后转换为 AVIF / WebP 主图、1280 / 2560（适用母图）响应式衍生图与低清占位图：

| 场景 | 发布文件 | 生成源文件 |
| --- | --- | --- |
| 江南雨夜书房 | `rain-study.webp`、`rain-study.avif` 及对应 `-poster` 文件 | `exec-f9bebaac-0e7a-4092-a9ea-11b79f7efa8f.png` |
| 晨雾竹院 | `bamboo-dawn.webp`、`bamboo-dawn.avif` 及对应 `-poster` 文件 | `exec-075d8235-6890-45fa-99a0-e216abf9eede.png` |
| 深夜城市阁楼 | `city-loft.webp`、`city-loft.avif` 及对应 `-poster` 文件 | `exec-7d9590a9-0b63-4ef1-84e1-1d9159324001.png` |
| 海边黄昏工作室 | `seaside-dusk.webp`、`seaside-dusk.avif` 及对应 `-poster` 文件 | `exec-40c467ed-5ce9-4b22-bdc9-6694c743dc1e.png` |
| 雪山云窗茶室 | `snow-tea.webp`、`snow-tea.avif` 及对应 `-poster` 文件 | `call_5FoTzAmWvJOmKQxHd8jNkMBI.png` |
| 古寺银杏书阁 | `temple-ginkgo.webp`、`temple-ginkgo.avif` 及对应 `-poster` 文件 | `call_EOgvJWPnboCTNgVHTahJDsi6.png` |
| 夜行山谷书厢 | `night-train.webp`、`night-train.avif` 及对应 `-poster` 文件 | `call_hB41mu14nmNy8IGR0Yt1jFpj.png` |
| 纸绘晨光课室 | `morning-classroom.webp`、`morning-classroom.avif` 及对应 `-poster` 文件 | `call_l7fhdL4KUwYq74ExIQUNwEid.png` |

生成提示词采用统一约束：16:9 响应式 PWA 场景背景、东方电影感概念插画、8K 级微细节、为计时器保留左侧或中央负空间、无人、无文字、无品牌、无水印、无界面元素。主题包括江南雨夜书房、晨雾竹院、深夜城市阁楼、海边黄昏工作室、雪山云窗茶室、古寺银杏书阁、夜行山谷书厢和纸绘晨光课室。雪山、古寺、列车与课室场景进一步要求为陶壶、香炉、茶杯、灯具与窗外区域保留明确锚点，静态母图不绘制蒸汽、落叶、雨痕或浮尘，以便运行时用 Canvas / CSS 生成可关闭的循环动效。

生成源文件保存在本地 Codex 生成目录中，不作为运行时资源发布。运行时优先使用 AVIF，并以 WebP 作为兼容回退；两种格式都按母图真实尺寸提供 1280、2560（适用场景）与原生分辨率主图，并保留低清占位图。

## 声音

音乐、雨、风、炉火、鸟鸣、海浪、城市底噪、算珠声和完成提示音均由 `src/audio/audioEngine.ts` 使用 Web Audio API 实时合成。仓库不包含第三方录音、采样包或音乐文件。

## 图标

- 应用图标 `public/icon.svg` 与 `public/icons/` 为本项目自制品牌图形。
- 界面线性图标来自 `lucide-react`，遵循 Lucide 的 ISC License。依赖版本记录在 `package.json` 与 `pnpm-lock.yaml`。

## 字体

应用仅声明系统字体栈，不打包或分发第三方字体文件。
