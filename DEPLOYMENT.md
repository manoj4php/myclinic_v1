# MyClinic V1 - Production Deployment Guide

This guide provides step-by-step instructions for deploying MyClinic V1 to a production hosting server.

## Prerequisites

### System Requirements
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn package manager
- SSL certificate (recommended for production)

### Environment Setup
1. **Server Setup**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib -y
   ```

2. **Database Setup**
   ```bash
   # Switch to postgres user
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE myclinic_prod;
   CREATE USER myclinic_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE myclinic_prod TO myclinic_user;
   \q
   ```

## Deployment Steps

### 1. Clone and Setup Application

```bash
# Clone the repository
git clone https://github.com/manoj4php/myclinic_v1.git
cd myclinic_v1

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with production values:

```bash
# Database Configuration (REQUIRED)
DB_HOST=localhost
DB_PORT=5432
DB_USER=myclinic_user
DB_PASSWORD=your_secure_password
DB_NAME=myclinic_prod

# JWT Configuration (REQUIRED - Generate secure keys)
JWT_SECRET=your-256-bit-secret-key-generate-with-openssl
JWT_ISSUER=https://yourdomain.com

# Server Configuration
PORT=5000
NODE_ENV=production

# Optional: Email Configuration
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional: Object Storage
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**Security Note**: Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

### 3. Build Application

```bash
# Build the client application
npm run build

# Run TypeScript check
npm run check
```

### 4. Database Migration

```bash
# Run database migrations (if available)
npm run db:migrate

# Or manually create tables using the schema in shared/schema.ts
```

### 5. Create System Service

Create a systemd service file for automatic startup:

```bash
sudo nano /etc/systemd/system/myclinic.service
```

Add the following content:
```ini
[Unit]
Description=MyClinic V1 Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/myclinic_v1
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable myclinic
sudo systemctl start myclinic
sudo systemctl status myclinic
```

### 6. Reverse Proxy Setup (Nginx)

Install and configure Nginx:

```bash
sudo apt install nginx -y

# Create nginx configuration
sudo nano /etc/nginx/sites-available/myclinic
```

Add configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificate (use Let's Encrypt or your certificate)
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Handle large file uploads for medical images
    client_max_body_size 100M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/myclinic /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 8. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Post-Deployment

### 1. Create Initial Admin User

Access your application and create the first admin user, or run a script to create one:

```bash
# Create admin user script (create this file)
node scripts/create-admin.js
```

### 2. Monitoring Setup

Set up log monitoring:
```bash
# View application logs
sudo journalctl -u myclinic -f

# Monitor nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. Backup Configuration

Set up regular database backups:
```bash
# Create backup script
sudo nano /etc/cron.daily/myclinic-backup
```

Add backup script:
```bash
#!/bin/bash
BACKUP_DIR="/backups/myclinic"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump -U myclinic_user -h localhost myclinic_prod | gzip > $BACKUP_DIR/myclinic_backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Make it executable:
```bash
sudo chmod +x /etc/cron.daily/myclinic-backup
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Database created and configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Application service running
- [ ] Nginx configured and running
- [ ] Backup system configured
- [ ] Monitoring setup
- [ ] Admin user created
- [ ] Test all functionality

## Scaling Considerations

For high-traffic environments:

1. **Load Balancing**: Use multiple application instances behind a load balancer
2. **Database**: Consider PostgreSQL replication or managed database services
3. **File Storage**: Use cloud storage (AWS S3, Google Cloud Storage) for medical images
4. **CDN**: Use a CDN for static assets
5. **Caching**: Implement Redis for session storage and caching

## Troubleshooting

### Common Issues

1. **Application not starting**
   ```bash
   sudo journalctl -u myclinic -n 50
   ```

2. **Database connection issues**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify database credentials in `.env`
   - Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`

3. **Permission issues**
   ```bash
   sudo chown -R www-data:www-data /path/to/myclinic_v1
   ```

4. **Nginx issues**
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

## Support

For deployment issues or questions:
1. Check the application logs
2. Verify all environment variables are set correctly
3. Ensure all services are running
4. Check firewall and network configuration

## Security Best Practices

1. **Keep dependencies updated**: Regularly run `npm audit` and `npm update`
2. **Environment variables**: Never commit sensitive data to version control
3. **Database security**: Use strong passwords and restrict access
4. **SSL/TLS**: Always use HTTPS in production
5. **Backups**: Regular automated backups with tested restore procedures
6. **Monitoring**: Monitor application logs and system resources
7. **User management**: Implement proper user roles and permissions