FROM node:22.12-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Delete unnecessary modules
RUN npm prune --omit=dev

# Expose default port
EXPOSE 3000

# Start the server
CMD ["npm", "run", "start"]
