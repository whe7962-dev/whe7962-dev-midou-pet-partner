import { build } from 'esbuild';
await build({
  stdin: {
    contents: "export {draw,effect,frame,init,sampler,surface,target,uniforms} from 'vgpu';",
    resolveDir: process.cwd(), sourcefile: 'vgpu-entry.js'
  },
  outfile: 'dist/vendor/vgpu.js', bundle: true, format: 'esm', platform: 'browser',
  target: 'es2022', minify: true, legalComments: 'linked',
  banner: { js: '/*! vgpu 0.3.1 · Copyright 2025 Vercel, Inc. · MIT · see ../licenses/VGPU-LICENSE.txt */' }
});
