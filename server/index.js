const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const GENERATED_DIR_NAME = '_generated';
const MIN_CLIP_SECONDS = 3;
const MAX_CLIP_SECONDS = 12;

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, rawLine) => {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        return env;
      }

      const equalsIndex = line.indexOf('=');

      if (equalsIndex === -1) {
        return env;
      }

      const key = line.slice(0, equalsIndex).trim();
      let value = line.slice(equalsIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
}

const env = {
  ...readEnvFile(ENV_PATH),
  ...process.env,
};

const PORT = Number(env.VIDEO_SERVER_PORT || 3333);
const HOST = env.VIDEO_SERVER_HOST || '0.0.0.0';
const VIDEO_DIR = env.VIDEO_DIR ? path.resolve(env.VIDEO_DIR) : null;
const PUBLIC_BASE_URL = env.VIDEO_PUBLIC_BASE_URL || `http://localhost:${PORT}`;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/plain',
  });
  response.end(text);
}

function listVideoFiles() {
  if (!VIDEO_DIR) {
    throw new Error('VIDEO_DIR is required in .env');
  }

  if (!fs.existsSync(VIDEO_DIR)) {
    throw new Error(`VIDEO_DIR does not exist: ${VIDEO_DIR}`);
  }

  const videoFiles = [];

  function walkDirectory(directoryPath) {
    fs.readdirSync(directoryPath, { withFileTypes: true }).forEach(entry => {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === GENERATED_DIR_NAME) {
          return;
        }
        walkDirectory(entryPath);
        return;
      }

      if (!entry.isFile() || !VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        return;
      }

      videoFiles.push(path.relative(VIDEO_DIR, entryPath));
    });
  }

  walkDirectory(VIDEO_DIR);

  return videoFiles.sort();
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function buildFeed(request) {
  const publicBaseUrl =
    env.VIDEO_PUBLIC_BASE_URL ||
    `http://${request.headers.host || `localhost:${PORT}`}`;

  return shuffle(listVideoFiles()).map((fileName, index) => {
    const id = encodeURIComponent(fileName);
    const title = path.basename(fileName, path.extname(fileName));

    return {
      id,
      username: '@local',
      tags: '#local #video',
      music: title,
      likes: Math.floor(1000 + Math.random() * 9000),
      comments: Math.floor(100 + Math.random() * 2500),
      uri: `${publicBaseUrl}/videos/${id}`,
      order: index,
    };
  });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        error.message = `${command} failed: ${stderr || error.message}`;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function roundToTenths(value) {
  return Math.round(value * 10) / 10;
}

function randomBetween(min, max) {
  if (max <= min) {
    return min;
  }

  return min + Math.random() * (max - min);
}

function toEvenInt(value) {
  return Math.max(0, Math.floor(value / 2) * 2);
}

function formatTimestampForName() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
}

function sanitizePathForName(fileName) {
  return fileName.replace(/[\/\\]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '-');
}

function ensureGeneratedDirectory() {
  if (!VIDEO_DIR) {
    throw new Error('VIDEO_DIR is required in .env');
  }

  const generatedDir = path.join(VIDEO_DIR, GENERATED_DIR_NAME);
  fs.mkdirSync(generatedDir, { recursive: true });
  return generatedDir;
}

async function probeVideo(filePath) {
  const args = [
    '-v',
    'error',
    '-show_streams',
    '-show_format',
    '-print_format',
    'json',
    filePath,
  ];
  const { stdout } = await runCommand('ffprobe', args);
  const probe = JSON.parse(stdout);
  const videoStream = (probe.streams || []).find(stream => stream.codec_type === 'video');

  if (!videoStream) {
    throw new Error(`No video stream found for ${filePath}`);
  }

  const streamDuration = Number.parseFloat(videoStream.duration || '');
  const formatDuration = Number.parseFloat(probe.format?.duration || '');

  return {
    width: Number(videoStream.width || 0),
    height: Number(videoStream.height || 0),
    codecName: videoStream.codec_name || '',
    duration: Number.isFinite(streamDuration)
      ? streamDuration
      : Number.isFinite(formatDuration)
        ? formatDuration
        : 0,
  };
}

async function createRandomClip(inputPath, outputPath, clipStartSeconds, clipDurationSeconds) {
  const args = [
    '-v',
    'error',
    '-y',
    '-ss',
    String(roundToTenths(clipStartSeconds)),
    '-i',
    inputPath,
    '-t',
    String(roundToTenths(clipDurationSeconds)),
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    outputPath,
  ];

  await runCommand('ffmpeg', args);
}

async function cropToPortraitWithCopy(inputPath, outputPath, width, height, codecName) {
  if (width <= height) {
    return inputPath;
  }

  if (codecName !== 'h264') {
    throw new Error(
      `Cannot crop non-portrait video without re-encoding for codec "${codecName}".`,
    );
  }

  const targetWidth = toEvenInt(Math.min(width, Math.floor(height * (9 / 16))));
  const cropDelta = Math.max(width - targetWidth, 0);
  const cropLeft = toEvenInt(Math.floor(cropDelta / 2));
  const cropRight = toEvenInt(cropDelta - cropLeft);
  const cropArgs = [
    '-v',
    'error',
    '-y',
    '-i',
    inputPath,
    '-map',
    '0',
    '-c',
    'copy',
    '-bsf:v',
    `h264_metadata=crop_left=${cropLeft}:crop_right=${cropRight}:crop_top=0:crop_bottom=0`,
    outputPath,
  ];

  await runCommand('ffmpeg', cropArgs);
  return outputPath;
}

