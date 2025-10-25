# Deployment Guide

## Deployment Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Deployment Scenarios                               │
└────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐
│  Local Development   │  │  Docker Deployment   │  │ Cloud Hosting   │
│                      │  │                      │  │                 │
│  • Manual setup      │  │  • One command       │  │  • AWS/DO/Azure │
│  • Multiple terminal │  │  • Isolated services │  │  • Production   │
│  • Fast iteration    │  │  • Easy cleanup      │  │  • Scalable     │
│  • Debug friendly    │  │  • Consistent env    │  │  • Managed DB   │
└──────────────────────┘  └──────────────────────┘  └─────────────────┘

Production Architecture (Recommended):
═══════════════════════════════════════

                           Internet
                              │
                              ▼
                        ┌──────────┐
                        │  Nginx   │  SSL/TLS Termination
                        │  Proxy   │  Load Balancing
                        └────┬─────┘  Static Files
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         ┌─────────┐   ┌─────────┐   ┌─────────┐
         │Backend 1│   │Backend 2│   │Backend 3│
         │(Node.js)│   │(Node.js)│   │(Node.js)│
         └────┬────┘   └────┬────┘   └────┬────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
         ┌──────────┐                 ┌──────────┐
         │ MongoDB  │                 │   MQTT   │
         │ Replica  │                 │ Cluster  │
         │   Set    │                 │(Mosquitto)│
         └──────────┘                 └──────────┘
```

## Prerequisites

- Docker and Docker Compose installed
- Domain name (optional, for production)
- SSL certificate (optional, for HTTPS)

## Docker Deployment

### Docker Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                             │
│                                                                       │
│  ┌─────────────────┐         ┌─────────────────┐                    │
│  │   frontend      │         │    backend      │                    │
│  │  Container      │         │   Container     │                    │
│  │                 │         │                 │                    │
│  │  Nginx:alpine   │         │  Node.js 18     │                    │
│  │  Port: 3000     │◀───────▶│  Port: 5000     │                    │
│  │                 │  HTTP   │                 │                    │
│  └─────────────────┘         └────────┬────────┘                    │
│                                       │                              │
│                              ┌────────┴────────┐                     │
│                              │                 │                     │
│                              ▼                 ▼                     │
│                    ┌─────────────────┐  ┌─────────────────┐         │
│                    │   mongodb       │  │   mosquitto     │         │
│                    │   Container     │  │   Container     │         │
│                    │                 │  │                 │         │
│                    │  MongoDB 6      │  │  Mosquitto 2    │         │
│                    │  Port: 27017    │  │  Port: 1883     │         │
│                    │                 │  │                 │         │
│                    │  Volume:        │  │  Volume:        │         │
│                    │  mongodb_data   │  │  mosquitto_data │         │
│                    └─────────────────┘  └─────────────────┘         │
│                                                                       │
│  Networks:                                                           │
│  • backend  - Internal network for services                          │
│  • frontend - Frontend-backend communication                         │
│                                                                       │
│  Volumes:                                                            │
│  • mongodb_data    - Persistent database storage                     │
│  • mosquitto_data  - MQTT broker data persistence                    │
└──────────────────────────────────────────────────────────────────────┘

External Access:
────────────────
• Frontend:  http://localhost:3000
• Backend:   http://localhost:5000
• MongoDB:   localhost:27017 (development only)
• MQTT:      localhost:1883
```

### 1. Clone Repository

```bash
git clone https://github.com/k2pitel/ItemReminderIOT.git
cd ItemReminderIOT
```

### 2. Configure Environment

Create `.env` file in backend directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and update:
- `JWT_SECRET`: Use a strong random secret
- `BLYNK_TOKEN`: Your Blynk token (optional)
- `FIREBASE_SERVER_KEY`: Your Firebase key (optional)

Create `.env` file in frontend directory:

```bash
cd ../frontend
cp .env.example .env
```

Update if using different URLs.

### 3. Build and Start Services

```bash
cd ..
docker-compose up -d
```

This starts:
- MongoDB on port 27017
- Mosquitto MQTT on port 1883
- Backend API on port 5000
- Frontend on port 3000

### 4. Verify Services

Check all containers are running:

```bash
docker-compose ps
```

View logs:

```bash
docker-compose logs -f
```

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017
- MQTT: localhost:1883

### 6. Create First User

Navigate to http://localhost:3000 and register a new account.

## Production Deployment

