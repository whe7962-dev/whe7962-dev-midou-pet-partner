# 咪Dou · 宠拍档

白色主调的宠物品牌体验网站。首页以原创白绒毛猫咪素材编排 28 秒开场，包含微距推进、全身揭示、悬浮转向、口袋场景和群组互动。

## 运行

纯静态 HTML / CSS / JavaScript，无框架、无构建依赖、无 API 密钥。

直接打开 `dist/index.html`，或在项目根目录运行：

```sh
python3 -m http.server 4183 --directory dist
```

随后访问 `http://localhost:4183/`。

## 交互

- 28 秒可暂停、拖动和重播的镜头时间轴，以及五个章节入口。
- 带阻尼回弹的磁吸按钮，触屏使用按压反馈。
- 中文标题按阅读顺序逐字入场。
- 跟随鼠标的卡片局部光晕与滚动视差。
- 五大能力切换、可见时自动轮播、暂停按钮和键盘导航。
- 原生下载信息对话框、移动导航与角色热点说明。
- 尊重 `prefers-reduced-motion`，默认静态角色、完整文字、关闭自动轮播与视差；用户可主动播放开场。
- 离开开场或切到后台标签后暂停帧更新，返回时继续。

## 测试

无需安装依赖，使用 Node.js 运行：

```sh
node --check dist/app.js
node --check dist/cinematic.js
node --test tests/cinematic.test.cjs
```

测试覆盖桌面与手机时间轴、全片正反跳转、场景边界、终场留白、资源失败、后台暂停以及减少动态偏好。它验证脚本逻辑，不替代浏览器视觉与真实触屏检查。

## 动画实现与范围

这是多角度透明图片驱动的网页动画，不是三维模型或逐帧渲染视频。角色图像的缩放、位移、透视、视角切换、阴影与群组遮挡根据时间轴实时计算；绒毛压缩、手部取出和身体回弹采用视觉近似。要获得连续三维转身、独立毛发动力学及真实手部交互，需要替换为相应 3D 模型或成片视频。

文案中的产品角色及传感场景是品牌概念展示。页面里的 App UI 为功能示意，没有连接问诊后端或实际安装包。下载按钮会展示明确的待开放提示。

## 文件

```text
dist/
  index.html         页面结构
  styles.css         响应式与交互样式
  cinematic.js       28 秒镜头时间轴
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

本仓库源码、文档及随附的生成素材按 [MIT License](LICENSE) 开源（在作者有权许可的范围内）。`dist/assets/` 中三张白猫图片由内置 ImageGen 为本项目生成；完整提示词及尺寸见 [ASSET-PROMPTS.md](ASSET-PROMPTS.md)。本次公开目录不包含旧版网站的电影截图或私有托管配置。许可不授予项目名称、品牌名称的商标权。
