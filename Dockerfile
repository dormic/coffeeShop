FROM node:20-alpine

WORKDIR /app

# Copy package info and install dependencies
COPY package*.json ./
RUN npm install

# Copy all other files
COPY . .

# Build the Vite client and esbuild server
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the built application
CMD ["npm", "run", "start"]
