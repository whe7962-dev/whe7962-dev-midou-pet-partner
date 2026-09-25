# 生活照片清理记录 · Gallery A

## 来源与授权边界

以下三张图片由用户提供，本次使用内置 image_gen 工具分别进行 AI 编辑：清理背景杂物和压缩噪点、适度调整曝光，以适配白色主调网站。原始照片作者、版权归属及商业使用许可尚未核验；本记录不作任何权利清理或已获授权的声明。

图片及其 AI 编辑版不自动适用本项目代码的 MIT 许可，不应标注为原创摄影、无版权素材或可自由再分发图库。上线或再分发前，应确认已获得必要的原照片使用许可。未覆盖原图，未处理或移除图库水印。这些是生活场景展示图，不是诊疗照片或诊断证据。

## 交付与检查

三张输出均为 PNG、1536 × 1024 像素、横向 3:2。已查看每张原图并检查生成结果，确认无新增文字、标识、人物或额外动物。生成式编辑可能改变细小纹理，不能视为逐像素无损修复。

### daily-mealtime.png

- 项目路径：`dist/assets/daily-mealtime.png`
- 原图：用户提供 `codex-clipboard-56116a4b-b9ad-4693-9138-b096ffbd48d2.jpg`。
- 保留：虎斑猫进食姿态、尾巴弧度、项圈、食碗与托垫，自然摄影风格。
- 清理：背景杂物、压缩噪点，适度提亮为浅色中性室内。
- 方式：内置 image_gen 独立编辑调用，未使用 CLI 或 Python 图片编辑。

最终提示词：

```text
Use case: identity-preserve
Asset type: landscape 3:2 daily-life gallery photo for a clean white pet-care website, no medical context.
Input images: Image 1 is the edit target: a stocky dark tabby cat leaning toward a black food bowl, with a smaller brown bowl on a feeding mat.
Primary request: Retouch this supplied photograph gently. Remove distracting background clutter and compression noise, moderately brighten exposure into a light neutral interior while preserving a real, candid mealtime photograph.
Preserve: Exactly the same cat identity, tabby pattern, facial expression, downward gaze, eating stance, tail curve, paws, collar, black bowl, smaller bowl and feeding mat. Keep their relative positions and natural scale; keep fine fur texture and believable contact shadows.
Composition/framing: Horizontal 3:2, cat and feeding bowls remain visible in the original side-on low viewpoint. Extend clean pale neutral background if needed to achieve the aspect ratio; no new objects.
Lighting/mood: Soft natural window light, neutral pale walls/floor and subdued out-of-focus background. The dark tabby remains dark tabby, with visible fur detail rather than a recolored coat.
Constraints: Change only clutter, noise and gentle exposure/background cleanup. No text, logo, watermark addition, people, extra animals, extra limbs, product labels or clinical styling.
```

### daily-window.png

- 项目路径：`dist/assets/daily-window.png`
- 原图：用户提供 `codex-clipboard-1ac8ed23-6810-419a-84ec-26ae9ce4cadd.jpg`。
- 保留：窗后橘猫坐姿、表情、窗框和雨滴气氛。
- 清理：玻璃与窗框泥污、多余背景杂物，适度提亮冷中性色。
- 方式：内置 image_gen 独立编辑调用，未使用 CLI 或 Python 图片编辑。

最终提示词：

```text
Use case: identity-preserve
Asset type: landscape 3:2 quiet daily-life gallery photo for a clean white pet-care website, no medical context.
Input images: Image 1 is the edit target: an orange tabby sitting behind a large window, looking through rain-speckled glass, with window frame in view.
Primary request: Carefully retouch this supplied photograph. Remove distracting mud smears and dirt on the glass and frame, simplify extraneous background clutter, and gently brighten exposure into a cool neutral rainy-day photograph. Keep visible clean raindrops and the window atmosphere rather than erasing all glass texture.
Preserve: The very same orange cat identity, original sitting pose, eye shape, expression, ears, whiskers, face/body proportions and fur markings. Keep the window frame structure, glass plane, perspective and quiet rainy mood.
Composition/framing: Horizontal 3:2, cat remains behind the window in the original relative placement with the frame visibly enclosing the view. Natural photographic framing, not a floating cutout.
Lighting/mood: Soft cool-neutral daylight with natural muted orange fur, gentle contrast and enough brightness to read the cat's face; not sterile white or oversaturated teal.
Constraints: Change only dirt, clutter, compression noise and gentle exposure. No added objects, people, extra animals, text, logo or watermark addition. Do not alter the cat's anatomy or expression.
```

### daily-sunshine.png

- 项目路径：`dist/assets/daily-sunshine.png`
- 原图：用户提供 `codex-clipboard-3348ec05-0cb1-41bd-8156-581849067457.jpg`。
- 保留：猫咪坐姿、向左的侧脸表情、金色侧光与毛发轮廓。
- 清理：人腿、汽车和街道杂物，替换为简洁自然的浅色庭院背景。
- 方式：内置 image_gen 独立编辑调用，未使用 CLI 或 Python 图片编辑。

最终提示词：

```text
Use case: identity-preserve
Asset type: landscape 3:2 daily-life gallery photograph for a clean white pet-care website, no medical context.
Input images: Image 1 is the edit target: a pale cream cat sitting next to a gate, facing left in beautiful golden side light, with distracting human legs, cars and street background.
Primary request: Retouch this supplied photograph. Remove the human legs, all cars and distracting street clutter behind the cat; replace only that background with a simple natural pale outdoor courtyard, with a subtle clean wall/path and soft greenery at a distance. Clean compression noise while retaining photographic texture.
Preserve: The same cat identity, cream and gray markings, exact sitting pose, left-facing profile, squinting content expression, ears, whiskers, body proportions and paws. Preserve the golden rim/side sunlight outlining the fur and the natural cast shadow. Keep a simple gate edge if needed to preserve the original composition, but make surroundings uncluttered.
Composition/framing: Horizontal 3:2, low natural viewpoint, cat seated on the right as in the source and open courtyard space to the left. Do not crop off the head or alter the pose.
Lighting/mood: Warm late-afternoon gold on the cat against a bright neutral pale courtyard, photographic and relaxed, softly blurred background, not an artificial white studio.
Constraints: Change only background clutter, noise and gentle exposure. Do not introduce people, extra animals, props, text, logos, watermark or extra limbs. Preserve the cat's face and fur details.
```

