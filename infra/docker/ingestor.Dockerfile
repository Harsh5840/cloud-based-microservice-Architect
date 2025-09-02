FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY ./apps/ingestor/package*.json ./
RUN npm install --production

# Copy application code
COPY ./apps/ingestor/ ./

# Set environment variables
ENV NODE_ENV=production
ENV KAFKA_BROKERS=kafka:9092
ENV KAFKA_TOPIC=financial-data
ENV POLLING_INTERVAL=60000

# Run the application
CMD ["node", "ingestor.js"]