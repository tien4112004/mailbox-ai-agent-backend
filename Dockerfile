# Development stage
FROM node:24-alpine AS development
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy source code
COPY src ./src

# Build application
RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install && npm cache clean --force

# Copy built application from development stage
COPY --from=development --chown=nestjs:nodejs /usr/src/app/dist ./dist

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