### 1. Update Docker Compose

For production, create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - backend

  mosquitto:
    image: eclipse-mosquitto:2
    restart: always
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - mosquitto_data:/mosquitto/data
    ports:
      - "1883:1883"
    networks:
      - backend

  backend:
    build: ./backend
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/itemreminder
      MQTT_BROKER: mqtt://mosquitto:1883
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mongodb
      - mosquitto
    networks:
      - backend
      - frontend

  frontend:
    build: ./frontend
    restart: always
    depends_on:
      - backend
    networks:
      - frontend

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - frontend

volumes:
  mongodb_data:
  mosquitto_data:

networks:
  backend:
  frontend:
```

### 2. Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5000;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $host;
        }

        location /socket.io {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 3. SSL Certificate

Using Let's Encrypt:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to ssl directory
mkdir ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
```

### 4. Environment Variables

Create `.env` in root directory:

```env
MONGO_USER=admin
MONGO_PASSWORD=secure-password-here
JWT_SECRET=your-super-secret-jwt-key
```

### 5. Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Cloud Deployment

### AWS EC2

1. **Launch EC2 Instance**
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: t3.medium or larger
   - Security Group: Open ports 80, 443, 1883, 27017 (MongoDB - only from backend)

2. **Connect and Setup**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Install Docker
   sudo apt-get update
   sudo apt-get install docker.io docker-compose
   
   # Clone repository
   git clone https://github.com/k2pitel/ItemReminderIOT.git
   cd ItemReminderIOT
   
   # Deploy
   docker-compose up -d
   ```

3. **Configure DNS**
   - Point your domain to EC2 public IP
   - Update environment variables with domain

### Digital Ocean

1. **Create Droplet**
   - Choose Docker marketplace image
   - Select appropriate size

2. **Deploy Application**
   ```bash
   ssh root@your-droplet-ip
   git clone https://github.com/k2pitel/ItemReminderIOT.git
   cd ItemReminderIOT
   docker-compose up -d
   ```

### Heroku

Backend deployment:

```bash
cd backend
heroku create itemreminder-backend
heroku addons:create mongolab
heroku addons:create cloudmqtt
heroku config:set JWT_SECRET=your-secret
git push heroku main
```

Frontend deployment:

```bash
cd frontend
heroku create itemreminder-frontend
heroku config:set REACT_APP_API_URL=https://itemreminder-backend.herokuapp.com/api
heroku buildpacks:add heroku/nodejs
git push heroku main
```

## Monitoring

### Health Checks

Backend health endpoint:
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "mongodb": "connected"
}
```

### Logging

View Docker logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Backup

MongoDB backup:
```bash
docker exec itemreminder-mongodb mongodump --out /backup
docker cp itemreminder-mongodb:/backup ./backup
```

Restore:
```bash
docker cp ./backup itemreminder-mongodb:/backup
docker exec itemreminder-mongodb mongorestore /backup
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker status
docker-compose ps

# View logs
docker-compose logs

# Restart services
docker-compose restart
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker exec itemreminder-mongodb mongo --eval "db.adminCommand('ping')"

# Check connection from backend
docker exec itemreminder-backend node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected'))"
```

### MQTT Connection Issues

```bash
# Test MQTT broker
docker exec itemreminder-backend npm install -g mqtt
docker exec itemreminder-backend mqtt pub -h mosquitto -t test -m "hello"
```

## Updating

### Update Code

```bash
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

### Update Dependencies

```bash
# Backend
cd backend
npm update
docker-compose build backend

# Frontend
cd frontend
npm update
docker-compose build frontend
```

## Scaling

### Horizontal Scaling

Use Docker Swarm or Kubernetes for multiple instances.

Example with Docker Swarm:

```bash
docker swarm init
docker stack deploy -c docker-compose.prod.yml itemreminder
docker service scale itemreminder_backend=3
```

### Database Scaling

MongoDB replica set for high availability:

```yaml
mongodb:
  image: mongo:6
  command: mongod --replSet rs0
  deploy:
    replicas: 3
```

## Security Checklist

- [ ] Change default MongoDB password
- [ ] Use strong JWT secret
- [ ] Enable MQTT authentication
- [ ] Use HTTPS in production
- [ ] Restrict database ports
- [ ] Enable firewall
- [ ] Regular security updates
- [ ] Backup regularly
- [ ] Monitor logs
- [ ] Use environment variables for secrets