async function createClipAsset(fileName) {
  const sourcePath = path.resolve(VIDEO_DIR, fileName);
  const generatedDir = ensureGeneratedDirectory();
  const extension = path.extname(fileName).toLowerCase() || '.mp4';
  const stamp = formatTimestampForName();
  const sourceName = sanitizePathForName(path.basename(fileName, extension));
  const randomToken = Math.random().toString(36).slice(2, 8);
  const clipBaseName = `${sourceName}-${stamp}-${randomToken}`;
  const randomClipFileName = `${clipBaseName}-clip${extension}`;
  const randomClipPath = path.join(generatedDir, randomClipFileName);

  const sourceMetadata = await probeVideo(sourcePath);
  const maxClipDuration = Math.min(MAX_CLIP_SECONDS, sourceMetadata.duration || MAX_CLIP_SECONDS);
  const minClipDuration = Math.min(MIN_CLIP_SECONDS, maxClipDuration);
  const clipDuration = randomBetween(minClipDuration, maxClipDuration);
  const maxStartTime = Math.max((sourceMetadata.duration || clipDuration) - clipDuration, 0);
  const clipStart = randomBetween(0, maxStartTime);

  await createRandomClip(sourcePath, randomClipPath, clipStart, clipDuration);

  const clipMetadata = await probeVideo(randomClipPath);

  if (clipMetadata.width <= clipMetadata.height) {
    return path.posix.join(GENERATED_DIR_NAME, randomClipFileName);
  }

  const portraitFileName = `${clipBaseName}-portrait${extension}`;
  const portraitPath = path.join(generatedDir, portraitFileName);
  await cropToPortraitWithCopy(
    randomClipPath,
    portraitPath,
    clipMetadata.width,
    clipMetadata.height,
    clipMetadata.codecName,
  );
  return path.posix.join(GENERATED_DIR_NAME, portraitFileName);
}

async function buildClipFeed(request) {
  const publicBaseUrl =
    env.VIDEO_PUBLIC_BASE_URL ||
    `http://${request.headers.host || `localhost:${PORT}`}`;
  const videoFiles = shuffle(listVideoFiles());
  const clipFiles = await Promise.all(videoFiles.map(fileName => createClipAsset(fileName)));

  return clipFiles.map((clipFileName, index) => {
    const id = encodeURIComponent(`${clipFileName}-${Date.now()}-${index}`);
    const title = path.basename(clipFileName, path.extname(clipFileName));

    return {
      id,
      username: '@local',
      tags: '#local #clip',
      music: title,
      likes: Math.floor(500 + Math.random() * 6000),
      comments: Math.floor(25 + Math.random() * 1500),
      uri: `${publicBaseUrl}/videos/${encodeURIComponent(clipFileName)}`,
      order: index,
    };
  });
}

function getSafeVideoPath(encodedFileName) {
  const fileName = decodeURIComponent(encodedFileName);
  const filePath = path.resolve(VIDEO_DIR, fileName);

  if (!filePath.startsWith(`${VIDEO_DIR}${path.sep}`)) {
    return null;
  }

  return filePath;
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.webm') {
    return 'video/webm';
  }

  if (extension === '.mov') {
    return 'video/quicktime';
  }

  return 'video/mp4';
}

function streamVideo(request, response, encodedFileName) {
  if (!VIDEO_DIR) {
    sendJson(response, 500, { error: 'VIDEO_DIR is required in .env' });
    return;
  }

  const filePath = getSafeVideoPath(encodedFileName);

  if (!filePath || !fs.existsSync(filePath)) {
    sendJson(response, 404, { error: 'Video not found' });
    return;
  }

  const stat = fs.statSync(filePath);

  if (!stat.isFile()) {
    sendJson(response, 404, { error: 'Video not found' });
    return;
  }

  const range = request.headers.range;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes',
    'Content-Type': contentTypeFor(filePath),
  };

  if (!range) {
    response.writeHead(200, {
      ...headers,
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(response);
    return;
  }

  const [startText, endText] = range.replace(/bytes=/, '').split('-');
  const start = Number.parseInt(startText, 10);
  const end = endText ? Number.parseInt(endText, 10) : stat.size - 1;

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start >= stat.size ||
    end >= stat.size ||
    start > end
  ) {
    response.writeHead(416, {
      ...headers,
      'Content-Range': `bytes */${stat.size}`,
    });
    response.end();
    return;
  }

  response.writeHead(206, {
    ...headers,
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Content-Length': end - start + 1,
  });
  fs.createReadStream(filePath, { start, end }).pipe(response);
}

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    });
    response.end();
    return;
  }

  const url = new URL(request.url, PUBLIC_BASE_URL);

  if (request.method === 'GET' && url.pathname === '/api/feed') {
    try {
      sendJson(response, 200, { feed: buildFeed(request) });
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/clips') {
    buildClipFeed(request)
      .then(feed => {
        sendJson(response, 200, { feed });
      })
      .catch(error => {
        sendJson(response, 500, { error: error.message });
      });
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/videos/')) {
    streamVideo(request, response, url.pathname.replace('/videos/', ''));
    return;
  }

  sendText(response, 404, 'Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Video server listening on http://${HOST}:${PORT}`);
  console.log(`Video directory: ${VIDEO_DIR || '(missing VIDEO_DIR)'}`);
});
