# Website photo edits

## 来源与授权边界

这两张照片均由用户提供，本次使用内置 image_gen 工具进行 AI 清理、背景调整和轻度曝光修正。原始照片的作者、版权归属及商业使用许可未核验；AI 编辑不构成原图权利的转让或清除。它们不因本项目代码采用 MIT 许可而自动获得 MIT 授权，不应冒称为原创摄影或自由授权图库素材。对外发布前，请确认已取得原照片权利人的适当许可。

未处理或移除图库水印，未覆盖用户原始文件；本次不采用其他带水印的图像。

## daily-curiosity.png

- 项目文件：`dist/assets/daily-curiosity.png`
- 输出：PNG，1536 × 1024，横向 3:2。
- 来源：用户上传 `codex-clipboard-a382f6d2-b3ae-4da6-8f3d-d0f1f095344a.jpg`。
- 编辑：灰猫低角度近景，保留向上看的表情、眼睛与灰色毛发，清理杂点和压缩噪点，背景改为淡冷白。
- 方法：内置 image_gen，独立编辑调用；非 CLI/API 后备流程。
- 检查：已检查工具输出，圆脸、黄色眼睛、向上视线与低角度构图保留；无文字与新增物件。生成式编辑可能存在局部细节变化，不是逐像素无损修复。

### 使用的最终提示词

```text
Use case: identity-preserve
Asset type: 3:2 horizontal photograph for a compact daily-story card on a white pet-care website.
Input images: Image 1 is the edit target, a gray round-faced cat photographed from a low angle looking upward.
Primary request: Carefully retouch this actual photograph. Clean background specks and JPEG compression noise, replace only the backdrop with very pale cool white, and preserve the real cat.
Subject invariants: Keep the same round face, golden-yellow eyes, pupils, upward curious gaze, black nose, whiskers, ears, facial proportions and original expression. Preserve natural gray fur texture and fine hair edges; do not beautify it into a different cat or a 3D character.
Composition/framing: Retain the low-angle close-up with the face filling the lower part of the frame and some clean air above the ears; horizontal aspect ratio 3:2, natural crop, no extra body or scene objects.
Lighting/mood: Soft natural bright photographic light with gentle contrast; the gray fur must remain gray and detailed.
Constraints: Change only background cleanliness and gentle noise/lighting correction, preserving pose and identity. No text, no added props, no logos, no graphic overlay, no watermark addition.
```

## daily-comfort.png

- 项目文件：`dist/assets/daily-comfort.png`
- 输出：PNG，1536 × 1024，横向 3:2。
- 来源：用户上传 `codex-clipboard-9bdf542e-7acf-494b-bca2-c566aaefcc83.jpg`。
- 编辑：白猫侧躺照片，保留侧躺姿态、脸部方向与放松表情，清理背景和暗部噪点，使用自然柔光及淡灰白床垫背景。
- 方法：内置 image_gen，独立编辑调用；非 CLI/API 后备流程。
- 检查：已检查工具输出，侧躺构图、白色毛发和脸部朝向保留，床垫纹理与接触阴影自然；无文字与新增物件。生成式编辑可能存在局部细节变化，不是逐像素无损修复。

### 使用的最终提示词

```text
Use case: identity-preserve
Asset type: 3:2 horizontal photograph for a daily-life comfort story card on a white pet-care website.
Input images: Image 1 is the edit target, a white cat lying on its side in a dark indoor photograph.
Primary request: Carefully retouch this actual photo. Remove distracting dark background clutter and compression/shadow noise, replace the surface and background with a simple light gray-white fabric mattress, and moderately brighten the lighting into soft natural window light.
Subject invariants: Keep exactly the same white cat, sideways lying pose, head tilt, relaxed facial expression, dark pupils, pink nose, ear shape, whiskers, face proportions, extended front legs, body orientation and silhouette. Preserve realistic fine white fur and the original recognizable face, not a new cat or a plush toy.
Composition/framing: Retain the close side-lying composition, face on the left and body extending right, horizontal aspect ratio 3:2. Keep the natural relaxed pose and believable contact with the bedding.
Lighting/mood: Quiet, natural, gentle bright soft light with soft contact shadows; neutral white and very light cool gray palette, not blown-out white, not a glossy studio render.
Constraints: Change only background, surface cleanliness, image noise and moderate exposure. Do not add objects, people, text, logos, graphics or watermark. Preserve anatomy and pose; no extra paws or facial changes.
```

