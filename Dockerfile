# Use Node.js 20 for build stage
FROM node:20 AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY server/package*.json server/
COPY client/package*.json client/
RUN npm install && npm run install-all

# Copy source code and build the React client
COPY . .
RUN npm run build --prefix client

# Final runtime image
FROM node:20
WORKDIR /app
COPY --from=builder /app ./
ENV DOMAIN=http://localhost:3001
EXPOSE 3001
CMD ["npm", "start", "--prefix", "server"]
