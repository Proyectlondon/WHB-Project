const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'content', 'catalog.json'), 'utf8'));
const tracks = catalog.audio || [];

const bitrates = {
  mpeg1l3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  mpeg2l3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
};

function inspectMp3(filePath) {
  const data = fs.readFileSync(filePath);
  let offset = 0;
  if (data.toString('ascii', 0, 3) === 'ID3' && data.length >= 10) {
    offset = 10 + ((data[6] & 0x7f) << 21) + ((data[7] & 0x7f) << 14) + ((data[8] & 0x7f) << 7) + (data[9] & 0x7f);
  }
  let frames = 0;
  let seconds = 0;
  while (offset + 4 <= data.length) {
    const header = data.readUInt32BE(offset);
    if ((header >>> 21) !== 0x7ff) { offset += 1; continue; }
    const versionBits = (header >>> 19) & 3;
    const layerBits = (header >>> 17) & 3;
    const bitrateIndex = (header >>> 12) & 15;
    const sampleIndex = (header >>> 10) & 3;
    const padding = (header >>> 9) & 1;
    if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) { offset += 1; continue; }
    const mpeg1 = versionBits === 3;
    const divisor = mpeg1 ? 1 : versionBits === 2 ? 2 : 4;
    const sampleRate = [44100, 48000, 32000][sampleIndex] / divisor;
    const bitrate = bitrates[mpeg1 ? 'mpeg1l3' : 'mpeg2l3'][bitrateIndex];
    const frameLength = Math.floor((mpeg1 ? 144 : 72) * bitrate * 1000 / sampleRate + padding);
    if (frameLength < 24 || offset + frameLength > data.length) { offset += 1; continue; }
    frames += 1;
    seconds += (mpeg1 ? 1152 : 576) / sampleRate;
    offset += frameLength;
  }
  return { bytes: data.length, frames, seconds: Number(seconds.toFixed(2)) };
}

const results = tracks.map((track) => {
  const filePath = path.join(root, ...track.path.split('/'));
  if (!fs.existsSync(filePath)) return { title: track.title, album: track.album, path: track.path, ok: false, error: 'missing' };
  const media = inspectMp3(filePath);
  return { title: track.title, album: track.album, path: track.path, ...media, ok: media.bytes > 1_000_000 && media.frames > 1000 && media.seconds > 60 };
});

const failures = results.filter((item) => !item.ok);
const summary = {
  ok: failures.length === 0 && results.length === 46,
  tracks: results.length,
  totalBytes: results.reduce((sum, item) => sum + (item.bytes || 0), 0),
  shortestSeconds: Math.min(...results.map((item) => item.seconds || 0)),
  longestSeconds: Math.max(...results.map((item) => item.seconds || 0)),
  failures,
  results
};
console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exitCode = 1;
