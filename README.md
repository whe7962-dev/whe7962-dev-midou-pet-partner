# 宠拍档

白色主调的科学养宠品牌体验网站，首页以“科学养宠，有宠拍档”为主题，展示快速问诊、疾病咨询、营养方案、养宠百科与文字提取五大能力。宠拍档是产品品牌；咪Dou 仅作为白绒毛陪伴角色，不是产品名称或真实医疗设备。

首屏使用原创角色素材演绎自动微距拉远、轻柔悬浮与缓慢视角跟随，并加入低密度冰蓝碎片背景与克制的标题动态；无需播放、拖动或选择章节。

## 运行

纯静态 HTML / CSS / JavaScript，无 React 运行时、无 API 密钥。已附可直接托管的完整 `dist/`；部署无需安装依赖。

在项目根目录运行（新增 ES 模块互动需要 HTTP/HTTPS，不使用 `file://`）：

```sh
python3 -m http.server 4183 --directory dist
```

随后访问 `http://localhost:4183/`。

## 交互

- 自动微距拉远后进入缓慢悬浮与轻偏航，鼠标只提供平滑的视角偏移；手机无需操作。保留小型暂停入口以支持无障碍。
- 首屏 AeroShards 使用低密度、低对比度碎片作为文字与角色后方的装饰背景；保留后方三张内容卡的独立背景实例，不新增独立展示屏。
- 白猫角色带有轻微呼吸、横移和不定时眨眼。眨眼只显示两块羽化眼部蒙版，不交叉淡入整张猫脸；素材失败时保留原来的睁眼角色。
- 带阻尼回弹的磁吸按钮，触屏使用按压反馈。
- 首屏“科学养宠，有宠拍档。”按阅读顺序逐字入场，随后轻微呼吸；精细指针靠近时提供柔和反馈，触屏不依赖悬停。其他中文标题保留逐字入场。
- 跟随鼠标的卡片局部光晕与滚动视差。
- 五大能力切换、可见时自动轮播、暂停按钮和键盘导航。
- 首页紧凑展示核心用途与五个直达入口，五大能力紧接首屏；点击直达入口会选中对应能力，原生锚点在脚本禁用时仍可用。
- 七张用户提供的生活照，经 AI 清理背景、杂点或适度调整曝光后用于日常故事卡；配图不代表问诊、诊断或疗效，问诊界面使用中性记录流程，不展示医疗诊断照片。
- 图库说明叠放在照片底部的深海军蓝渐变上，标题与完整说明常驻可读，不依赖悬停显示；桌面悬停有轻缩放与微倾斜，触屏使用按压反馈，减少动态偏好下保持静态。
- 顶部、移动导航与底部“遇见你的宠拍档”入口使用原生链接，在新窗口打开 [官方入口](https://www.foresightx.com.cn)，并设置 `noopener noreferrer`；移动导航与角色热点说明保留。
- 首屏暂停入口联动角色、首屏碎片与标题动态；后方三卡背景保留自己的暂停入口。
- 尊重 `prefers-reduced-motion`，使用静态角色、完整文字与静态装饰，关闭眨眼、呼吸、标题位移、自动轮播、视差和指针动态反馈。
- 离开开场或切到后台标签后暂停帧更新，返回时继续。
- AeroShards 珍珠白 / 冰蓝微光作为“宠语翻译、情绪识别、多智能体管家”三张内容卡的背景，与正文处于同一内容区；不再占用独立展示屏，也不提供形态切换工具栏。
- 碎片背景按需加载，保留轻量指针反馈；WebGPU 不可用时切换 Canvas 2D 兼容版本，触屏滚动优先，支持暂停及减少动态偏好。
- 可选的轻量互动音效：默认关闭，主动开启后只响应必要点击，不对滚动、悬停或自动轮播发声，无背景音乐与外部音频请求。

## 测试

无需安装依赖，使用 Node.js 运行：

```sh
node --check dist/app.js
node --check dist/hero-motion.js
node --check dist/hero-background.js
node --check dist/hero-title.js
node --check dist/gallery-motion.js
node --check dist/cat-life.js
node --check dist/cinematic.js
node --test tests/*.test.cjs
```

测试覆盖首屏角色、标题与碎片背景的生命周期、暂停、减少动态偏好、兼容降级、触屏滚动取消聚拢及音效开关；图库测试覆盖事件驱动帧更新、指针边界、触屏不拦截滚动、后台与离屏复位、页面往返缓存恢复和资源清理。静态结构检查覆盖品牌、首屏功能入口、七张照片及常显说明、资源引用、唯一 ID，以及首屏与三卡背景同时存在的布局。原 28 秒时间轴源码与回归测试仍保留，但不再由首页加载。测试验证脚本逻辑与结构，不替代浏览器视觉、文字可读性、眼部蒙版对齐和真实触屏检查。

## 动画实现与范围

当前角色是透明图片与局部眼部蒙版驱动的 2.5D 网页动画，不是三维模型或逐帧视频。缓慢偏航、俯仰、缩放、呼吸、位移及阴影提供视觉变化；眨眼采用 AI 编辑的闭眼关键帧局部覆盖，并非真实眼睑或毛发模拟。不会展示素材中不存在的真实侧面或背面；要获得连续三维转身与毛发动力学，需要替换为相应 3D 模型或成片视频。

咪Dou、背景动效与内容卡是品牌或功能概念展示，不代表实体传感器或已验证的诊疗能力。页面里的 App UI 为功能示意，没有连接问诊后端，也不直接提供实际安装包。三个“遇见你的伙伴／宠拍档”入口均跳转至用户指定的 [官方入口](https://www.foresightx.com.cn)，不经过本页弹窗；外部网站的服务、下载方式与内容以其实际页面为准。

## 文件

```text
dist/
  index.html         页面结构
  styles.css         响应式与交互样式
  front-experience.css 品牌、首屏入口、图库与内容背景布局
  hero-motion.js/css 自动慢镜头与指针姿态
  hero-background.js 首屏低密度 AeroShards 背景控制器
  hero-title.js/css  首屏标题逐字、轻呼吸与指针反馈
  gallery-motion.js/css 图库说明叠层、轻微悬停与触屏按压反馈
  cat-life.js/css    白猫局部眨眼、呼吸与轻微位移
  cinematic.js       保留的旧版 28 秒时间轴（首页不加载）
  aero-*.js/css      内容卡碎片背景、兼容渲染与控制器
  interaction-sound.js 可选的 Web Audio 音效
  app.js             按钮、文字、光晕、导航与能力交互
  assets/            白猫角色/闭眼素材与七张 AI 编辑生活照
.github/workflows/
  pages.yml          GitHub Pages 自动发布
ASSET-PROMPTS.md     三张原始角色素材提示词与来源
ASSET-BLINK.md       闭眼关键帧与局部蒙版说明
ASSET-EDITS.md       两张生活照的编辑与权利说明
ASSET-GALLERY-A.md   三张生活照的编辑与权利说明
ASSET-GALLERY-B.md   两张生活照的编辑与权利说明
LICENSE             原创部分 MIT；第三方及照片例外见下文
```

## GitHub Pages

在仓库 **Settings → Pages → Build and deployment** 中，选择 **GitHub Actions**。推送至 `main` 后，工作流会先运行测试，再将 `dist/` 作为静态站点部署；也支持在 Actions 页面手动运行。

仓库：[whe7962-dev/whe7962-dev-midou-pet-partner](https://github.com/whe7962-dev/whe7962-dev-midou-pet-partner)。
部署成功后的预期地址：`https://whe7962-dev.github.io/whe7962-dev-midou-pet-partner/`。

全部资源使用相对路径，兼容 `username.github.io/repository/` 子目录托管。部署只上传 `dist/`，包含七张生活照的 AI 编辑版，但不包含用户原始附件、本地私有配置或任何凭据。

## 许可与素材

本项目原创源码、文档与原创生成角色素材按 [MIT License](LICENSE) 开源（在作者有权许可的范围内），但不替代下列第三方文件或用户照片的许可。许可不授予项目名称、品牌名称的商标权。

角色素材 `midou-front.png`、`midou-views.png`、`midou-pocket.png` 由内置 ImageGen 为本项目生成，提示词及尺寸见 [ASSET-PROMPTS.md](ASSET-PROMPTS.md)。`midou-blink.png` 是从正面角色生成的闭眼关键帧，方法、提示词、局部蒙版与限制见 [ASSET-BLINK.md](ASSET-BLINK.md)。

### 七张用户照片的权利例外

以下 `dist/assets/` 图片均为用户提供照片的 AI 编辑版本，**不适用本项目 MIT 许可**：

- `daily-curiosity.png`、`daily-comfort.png`：见 [ASSET-EDITS.md](ASSET-EDITS.md)。
- `daily-mealtime.png`、`daily-window.png`、`daily-sunshine.png`：见 [ASSET-GALLERY-A.md](ASSET-GALLERY-A.md)。
- `daily-play.png`、`daily-hideaway.png`：见 [ASSET-GALLERY-B.md](ASSET-GALLERY-B.md)。

原始照片作者、版权归属以及公开或商业使用许可均未独立核验。AI 清理不构成原图权利的转让或清除，公开托管也不授予他人再使用许可；发布、复用或再分发前应确认必要的源照片授权。它们不是原创摄影、自由授权图库或医疗诊断证据；生成式编辑可能改变局部细节，不能当作逐像素无损修复。以上文档记录完整提示词与来源，未使用带图库水印的参考图。

### 第三方许可例外

- `dist/aero-shards.js` 改编自 David Haz / React Bits 的 [AeroShards](https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/AeroShards/AeroShards.jsx)，保留着色器与交互逻辑，改为原生 JS 生命周期；采用上游 **MIT + Commons Clause**，不是本项目的纯 MIT 许可。完整条款见 [REACT-BITS-LICENSE.txt](dist/licenses/REACT-BITS-LICENSE.txt)。该文件仅随完整网站集成发布，不作为独立组件库提供。
- `dist/vendor/vgpu.js` 为固定 `vgpu@0.3.1` 的本地浏览器 bundle，MIT 许可，Copyright 2025 Vercel, Inc.；见 [VGPU-LICENSE.txt](dist/licenses/VGPU-LICENSE.txt)。保留 bundle 附带的其他法律注释。
- `dist/aero-fallback.js` 为本项目独立编写的轻量兼容渲染器。

网站不从 CDN 加载脚本。只有重新生成依赖 bundle 时，才需要运行 `pnpm install --frozen-lockfile` 和 `pnpm run vendor`；日常预览、编辑与 Pages 部署不需要构建。
