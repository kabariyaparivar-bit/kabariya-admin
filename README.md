# 🏛️ Kabariya Parivar - Standalone Admin Portal

This is the independent, dedicated Admin Control Panel for the **Kabariya Parivar** community platform. It connects directly to MongoDB Atlas to manage business listings, approval workflows, events, and bulk data imports.

---

## 🚀 Key Features

1. **Independent Hosting**: Completely decoupled from the main website. Can be deployed on a separate domain (e.g. `admin.kabariyaparivar.com`, Vercel, Netlify, VPS).
2. **Direct MongoDB Atlas Sync**: Reads & writes directly to the `kabariyaparivar` database (`businesses`, `events`, `admins` collections). Any approval made here immediately reflects on the public website.
3. **60-Day JWT Session**: Secure JWT authentication that keeps admins logged in for 60 days.
4. **Business Directory Manager**:
   - 1-Click Approve / Unapprove toggle.
   - Status filters (All, Pending Review, Approved).
   - Search by business name, owner name, city, phone.
   - Full editor for dual owners, phone 2, Google Map link, visiting card, and comments.
5. **Event Management**: Create, edit, schedule, reorder, and toggle status of community events.
6. **Bulk CSV Import**: Import Google Sheet rows directly into MongoDB.

---

## 🛠️ Running Locally

### 1. Install Dependencies
```bash
cd admin-panel
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` (already pre-configured with MongoDB Atlas connection string):
```bash
# Ensure .env.local exists with:
MONGODB_URI=mongodb://kabariyaparivar_db_user:TZBX2Xvo8UGQt5L3@ac-x9mlxos-shard-00-00.45r1dny.mongodb.net:27017,ac-x9mlxos-shard-00-01.45r1dny.mongodb.net:27017,ac-x9mlxos-shard-00-02.45r1dny.mongodb.net:27017/kabariyaparivar?ssl=true&replicaSet=atlas-6k086k-shard-0&authSource=admin&retryWrites=true&w=majority
JWT_SECRET=kabariya_parivar_jwt_secret_2026_60d_auth_token_key
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=kabariya@admin2026
```

### 3. Start the Development Server
```bash
npm run dev
```
The admin portal will open on: **`http://localhost:3001`**

### 4. Default Login Credentials
- **Username**: `admin`
- **Password**: `kabariya@admin2026`

---

## 🌐 Deployment Guide (Hosting Separately)

### Option A: Deploy on Vercel (Recommended)
1. Push this repository to GitHub / GitLab / Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com) &rarr; **Add New Project**.
3. Select this repository.
4. Under **Root Directory**, click *Edit* and select **`admin-panel`**.
5. Under **Environment Variables**, add:
   - `MONGODB_URI`: `<Your MongoDB Connection String>`
   - `JWT_SECRET`: `kabariya_parivar_jwt_secret_2026_60d_auth_token_key`
   - `ADMIN_DEFAULT_USERNAME`: `admin`
   - `ADMIN_DEFAULT_PASSWORD`: `kabariya@admin2026`
6. Click **Deploy**.
7. In Vercel Project Settings &rarr; **Domains**, add your custom subdomain:
   - `admin.kabariyaparivar.com`
   - Add the CNAME record in your DNS provider (Cloudflare, GoDaddy, Namecheap):
     `CNAME` &rarr; `admin` &rarr; `cname.vercel-dns.com`

---

### Option B: Deploy on VPS / DigitalOcean / Linode / Hostinger (Node.js + PM2)
1. Upload the `admin-panel` folder to your server.
2. In the folder, install dependencies and build:
   ```bash
   cd admin-panel
   npm install
   npm run build
   ```
3. Start the process with PM2:
   ```bash
   pm2 start npm --name "kp-admin" -- start -- -p 3001
   pm2 save
   ```
4. Set up Nginx Reverse Proxy for `admin.kabariyaparivar.com`:
   ```nginx
   server {
       server_name admin.kabariyaparivar.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
5. Install SSL with Certbot:
   ```bash
   certbot --nginx -d admin.kabariyaparivar.com
   ```
