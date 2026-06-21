const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

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
