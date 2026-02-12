# Deployment Guide - Freeman Streetwear

## Vercel Deployment

### 1. Prepare Your Supabase Project

1. Go to [Supabase](https://app.supabase.com/)
2. Create a new project
3. Go to **SQL Editor** and run the entire `supabase/schema.sql` script
4. Go to **Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Create an Admin User

After running the schema:

1. Go to **Authentication > Users** in Supabase
2. Click "Add user" and create a user with email and password
3. Copy the user's UUID
4. Go to **SQL Editor** and run:

```sql
INSERT INTO admin_users (id, email, full_name, role, active)
VALUES ('your-user-uuid', 'admin@example.com', 'Admin Name', 'admin', true);
```

### 3. Set Up MercadoPago

1. Go to [MercadoPago Developers](https://www.mercadopago.com.br/developers)
2. Create an application
3. Get your test/production credentials:
   - Public Key
   - Access Token

### 4. Configure Email (Gmail Example)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use this password in your environment variables

### 5. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

#### Option B: Using Vercel Dashboard

1. Go to [Vercel](https://vercel.com/)
2. Import your GitHub repository
3. Configure environment variables (see below)
4. Deploy!

### 6. Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx or APP_USR-xxxxx
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx or APP_USR-xxxxx

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@freemanstreetwear.com

NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

FLAT_RATE_SHIPPING=1000
```

### 7. Configure MercadoPago Webhook

After deployment:

1. Go to your MercadoPago application
2. Set the webhook URL to: `https://your-domain.vercel.app/api/webhook`
3. Subscribe to payment events

### 8. Test Your Deployment

1. Visit your deployed site
2. Try the customer flow:
   - Browse products
   - Add to cart
   - Checkout
   - Pay with MercadoPago (use test cards in test mode)
3. Try the admin flow:
   - Go to `/admin`
   - Login with your admin credentials
   - Add/edit products
   - View orders

## Production Checklist

- [ ] Configure custom domain in Vercel
- [ ] Switch MercadoPago from test to production credentials
- [ ] Configure production email service (or use a transactional email service like SendGrid)
- [ ] Set up Supabase production database backup
- [ ] Review and adjust RLS policies if needed
- [ ] Configure Supabase Storage for product images (optional)
- [ ] Set up monitoring and logging
- [ ] Test all flows thoroughly
- [ ] Document admin procedures for your team

## Troubleshooting

### Build Errors

If you see Supabase errors during build, ensure:
- Environment variables are set in Vercel
- The `.env` file is in `.gitignore` (it is by default)

### Webhook Not Working

- Verify the webhook URL in MercadoPago matches your deployed URL
- Check Vercel function logs for errors
- Ensure MercadoPago is sending events to the correct endpoint

### Email Not Sending

- Verify SMTP credentials are correct
- Check if your email provider allows SMTP access
- Review Vercel function logs for email errors

### Admin Can't Login

- Verify the user exists in `auth.users` table
- Verify the user is in `admin_users` table with `active = true`
- Check browser console for authentication errors

## Support

For issues with:
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)
- **Supabase**: [Supabase Documentation](https://supabase.com/docs)
- **MercadoPago**: [MercadoPago Developers](https://www.mercadopago.com.br/developers)
- **Vercel**: [Vercel Documentation](https://vercel.com/docs)
