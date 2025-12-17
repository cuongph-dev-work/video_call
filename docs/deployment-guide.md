# Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Docker & Docker Compose
- Domain name (optional)
- SSL certificates (for HTTPS)

### Quick Start

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd video-call
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

3. **Start services**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Services

- **API**: `http://localhost:4000`
- **Web**: `http://localhost:3000`
- **Redis**: `localhost:6379`

### TURN Server Setup

1. **Start TURN server**
   ```bash
   docker-compose -f docker-compose.turn.yml up -d
   ```

2. **Update environment variables**
   ```env
   NEXT_PUBLIC_TURN_URL=turn:your-server-ip:3478
   NEXT_PUBLIC_TURN_USERNAME=turnuser
   NEXT_PUBLIC_TURN_PASSWORD=turnpass
   ```

3. **Configure firewall**
   - Open ports: 3478 (TCP/UDP), 49152-65535 (UDP)

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Set `REDIS_PASSWORD`
- [ ] Configure TURN server
- [ ] Setup SSL certificates
- [ ] Configure domain & DNS
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Review security settings

### Environment Variables

See `.env.example` for all required variables.

### Scaling

For horizontal scaling:
1. Use Redis adapter (already configured)
2. Run multiple API instances behind load balancer
3. Update `docker-compose.prod.yml` to scale services

```bash
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

