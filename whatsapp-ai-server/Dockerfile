FROM node:20-slim

# Install necessary system dependencies for Baileys/Puppeteer if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# HuggingFace Spaces uses port 7860 by default
ENV PORT=7860
EXPOSE 7860

CMD ["node", "server.js"]
