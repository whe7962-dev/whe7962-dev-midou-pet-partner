# Gallery B — user-provided photos edited with AI

## Scope and license exception

These two photos were provided by the user and edited with the built-in imagegen tool on 2026-09-25. They are edited derivatives, not newly photographed originals and not clinical or diagnostic evidence. Source ownership, photographer identity, and permission for public/commercial redistribution have not been independently verified.

**These images are not covered by the repository's MIT license.** AI cleanup does not establish ownership of the source photographs or remove any underlying rights. Reuse or redistribution requires the relevant source permission. No stock-library-watermarked reference was used.

Only the two explicitly selected source files below were used. Each received one independent built-in imagegen edit after visual inspection. Outputs were copied unchanged into `dist/assets/`; no additional image transformation or code changes were performed as part of this gallery task.

## Deliverables

| File | Dimensions | Source supplied by user | Edit |
| --- | --- | --- | --- |
| `dist/assets/daily-play.png` | 1536 × 1024 (3:2) | `codex-clipboard-c4ee0150-f1dc-4c1d-b620-d4dac4a91fe3.webp` | Preserve monochrome cat identity and forward-reaching paw perspective; clean specks/compression and simplify the existing background. |
| `dist/assets/daily-hideaway.png` | 1536 × 1024 (3:2) | `codex-clipboard-21ff4055-71a2-4f6f-b8e4-3ea2f091fcff.jpg` | Preserve black cat identity, amber eyes, furniture gap and hiding posture; remove specks/compression and modestly recover shadow detail. |

## Visual inspection notes

- `daily-play.png`: one black-and-white cat, a single enlarged softly defocused foreground paw, original face markings and playful gaze, natural tabletop/contact shadow. No extra cat, person, prop, text or medical content.
- `daily-hideaway.png`: one black cat under a horizontal furniture edge, both amber eyes visible, black fur retained, floor and furniture simplified without removing the hiding context. No added paws, people, objects, text or medical content.
- These are generative edits, not pixel-identical photographic restorations. Fine fur and surface detail may be synthesized; they should be presented as AI-edited lifestyle imagery.

## Full prompt — daily-play.png

```text
Use case: identity-preserve
Asset type: edited user-provided lifestyle photograph for a pet website gallery.
Input images: Image 1 is the sole EDIT TARGET, not a loose reference.
Primary request: Clean this exact black-and-white documentary cat photograph, preserving the same cat, face, eye expression, markings and reaching-paw pose. Remove small dust specks and compression noise; make the background clean and simple without changing the scene.
Composition/framing: Horizontal 3:2 photograph, 1536 by 1024 pixels. Preserve the strong near-large/far-small perspective: the one front paw reaches toward the lens and is much larger and softly out of focus in the foreground, while the cat face and ears remain behind it. Keep the table edge and the natural contact shadow; minimally extend or reframe the existing background to achieve 3:2, do not amputate the paw or ears.
Style/medium: Photorealistic monochrome documentary photograph. Preserve natural fur texture, original grayscale tonality, shallow focus and spontaneous playful expression. Retain soft foreground paw blur rather than inventing crisp toes.
Constraints: Change only image cleanliness, restrained tonal clarity and the minimum background extent needed for the horizontal frame. Do not redesign the cat, alter its expression, change the anatomy or add limbs. Do not colorize. No extra cats, people, hands, toys or objects. No medical imagery. No added text, labels, logos or watermarks. Opaque image, not a transparent cutout.
```

## Full prompt — daily-hideaway.png

```text
Use case: identity-preserve
Asset type: edited user-provided lifestyle photograph for a pet website gallery.
Input images: Image 1 is the sole EDIT TARGET, not a loose reference.
Primary request: Clean this exact photograph of the black cat peeking out from beneath furniture. Preserve the same cat identity, round amber-gold eyes, dark pupils, facial proportions, ears, whiskers, head position and low hiding posture. Reduce small specks and compression artifacts and simplify distracting tiny debris on the existing floor and furniture.
Scene/backdrop: Keep the low horizontal furniture edge above the cat and the floor immediately beneath the cat; it must still clearly be hiding beneath furniture, not an isolated studio portrait. Keep furniture and floor plain, believable and understated.
Composition/framing: Horizontal 3:2 photograph, 1536 by 1024 pixels. Preserve the close low eye-level framing with the face and both eyes clearly visible through the dark gap. Make only the minimal framing extension or crop necessary for the horizontal ratio.
Lighting/mood: Gently lift deep shadow detail enough to reveal natural fur and the nose, while preserving the dark cozy hiding place, genuine black fur, warm amber eye color and existing soft natural light. Do not turn black fur gray, white or brown; do not make the scene brightly lit.
Style/medium: Photorealistic natural cat photograph, restrained cleanup, real fine fur and whiskers. Preserve the original alert, curious expression without making the eyes cartoonishly larger.
Constraints: Change only cleanup, modest tonal recovery and minimum framing adjustment. Do not replace this cat, change its pose, add visible paws, redesign its face or change its eye color. No additional cats, people, hands, toys or objects. No medical imagery. No added text, labels, logos or watermarks. Opaque image, not a transparent cutout.
```

