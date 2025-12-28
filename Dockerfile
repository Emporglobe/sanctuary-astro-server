# ---- Base image ----
FROM node:18-bullseye

# ---- System deps for native addons ----
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---- App directory ----
WORKDIR /app

# ---- Copy package files first (better cache) ----
COPY package*.json ./

# ---- Install dependencies (compile swisseph HERE) ----
RUN npm install --production

# ---- Copy rest of app ----
COPY . .

# ---- Railway sets PORT automatically ----
EXPOSE 3000

# ---- Start server ----
CMD ["node", "server.js"]
