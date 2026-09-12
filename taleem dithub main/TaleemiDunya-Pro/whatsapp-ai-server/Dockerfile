FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Hugging Face Spaces requires apps to listen on port 7860
ENV PORT=7860
EXPOSE 7860

# Start the bot
CMD ["npm", "start"]
