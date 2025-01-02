FROM node:22.12-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Delete node_modules
RUN rm -rf node_modules

# Install production dependencies
RUN npm ci --omit=dev

# Expose default port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
