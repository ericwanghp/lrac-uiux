# Deployment Guide

This guide covers deploying the LRAC UI/UX application in various environments.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for containerized deployment)
- Git

## Quick Start

### Local Development with Docker

```bash
# Clone the repository
git clone https://github.com/your-org/lrac-uiux.git
cd lrac-uiux

# Copy environment variables
cp .env.example .env.local

# Start development server with Docker
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Local Development (Native)

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev

# Start realtime server in a second terminal (optional but recommended)
npm run ws:start

# Access the application
open http://localhost:3000
```

## Production Deployment

### Option 1: Docker Compose

```bash
# Build and start production containers
docker-compose -f docker-compose.yml up -d --build app-production

# View logs
docker-compose logs -f app
```

### Option 2: Docker with Nginx

```bash
# Start full stack with Nginx reverse proxy
docker-compose up -d --build

# Or manually:
docker build -t lrac-app .
docker run -d -p 3000:3000 --name lrac-app lrac-app
```

### Option 3: Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Option 4: Platform-Specific

#### Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### AWS Amplify

1. Connect your repository to AWS Amplify
2. Build settings are auto-detected from `package.json`
3. Set environment variables in Amplify console

#### Google Cloud Run

```bash
# Build container
gcloud builds submit --tag gcr.io/PROJECT-ID/lrac-app

# Deploy
gcloud run deploy --image gcr.io/PROJECT-ID/lrac-app --platform managed
```

## Environment Variables

| Variable                       | Description                      | Default                 |
| ------------------------------ | -------------------------------- | ----------------------- |
| `NEXT_PUBLIC_APP_URL`          | Application URL                  | `http://localhost:3000` |
| `NEXT_PUBLIC_ENABLE_WEBSOCKET` | Enable realtime WebSocket client | `false`                 |
| `NEXT_PUBLIC_WS_URL`           | WebSocket server URL             | `ws://localhost:3003`   |
| `WS_PORT`                      | WebSocket server port            | `3003`                  |
| `NODE_ENV`                     | Environment                      | `development`           |
| `NEXTAUTH_SECRET`              | Auth secret                      | -                       |
| `NEXTAUTH_URL`                 | Auth URL                         | `http://localhost:3000` |

See `.env.example` for all available variables.

## Docker Configuration

### Dockerfile Stages

1. **deps** - Install production dependencies
2. **builder** - Build the Next.js application
3. **runner** - Run the production application

### Multi-Stage Build

```dockerfile
# Production build with standalone output
npm run build
```

### Docker Commands

```bash
# Build image
docker build -t lrac-app .

# Run container
docker run -d -p 3000:3000 --env-file .env.production lrac-app

# View logs
docker logs -f lrac-app

# Stop container
docker stop lrac-app
```

## Nginx Configuration

The `nginx.conf` provides:

- SSL termination
- Gzip compression
- Rate limiting
- Static asset caching
- WebSocket support
- Security headers

### SSL Configuration

1. Obtain SSL certificate (Let's Encrypt, etc.)
2. Place certificates in `./ssl/` directory
3. Uncomment SSL configuration in `nginx.conf`

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
# Triggered on push to main
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run build
      - run: npm test
```

## Health Checks

The application exposes a health check endpoint:

```
GET /api/health
```

Docker healthcheck is configured to probe this endpoint.

## Troubleshooting

### Container fails to start

```bash
# Check logs
docker logs lrac-app

# Verify environment variables
docker exec lrac-app env
```

### Build fails

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t lrac-app .
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Monitoring

### Logs

```bash
# Docker logs
docker logs -f lrac-app

# Production logs (JSON format)
docker logs -f lrac-app --tail 100 --timestamps
```

### Health Monitoring

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Docker health status
docker inspect --format='{{.State.Health.Status}}' lrac-app
```

## Security Checklist

- [ ] Set `NEXTAUTH_SECRET` to a secure value
- [ ] Configure SSL certificates
- [ ] Set appropriate file permissions
- [ ] Enable security headers (already configured in nginx.conf)
- [ ] Set `NODE_ENV=production`
- [ ] Configure rate limiting
- [ ] Review and update Docker image tags regularly

## Scaling

### Horizontal Scaling

For horizontal scaling, use a load balancer with multiple container instances:

```yaml
# docker-compose.yml modification
app:
  deploy:
    replicas: 3
```

### Database

If adding a database, update connection string in environment variables:

```
DATABASE_URL=postgresql://user:password@host:5432/lrac
```
