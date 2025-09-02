# Financial Risk Analyzer

A microservices-based platform for analyzing financial data and calculating risk scores.

## Architecture

The platform consists of the following services:

- **Ingestor**: Pulls financial data from APIs or datasets and sends to Kafka
- **Worker**: Consumes data from Kafka, computes risk scores, and saves to PostgreSQL
- **Dashboard**: API and frontend for querying risk analysis results
- **Scheduler**: Cron-like job scheduler to trigger data replay

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

## Getting Started

### Project Initialization

```bash
# For Linux/Mac users
./init-project.sh

# For Windows users
.\init-project.ps1
```

### Running with Docker Compose

```bash
# Start all services
docker-compose -f deployment/docker-compose.yml up -d

# Check service status
docker-compose -f deployment/docker-compose.yml ps

# View logs
docker-compose -f deployment/docker-compose.yml logs -f
```

### Local Development

```bash
# For Linux/Mac users - start all services in development mode
./dev.sh

# For Windows users - start all services in development mode
.\dev.ps1
```

Or manually:

```bash
# Install dependencies for all services
cd apps/ingestor && npm install
cd ../worker && npm install
cd ../dashboard && npm install
cd ../scheduler && npm install

# Start Kafka and PostgreSQL
docker-compose -f kafka/docker-compose.yml up -d
docker-compose -f db/docker-compose.yml up -d

# Run services individually
cd apps/ingestor && npm start
cd ../worker && npm start
cd ../dashboard && npm start
cd ../scheduler && npm start
```

### Running Tests

```bash
# For Linux/Mac users
./run-tests.sh

# For Windows users
.\run-tests.ps1
```

### Stopping Services

```bash
# For Linux/Mac users
./stop-services.sh

# For Windows users
.\stop-services.ps1
```

## Service Endpoints

- **Dashboard API**: http://localhost:3000/api/trades
- **Worker Metrics**: http://localhost:3001/metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3030 (admin/admin)
- **Kafka UI**: http://localhost:8080
- **PgAdmin**: http://localhost:5050 (admin@example.com/admin)

## Environment Variables

Each service can be configured using environment variables. See the Dockerfiles and docker-compose.yml for details.

## Database Migrations

Database schema is automatically initialized when the PostgreSQL container starts. See `db/migrations/001_init.sql` for details.

## Monitoring

The platform includes Prometheus and Grafana for monitoring. Custom dashboards can be added to `monitoring/grafana/dashboards`.