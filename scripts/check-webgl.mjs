import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c width=64 height=64></canvas>');
const info = await page.evaluate(() => {
  const gl = document.getElementById('c').getContext('webgl2');
  if (!gl) return 'NO WEBGL2';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), version: gl.getParameter(gl.VERSION) };
});
console.log(JSON.stringify(info));
await browser.close();
