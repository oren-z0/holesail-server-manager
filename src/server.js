require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs/promises');
const nodeCrypto = require('node:crypto');

// Register static file serving
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'static'),
});

// Serve the main page
fastify.get('/', (_request, reply) => {
  reply.sendFile('index.html');
});


const dataFile = process.env.HSM_DATA_FILE && path.join(__dirname, '..', process.env.HSM_DATA_FILE);

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

// Routes
fastify.get('/api/settings', async (request, reply) => {
  try {
    const settings = JSON.parse(await fs.readFile(dataFile, 'utf-8'));
    return {
      ...settings,
      title: process.env.HSM_TITLE,
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
    await fs.writeFile(dataFile, JSON.stringify({ seed: seed.toLowerCase() }));
    return { success: true };
  } catch (err) {
    fastify.log.error('/api/settings POST failed', err);
    reply.code(500).send({ error: 'Error saving seed' });
  }
});

// Start the server
async function start() {
  try {
    if (!await ensureDataFile()) {
      throw new Error('Failed to initialize data file');
    }
    const port = Number(process.env.HSM_PORT) || 3000;
    await fastify.listen({ port });
    fastify.log.info(`Server running on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
