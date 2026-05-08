# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_GOOGLE_API_KEY=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install a simple HTTP server to serve the built app
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start the server
CMD ["serve", "-s", "dist", "-l", "3000"]
