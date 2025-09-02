FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY ./apps/dashboard/package*.json ./
RUN npm install --production

# Copy application code
COPY ./apps/dashboard/ ./

# Set environment variables
ENV NODE_ENV=production
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=financial_risk
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Run the application
CMD ["node", "server.js"]