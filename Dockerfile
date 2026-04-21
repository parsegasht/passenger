# Stage 1: Build stage
FROM node:18.17.0-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --force

# Copy project files
COPY . .

# Build the project
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3002
EXPOSE 3002

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
