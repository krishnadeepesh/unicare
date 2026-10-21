# 🚀 UniCare Production Deployment & Hosting Guide

UniCare is built with a **React.js** frontend, a **Django REST API** backend, and a **MySQL** database.

This guide provides tested, step-by-step instructions for 3 production hosting approaches:
1. **Option 1: Modern Cloud / Free Tier** *(Vercel for Frontend + Render for Backend + Free Managed MySQL on Aiven / Railway)* — **Easiest & Free**
2. **Option 2: Single Linux VPS / Cloud VM** *(DigitalOcean Droplet, AWS EC2, Linode, or Hetzner with Docker Compose & Nginx)* — **Recommended for Full Control**
3. **Option 3: Traditional Linux VM** *(Ubuntu 22.04 / 24.04 with Nginx + Gunicorn + Systemd + MySQL)*

---

## 📦 What Has Been Prepared For Hosting

| Component | Files Added / Updated | Purpose |
| :--- | :--- | :--- |
| **Frontend Config** | `src/apiConfig.js` | Dynamically points to `VITE_BACKEND_URL` in production or `localhost:8000` in dev |
| **Frontend Env** | `.env.example` | Template for production backend URL |
| **Backend Dependencies** | `backend/requirements.txt` | Complete production Python packages (Django, Gunicorn, WhiteNoise, PyMySQL, etc.) |
| **Production Settings** | `backend/unicare_backend/settings.py` | Configured with environment variables, WhiteNoise static files, secure CORS & CSRF |
| **Media & Uploads** | `backend/unicare_backend/urls.py` | Standalone media view serving license documents, lab PDFs, and dynamic QR cards |
| **Database Schema** | `database/unicare_schema.sql` | Complete schema DDL (27 tables) ready to import into any MySQL host |
| **Database Seed Data** | `database/unicare_seed.sql` | Baseline super admin, roles, hospital accounts, and medical departments |
| **Docker Compose** | `docker-compose.yml`, `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf` | 1-command containerized production deployment |

---

## Option 1: Modern Cloud Deployment (Render + Vercel + Aiven MySQL)

This is the fastest, zero-server-maintenance setup.

