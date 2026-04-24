# ====== BUILD STAGE ======
FROM node:24-slim AS builder

# Set working directory
WORKDIR /app

# Install system dependencies for build
RUN apt update && apt install -y openssl

# Copy package.json, package-lock.json & prisma folder
COPY package.json package-lock.json ./ 
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Copy rest of the project files
COPY . .

# Build the app (NestJS -> dist/)
RUN npm run build

# ====== PRODUCTION STAGE ======
FROM node:24-slim AS production

# Set working directory
WORKDIR /app

# Install system dependencies needed at runtime
RUN apt update && apt install -y openssl curl

# Copy only necessary files from builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma

# Install production dependencies
RUN npm install

# Set production env
ENV NODE_ENV=production
EXPOSE 5056

CMD ["npm", "run", "start:docker"]
