# 咪Dou · 宠拍档

白色主调的宠物品牌体验网站。首页以原创白绒毛猫咪素材演绎自动微距拉远、轻柔悬浮与缓慢视角跟随；无需播放、拖动或选择章节。

## 运行

纯静态 HTML / CSS / JavaScript，无 React 运行时、无 API 密钥。已附可直接托管的完整 `dist/`；部署无需安装依赖。

在项目根目录运行（新增 ES 模块互动需要 HTTP/HTTPS，不使用 `file://`）：

```sh
python3 -m http.server 4183 --directory dist
```

随后访问 `http://localhost:4183/`。

## 交互

- 自动微距拉远后进入缓慢悬浮与轻偏航，鼠标只提供平滑的视角偏移；手机无需操作。保留小型暂停入口以支持无障碍。
- 带阻尼回弹的磁吸按钮，触屏使用按压反馈。
- 中文标题按阅读顺序逐字入场。
- 跟随鼠标的卡片局部光晕与滚动视差。
- 五大能力切换、可见时自动轮播、暂停按钮和键盘导航。
- 首页紧凑展示核心用途与五个直达入口，五大能力紧接首屏；点击直达入口会选中对应能力，原生锚点在脚本禁用时仍可用。
- 精选两张用户提供的生活照，经 AI 清理背景与杂点后用于日常故事卡；问诊界面使用中性记录流程，不展示医疗诊断照片。
- 原生下载信息对话框、移动导航与角色热点说明。
- 尊重 `prefers-reduced-motion`，使用静态角色、完整文字，关闭自动轮播、视差和指针姿态变化。
- 离开开场或切到后台标签后暂停帧更新，返回时继续。
- AeroShards 珍珠白 / 冰蓝碎片场景：流动、环绕、丝带切换，靠近排斥、点击涟漪与长按聚拢。
- 碎片场景按需加载；WebGPU 不可用时切换轻量 Canvas 2D 版本，触屏滚动优先，支持暂停及减少动态偏好。
- 可选的轻量互动音效：默认关闭，主动开启后只响应必要点击，不对滚动、悬停或自动轮播发声，无背景音乐与外部音频请求。

## 测试

无需安装依赖，使用 Node.js 运行：

```sh
node --check dist/app.js
node --check dist/cinematic.js
node --test tests/*.test.cjs
```

测试覆盖首屏与碎片场景的生命周期、后台暂停、减少动态偏好、兼容降级、触屏滚动取消聚拢及音效开关。原 28 秒时间轴源码与回归测试仍保留，但不再由首页加载。测试验证脚本逻辑，不替代浏览器视觉与真实触屏检查。

## 动画实现与范围

当前首屏是单层透明图片驱动的 2.5D 网页动画，不是三维模型或逐帧视频。缓慢偏航、俯仰、缩放及阴影提供视角变化，避免多张猫脸叠加的重影。不会展示素材中不存在的真实侧面或背面；要获得连续三维转身与毛发动力学，需要替换为相应 3D 模型或成片视频。

文案中的产品角色及传感场景是品牌概念展示。页面里的 App UI 为功能示意，没有连接问诊后端或实际安装包。下载按钮会展示明确的待开放提示。

## 文件

```text
dist/
  index.html         页面结构
  styles.css         响应式与交互样式
  hero-motion.js     自动慢镜头与指针姿态
  cinematic.js       保留的旧版 28 秒时间轴（首页不加载）
  aero-*.js/css      碎片互动、兼容渲染与控制器
  interaction-sound.js 可选的 Web Audio 音效
  app.js             按钮、文字、光晕、导航与能力交互
  assets/            原创生成的白猫素材
.github/workflows/
  pages.yml          GitHub Pages 自动发布
ASSET-PROMPTS.md     素材提示词与来源记录
LICENSE             MIT
```

## GitHub Pages

在仓库 **Settings → Pages → Build and deployment** 中，选择 **GitHub Actions**。推送至 `main` 后，工作流会先运行测试，再将 `dist/` 作为静态站点部署；也支持在 Actions 页面手动运行。

仓库：[whe7962-dev/whe7962-dev-midou-pet-partner](https://github.com/whe7962-dev/whe7962-dev-midou-pet-partner)。
部署成功后的预期地址：`https://whe7962-dev.github.io/whe7962-dev-midou-pet-partner/`。

全部资源使用相对路径，兼容 `username.github.io/repository/` 子目录托管。部署只上传 `dist/`，不包含本地配置、历史参考图片或任何凭据。

## 许可与素材

本项目原创源码、文档及生成素材按 [MIT License](LICENSE) 开源（在作者有权许可的范围内），但不替代下列第三方文件的许可。`dist/assets/` 中三张白猫图片由内置 ImageGen 为本项目生成；完整提示词及尺寸见 [ASSET-PROMPTS.md](ASSET-PROMPTS.md)。本次公开目录不包含旧版网站的电影截图或私有托管配置。许可不授予项目名称、品牌名称的商标权。

`dist/assets/daily-curiosity.png` 与 `daily-comfort.png` 是用户提供照片的 AI 编辑版本，不适用项目 MIT 许可。原图权利未核验，二次使用前需自行确认许可；编辑提示词与来源见 [ASSET-EDITS.md](ASSET-EDITS.md)。

### 第三方许可例外

- `dist/aero-shards.js` 改编自 David Haz / React Bits 的 [AeroShards](https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/AeroShards/AeroShards.jsx)，保留着色器与交互逻辑，改为原生 JS 生命周期；采用上游 **MIT + Commons Clause**，不是本项目的纯 MIT 许可。完整条款见 [REACT-BITS-LICENSE.txt](dist/licenses/REACT-BITS-LICENSE.txt)。该文件仅随完整网站集成发布，不作为独立组件库提供。
- `dist/vendor/vgpu.js` 为固定 `vgpu@0.3.1` 的本地浏览器 bundle，MIT 许可，Copyright 2025 Vercel, Inc.；见 [VGPU-LICENSE.txt](dist/licenses/VGPU-LICENSE.txt)。保留 bundle 附带的其他法律注释。
- `dist/aero-fallback.js` 为本项目独立编写的轻量兼容渲染器。

网站不从 CDN 加载脚本。只有重新生成依赖 bundle 时，才需要运行 `pnpm install --frozen-lockfile` 和 `pnpm run vendor`；日常预览、编辑与 Pages 部署不需要构建。
