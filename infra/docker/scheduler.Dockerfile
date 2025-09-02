FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY ./apps/scheduler/package*.json ./
RUN npm install --production

# Copy application code
COPY ./apps/scheduler/ ./

# Set environment variables
ENV NODE_ENV=production
ENV INGESTOR_URL=http://ingestor:3002/trigger
ENV CRON_SCHEDULE="0 */1 * * *"
ENV TRIGGER_ON_STARTUP=true

# Run the application
CMD ["node", "scheduler.js"]