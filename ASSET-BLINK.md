# White-cat blink asset

Asset: `dist/assets/midou-blink.png`

Generated with the built-in image_gen editing tool from `dist/assets/midou-front.png`. This is an AI-created expression keyframe, not a real animal photograph or a 3D model.

## Prompt

```text
Use case: precise-object-edit
Asset type: closed-eye blink keyframe for a website character animation.
Input image 1 is the exact edit target: the existing white fluffy cat cutout.
Primary request: change ONLY BOTH EYES from open to naturally and gently fully closed. Delicate curved closed eyelids, like one relaxed blink. No smile change.
Preserve invariants with strict pixel registration: same 1280x1280 square canvas, same full-body frontal character, exactly the same head position, head outline, ear position, nose position, muzzle, whiskers, white fur texture, paws, proportions, lighting, scale, framing, and margins. Do not move, rotate, resize, or redraw the cat. The output must overlay the original without a positional jump.
The open eyes are centered approximately at x=487,y=486 and x=775,y=486 on the 1280x1280 source. Edit only those small eye neighborhoods; keep all other pixels visually unchanged.
Scene/backdrop: preserve genuine transparent alpha background, not white, black, or checkerboard. Return a transparent PNG.
Avoid: text, extra objects, accessories, head tilt, changed face, changed nose, different fur tone, altered silhouette, wide smile, whole-face redesign.
```

## Validation and integration

- Both original and edited PNGs are 1254 × 1254 with genuine alpha. The prompt requested the reference composition at 1280 square, but the tool preserved the original 1254-square dimensions.
- Inspected original and edited images: eyes closed naturally; nose, mouth, head pose, and full-body framing remain aligned. The generated image contains some fur/silhouette drift, so it is never used as a full-face or full-body replacement.
- Original dark eye bounds: left (414,414)–(551,548), right (710,416)–(847,549). Edited closed eyelid bounds: left (401,489)–(548,524), right (711,491)–(848,525). These measurements define two local feathered masks centered at (38.3%,38.6%) and (61.9%,38.6%), radii (8.2%,8.5%). The masks cover the original eyes while excluding the nose and silhouette.
- Only masked eye patches appear for 290 ms. There is no whole-face crossfade, image stretching, or overlaid open/closed eyes. Irregular intervals are 4.8–8.4 seconds of visible active time; offscreen/background time does not advance the clock.
- CSS mask registration follows each original image's actual contain rectangle (or the Hero background sizing). Original images keep their DOM layout, CSS transforms, and scroll-depth offset.
- Reduced motion, Hero pause, hidden pages, and offscreen subjects suppress motion and blinking. Missing blink asset leaves original open-eyed images intact.

