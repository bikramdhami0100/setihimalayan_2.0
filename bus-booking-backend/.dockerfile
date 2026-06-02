FROM node:22-slim

WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Start the app
CMD ["npm", "start"]