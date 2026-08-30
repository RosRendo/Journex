FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma Client and Build TypeScript
RUN npm run build

# Expose API port
EXPOSE 5000

# Start the server
CMD ["npm", "run", "start"]
