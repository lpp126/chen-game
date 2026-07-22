/**
 * 将 public/images 下 png/jpg 转为 webp，并压缩 public/audio 下 mp3。
 * 用法: node scripts/optimize-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imagesRoot = path.join(root, 'public', 'images');
const audioRoot = path.join(root, 'public', 'audio');

const maxWidthFor = (relPosix) => {
  if (relPosix.includes('level25/')) return 900;
  if (relPosix.includes('结算') || /[a-f0-9]{32}\.png$/i.test(path.basename(relPosix))) return 512;
  if (relPosix.includes('level5-puzzle') || /找\d/.test(relPosix)) return 1280;
  if (relPosix.includes('首页封面') || relPosix.includes('封面') || relPosix.includes('bg-room')) return 1080;
  if (relPosix.includes('背带裤') || relPosix.includes('奶嘴') || relPosix.includes('婴儿') || relPosix.includes('bottle')) return 640;
  return 1080;
};

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

async function convertImage(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return null;
  // 跳过已有同名 webp 且原图很小的情况仍重转
  const rel = path.relative(imagesRoot, file).replace(/\\/g, '/');
  const out = file.slice(0, -ext.length) + '.webp';
  const maxW = maxWidthFor(rel);
  const before = fs.statSync(file).size;

  await sharp(file)
    .rotate()
    .resize({ width: maxW, height: maxW, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toFile(out);

  const after = fs.statSync(out).size;
  fs.unlinkSync(file);
  return { rel, before, after, out: path.relative(imagesRoot, out).replace(/\\/g, '/') };
}

function compressMp3(file) {
  const tmp = file + '.tmp.mp3';
  const before = fs.statSync(file).size;
  const r = spawnSync(
    ffmpegPath.path,
    ['-y', '-i', file, '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', tmp],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    console.error('ffmpeg fail', path.basename(file), r.stderr?.slice(-400));
    return null;
  }
  const after = fs.statSync(tmp).size;
  if (after >= before * 0.95) {
    // 几乎没变小，保留原文件
    fs.unlinkSync(tmp);
    return { name: path.basename(file), before, after: before, skipped: true };
  }
  fs.renameSync(tmp, file);
  return { name: path.basename(file), before, after };
}

const results = [];
for (const file of walk(imagesRoot)) {
  try {
    const r = await convertImage(file);
    if (r) results.push(r);
  } catch (e) {
    console.error('img fail', file, e.message);
  }
}

let beforeSum = 0;
let afterSum = 0;
for (const r of results) {
  beforeSum += r.before;
  afterSum += r.after;
  console.log(
    `${(r.before / 1024).toFixed(0)}KB -> ${(r.after / 1024).toFixed(0)}KB  ${r.rel}`
  );
}
console.log(
  `images: ${results.length} files, ${(beforeSum / 1024 / 1024).toFixed(2)}MB -> ${(afterSum / 1024 / 1024).toFixed(2)}MB`
);

if (fs.existsSync(audioRoot)) {
  for (const name of fs.readdirSync(audioRoot)) {
    if (!name.toLowerCase().endsWith('.mp3')) continue;
    const r = compressMp3(path.join(audioRoot, name));
    if (r) {
      console.log(
        `audio ${r.name}: ${(r.before / 1024 / 1024).toFixed(2)}MB -> ${(r.after / 1024 / 1024).toFixed(2)}MB${r.skipped ? ' (kept)' : ''}`
      );
    }
  }
}

// 清理根目录重复 demo mp3
const demo = path.join(root, 'public', '游戏界面1demo.mp3');
if (fs.existsSync(demo)) {
  fs.unlinkSync(demo);
  console.log('removed public/游戏界面1demo.mp3 (use audio/menu-bgm.mp3)');
}

console.log('done');
