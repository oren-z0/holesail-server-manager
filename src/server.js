require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs/promises');
const nodeCrypto = require('node:crypto');
const HolesailServer = require('holesail-server');

const dataFile = process.env.HSM_DATA_FILE && (
  path.isAbsolute(process.env.HSM_DATA_FILE)
  ? process.env.HSM_DATA_FILE
  : path.join(__dirname, '..', process.env.HSM_DATA_FILE)
);
const holesailTargetPort = process.env.HSM_TARGET_PORT && Number(process.env.HSM_TARGET_PORT);
const holesailTargetAddress = process.env.HSM_TARGET_ADDRESS;

let holesailServer;

async function serveSeed(seed) {
  if (holesailServer) {
    fastify.log.info('Holesail server already running, destroying.');
    holesailServer.destroy();
  }
  fastify.log.info(`Starting holesail server to target: ${holesailTargetAddress}:${holesailTargetPort}`);
  holesailServer = new HolesailServer();
  await new Promise((resolve) => holesailServer.serve({
    port: holesailTargetPort,
    address: holesailTargetAddress,
    buffSeed: seed,
    secure: false,
  }, resolve));
}

async function ensureDataFile() {
  try {
    if (!dataFile) {
      console.error('HSM_DATA_FILE environment variable is not set, see .env.example file.');
      return false;
    }
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    try {
      await fs.access(dataFile);
    } catch {
      await fs.writeFile(dataFile, JSON.stringify({ seed: nodeCrypto.randomBytes(32).toString('hex') }));
    }
  } catch (err) {
    console.error('Error initializing data file', err);
    return false;
  }
  return true;
}

// Register static file serving
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'static'),
});

// Serve the main page
fastify.get('/', (_request, reply) => {
  reply.sendFile('index.html');
});

// Routes
fastify.get('/api/settings', async (request, reply) => {
  try {
    const settings = JSON.parse(await fs.readFile(dataFile, 'utf-8'));
    return {
      ...settings,
      title: process.env.HSM_TITLE,
      publicKey: holesailServer.getPublicKey(),
    };
  } catch (err) {
    fastify.log.error('/api/settings GET failed', err);
    reply.code(500).send({ error: 'Error reading settings' });
  }
});

fastify.post('/api/settings', async (request, reply) => {
  try {
    const { seed } = request.body;
    if (typeof seed !== 'string' || seed.length !== 64 || !/^[0-9a-fA-F]+$/.test(seed)) {
      reply.code(400).send({ error: 'Seed must be a 64 character hex string' });
    }
    const lowercaseSeed = seed.toLowerCase();
    await fs.writeFile(dataFile, JSON.stringify({ seed: lowercaseSeed }));
    await serveSeed(lowercaseSeed);
    return { success: true };
  } catch (err) {
    fastify.log.error('/api/settings POST failed', err);
    reply.code(500).send({ error: 'Error saving seed' });
  }
});

// Start the server
async function start() {
  try {
    if (!holesailTargetPort || !holesailTargetAddress ) {
      throw new Error('HSM_TARGET_PORT and HSM_TARGET_ADDRESS environment variables are required');
    }
    if (!await ensureDataFile()) {
      throw new Error('Failed to initialize data file');
    }
    const settings = JSON.parse(await fs.readFile(dataFile, 'utf-8'));
    await serveSeed(settings.seed);
    const host = process.env.HSM_HOST || '0.0.0.0';
    const port = Number(process.env.HSM_PORT) || 3000;
    await fastify.listen({ host, port });
    fastify.log.info(`Server running on host ${host}, port ${port}.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  void start();
}
