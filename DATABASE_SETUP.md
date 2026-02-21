# MySQL Backend Setup Guide

## Prerequisites

1. **MySQL Server** (8.0 or higher)
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use Docker: `docker run --name mysql-online-store -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8`

2. **Node.js** (18.x or higher)

## Backend Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your MySQL credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=devapi.adaptivegis.com
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=online_store
JWT_SECRET=your-super-secret-key-change-this
```

### 3. Create Database

Log into MySQL:
```bash
mysql -u root -p
```

Create the database:
```sql
CREATE DATABASE online_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 4. Run Migrations

```bash
npm run db:migrate
```

This creates all necessary tables:
- admins
- customers & customer_addresses
- products, product_option_lists, product_options
- orders & order_items
- galleries & gallery_images
- pages, menus & menu_items
- reviews
- staff & services
- site_settings

### 5. Seed Initial Data (Optional)

```bash
npm run db:seed
```

This creates:
- Default admin user (username: `admin`, password: `admin123`)
- Sample products
- Sample galleries
- Default site settings

### 6. Start Backend Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The API will be available at: `https://devapi.adaptivegis.com/api`

## Frontend Setup

### 1. Install Dependencies

```bash
cd ..  # Back to root
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=https://devapi.adaptivegis.com/api
```

### 3. Start Frontend

```bash
npm run dev
```

Frontend will be available at: `https://dev.adaptivegis.com`

## API Endpoints

### Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/customer/register` - Customer registration
- `POST /api/auth/customer/login` - Customer login

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Galleries
- `GET /api/galleries` - List all galleries
- `GET /api/galleries/:id/images` - Get gallery images
- `POST /api/galleries` - Create gallery
- `POST /api/galleries/:id/images` - Add image to gallery
- `DELETE /api/galleries/:id` - Delete gallery
- `DELETE /api/galleries/:galleryId/images/:imageId` - Delete image

### Other Resources
Similar CRUD endpoints for:
- `/api/pages`
- `/api/reviews`
- `/api/staff`
- `/api/services`
- `/api/customers`
- `/api/orders`
- `/api/settings` (GET and PUT only)

## Database Management

### Reset Database
```bash
npm run db:reset
```

This will:
1. Drop all tables
2. Run migrations
3. Seed initial data

### Backup Database
```bash
mysqldump -u root -p online_store > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
mysql -u root -p online_store < backup_20260126.sql
```

## Security Best Practices

1. **Change default credentials** - Update admin password immediately
2. **Use environment variables** - Never commit `.env` files
3. **Strong JWT secret** - Use a long, random string
4. **HTTPS in production** - Use SSL/TLS certificates
5. **Rate limiting** - Configured by default
6. **Input validation** - All endpoints validate input
7. **SQL injection protection** - Using parameterized queries
8. **Password hashing** - Using bcrypt with 10 rounds

## Production Deployment

### Database
- Use managed MySQL service (AWS RDS, Google Cloud SQL, etc.)
- Enable automated backups
- Use read replicas for scaling

### Application
- Set `NODE_ENV=production`
- Use process manager (PM2, systemd)
- Configure reverse proxy (nginx, Apache)
- Enable HTTPS
- Set up monitoring and logging

### Example PM2 Configuration
```bash
pm2 start npm --name "online-store-api" -- start
pm2 startup
pm2 save
```

## Troubleshooting

### Connection Refused
- Check if MySQL is running: `sudo systemctl status mysql`
- Verify port 3306 is not blocked
- Check credentials in `.env`

### Migration Errors
- Ensure database exists
- Check user permissions: `GRANT ALL PRIVILEGES ON online_store.* TO 'user'@'devapi.adaptivegis.com';`

### Port Already in Use
- Change `PORT` in `.env`
- Kill process: `lsof -ti:3001 | xargs kill`

## Support

For issues or questions, check:
1. MySQL error logs
2. Application logs
3. Network connectivity
4. Environment variables
