# Use Node.js LTS version as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy only the package.json and package-lock.json first
COPY package*.json ./

# Install system dependencies required by Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies and Playwright's Chromium (via postinstall script)
RUN npm install

# Ensure Playwright browsers are installed
RUN npx playwright install

# Copy the rest of the application files into the container
COPY . .

# Expose any required ports (optional, if serving files)
EXPOSE 3000

# Define the command to run your scraper
CMD ["node", "index.js"]