### Step 1: Set Up Free Cloud MySQL (e.g. Aiven or Railway)
1. Sign up at [Aiven.io](https://aiven.io) or [Railway.app](https://railway.app).
2. Create a free **MySQL** database instance (Name: `db_unicare`).
3. Note your connection details:
   - Host, Port (e.g. `mysql-xxxx.aivencloud.com:12345`)
   - User (e.g. `avnadmin`)
   - Password
   - Database Name (`db_unicare` or `defaultdb`)
4. Import the schema and seed data into your cloud database using any MySQL client (e.g., MySQL Workbench, DBeaver, or command line):
   ```bash
   mysql -h <host> -P <port> -u <user> -p <database_name> < database/unicare_schema.sql
   mysql -h <host> -P <port> -u <user> -p <database_name> < database/unicare_seed.sql
   ```

### Step 2: Deploy Backend to Render (or Railway)
1. Push your repository to **GitHub**.
2. Go to [Render.com](https://render.com) and create a **New Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command**: `gunicorn unicare_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 3`
5. Add **Environment Variables** in Render Dashboard:
   - `DEBUG`: `False`
   - `SECRET_KEY`: `<Generate a secure random string>`
   - `ALLOWED_HOSTS`: `*` (or your Render service domain, e.g. `unicare-backend.onrender.com`)
   - `DB_NAME`: `<your_db_name>`
   - `DB_USER`: `<your_db_user>`
   - `DB_PASSWORD`: `<your_db_password>`
   - `DB_HOST`: `<your_db_host>`
   - `DB_PORT`: `<your_db_port>`
   - `CORS_ALLOW_ALL`: `True`
6. Click **Deploy**. Once completed, copy your backend URL (e.g. `https://unicare-backend.onrender.com`).

### Step 3: Deploy Frontend to Vercel (or Netlify)
1. Go to [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variable**:
   - `VITE_BACKEND_URL`: `https://unicare-backend.onrender.com` (your backend URL from Step 2)
5. Click **Deploy**. Your UniCare platform is now live!

---

## Option 2: Single Linux VPS / Cloud VM with Docker Compose (Recommended)

Ideal for DigitalOcean Droplets (\$6/mo), AWS EC2 (t3.small / t4g.small), Linode, or Hetzner.

### Step 1: Install Docker & Git on the VPS
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl docker.io docker-compose-v2
sudo systemctl enable --now docker
```

### Step 2: Clone Repository & Configure Secrets
```bash
git clone <your-repository-url> /opt/unicare
cd /opt/unicare

# Edit docker-compose.yml to set your desired MySQL password and SECRET_KEY
nano docker-compose.yml
```

### Step 3: Start the Application
```bash
sudo docker compose up -d --build
```
> [!NOTE]
> On the first startup, MySQL automatically executes `database/unicare_schema.sql` and `database/unicare_seed.sql` to initialize all 27 tables and baseline accounts.

### Step 4: Verify Containers
```bash
sudo docker compose ps
```
Your UniCare site is now live on `http://<YOUR_VPS_IP>`!

### Step 5: (Optional) Setup Free SSL via Let's Encrypt Certbot
To point your domain (`example.com`) with HTTPS:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Option 3: Traditional Linux VM (Native Nginx + Gunicorn + MySQL)

For running natively on Ubuntu 22.04 / 24.04:

### 1. Install System Packages
```bash
sudo apt update
sudo apt install -y python3-pip python3-venv mysql-server nginx libmysqlclient-dev pkg-config nodejs npm
```

### 2. Configure MySQL
```bash
sudo mysql -e "CREATE DATABASE db_unicare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'unicare_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON db_unicare.* TO 'unicare_user'@'localhost'; FLUSH PRIVILEGES;"

# Import Schema and Seed Data
sudo mysql -u unicare_user -pStrongPassword123! db_unicare < database/unicare_schema.sql
sudo mysql -u unicare_user -pStrongPassword123! db_unicare < database/unicare_seed.sql
```

### 3. Setup Python Backend
```bash
cd /opt/unicare/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --noinput
```

### 4. Create Systemd Service for Gunicorn (`/etc/systemd/system/unicare.service`)
```ini
[Unit]
Description=UniCare Django Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/unicare/backend
ExecStart=/opt/unicare/backend/venv/bin/gunicorn \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          unicare_backend.wsgi:application
Environment="DEBUG=False"
Environment="SECRET_KEY=production-secret-key-change-me"
Environment="ALLOWED_HOSTS=*"
Environment="DB_NAME=db_unicare"
Environment="DB_USER=unicare_user"
Environment="DB_PASSWORD=StrongPassword123!"
Environment="DB_HOST=127.0.0.1"
Environment="DB_PORT=3306"
Environment="CORS_ALLOW_ALL=True"

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now unicare
```

### 5. Build Frontend Static Bundle
```bash
cd /opt/unicare
npm install
npm run build
```

### 6. Configure Nginx (`/etc/nginx/sites-available/unicare`)
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    client_max_body_size 50M;

    # Frontend Static Build
    location / {
        root /opt/unicare/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded Media Files
    location /media/ {
        alias /opt/unicare/backend/media/;
    }

    # Django Static Admin Files
    location /static/ {
        alias /opt/unicare/backend/staticfiles/;
    }
}
```
Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/unicare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔑 Default Administrator & Test Credentials

After running `database/unicare_seed.sql`, the following default logins are available:

| Role | Email / Identifier | Password | Hospital |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@unicare.com` | `SuperAdmin@123` *(or password reset)* | Platform Wide |
| **Hospital Admin** | `anil@sunrise.com` | `Admin@123` | Sunrise Hospital |
| **Doctor** | `anu@sunrise.com` | `Doctor@123` | Sunrise Hospital |
| **Nurse** | `sarah.kurian@sunrise.com` | `Nurse@123` | Sunrise Hospital |
| **Receptionist** | `neha@sunrise.com` | `Staff@123` | Sunrise Hospital |
| **Patient** | `arjun@gmail.com` *(UPID: PTA001)* | `Patient@123` | Patient Portal |
