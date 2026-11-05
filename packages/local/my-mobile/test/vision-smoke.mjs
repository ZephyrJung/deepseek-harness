/**
 * Vision plumbing smoke test.
 *
 * The vision loop is only as good as the image that reaches the model: it must
 * be downscaled to the configured width, encoded as JPEG, and carry the real
 * device geometry so relative coordinates still map onto the screen. This test
 * pins that — PNG header parsing, the ffmpeg downscale, and the prompts that
 * tell the model how to give coordinates.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { __planner } from '../index.js';

const { toModelJpeg, pngSize, AGENT_SYSTEM, PLANNER_VISION_ADDENDUM } = __planner;

/* ---------- geometry from the PNG header ---------- */
const header = Buffer.alloc(33);
Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
header.writeUInt32BE(13, 8);
header.write('IHDR', 12, 'ascii');
header.writeUInt32BE(1080, 16);
header.writeUInt32BE(2340, 20);
assert.deepEqual(pngSize(header), { width: 1080, height: 2340 }, 'IHDR should yield the device size');
assert.equal(pngSize(Buffer.alloc(10)), null, 'a short buffer is not a PNG');
assert.equal(pngSize(Buffer.alloc(40)), null, 'a header without IHDR is not a PNG');

/* ---------- real downscale through ffmpeg ---------- */
const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
if (!hasFfmpeg) {
  console.log('SKIP ffmpeg downscale (ffmpeg not on PATH)');
} else {
  const dir = mkdtempSync(join(tmpdir(), 'my-mobile-vision-'));
  try {
    const png = join(dir, 'screen.png');
    const made = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=#204080:s=1080x2340', '-frames:v', '1', png,
    ], { stdio: 'ignore' });
    assert.equal(made.status, 0, 'ffmpeg could not render a test PNG');
    const source = readFileSync(png);

    const shot = await toModelJpeg(source, 720);
    assert.equal(shot.width, 720, 'downscale should hit the configured width');
    assert.equal(shot.height, 1560, 'aspect ratio must be preserved (1080x2340 -> 720x1560)');
    assert.deepEqual(shot.source, { width: 1080, height: 2340 });
    assert.equal(shot.jpeg[0], 0xff, 'output should be a JPEG');
    assert.equal(shot.jpeg[1], 0xd8, 'output should be a JPEG');
    assert(shot.jpeg.length > 1000, 'JPEG should not be empty');
    /* A flat test image compresses to almost nothing as PNG, so compare
       against the request budget rather than the source size: a real
       1080x2340 screenshot (~2.4 MB PNG) lands around 140 KB here. */
    assert(shot.jpeg.length < 500 * 1024, 'encoded payload should stay well under the route body limit');

    /* a cap wider than the device must not upscale */
    const native = await toModelJpeg(source, 4000);
    assert.equal(native.width, 1080, 'never upscale beyond the source width');
    assert.equal(native.height, 2340, 'even height when the width is untouched');

    await assert.rejects(() => toModelJpeg(Buffer.alloc(64), 720), /不是合法的 PNG/u);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ---------- prompts ---------- */
assert(PLANNER_VISION_ADDENDUM.includes('截图'), 'vision addendum should reference the attached screenshot');
assert(PLANNER_VISION_ADDENDUM.includes('0~1'), 'vision addendum should state the coordinate convention');
assert(AGENT_SYSTEM.includes('{"done":true'), 'agent prompt should document the done shape');
assert(AGENT_SYSTEM.includes('一次只做一个动作'), 'agent prompt should require exactly one action per round');
assert(AGENT_SYSTEM.includes('已执行动作'), 'agent prompt should be given the history');
assert(AGENT_SYSTEM.includes('fx') && AGENT_SYSTEM.includes('fy'), 'agent prompt should name the coordinate fields');

console.log('PASS my-mobile vision smoke (png header, 720p downscale, prompt contract)');
