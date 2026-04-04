# VANCA PATINA - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration

#### Backend (.env)
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000` or custom production port
- [ ] `DB_URL=<production_mongodb_uri>`
- [ ] `JWT_SECRET=<strong_random_secret_min_32chars>`
- [ ] `RAZORPAY_KEY_ID=<production_razorpay_key>`
- [ ] `RAZORPAY_KEY_SECRET=<production_razorpay_secret>`
- [ ] `RAZORPAY_WEBHOOK_SECRET=<production_webhook_secret>`
- [ ] `CLOUDINARY_NAME=<cloudinary_cloud_name>`
- [ ] `CLOUDINARY_KEY=<cloudinary_api_key>`
- [ ] `CLOUDINARY_SECRET=<cloudinary_api_secret>`
- [ ] `EMAIL_USER=<noreply_email_address>`
- [ ] `EMAIL_PASS=<email_app_password>`
- [ ] `FRONTEND_URL=<production_frontend_url>` (comma-separated if multiple)
- [ ] `CLIENT_URL=<production_frontend_url>`
- [ ] `API_BASE_URL=<production_api_url>`
- [ ] `COMPANY_NAME=Vanca Patina`
- [ ] `COMPANY_GST_NUMBER=07AAXFV7534R1ZU`
- [ ] `COMPANY_ADDRESS=HOUSE NO PVT-5 PLOT NO-26, KIRTI NAGAR, DELHI`
- [ ] `COMPANY_SUPPORT_EMAIL=support@vancapatina.com`

#### Frontend (.env)
- [ ] `VITE_API_BASE_URL=<production_api_url>`

### 2. Security Hardening

- [ ] Enable HTTPS/SSL certificates (Let's Encrypt for free)
- [ ] Set strong database passwords
- [ ] Rotate JWT_SECRET monthly
- [ ] Enable Razorpay webhook signature verification (✅ Done)
- [ ] Implement request rate limiting (✅ Done in place)
- [ ] Enable Helmet security headers (✅ Enabled)
- [ ] Configure CORS strictly (✅ Configured)
- [ ] Disable X-Powered-By header (✅ Done)
- [ ] Use secure cookies (HttpOnly, Secure, SameSite flags)
- [ ] Enable MongoDB field-level encryption for sensitive data
- [ ] Implement API request validation (✅ Using Zod)
- [ ] Add request/response logging for audit trail
- [ ] Monitor failed login attempts and implement account lockout
- [ ] Use environment-specific secrets (never commit .env)

### 3. Database

- [ ] Create production MongoDB database
- [ ] Enable MongoDB authentication
- [ ] Set up database backups (daily)
- [ ] Create indexes for frequently queried fields
- [ ] Configure database replication if needed
- [ ] Test disaster recovery procedures
- [ ] Enable MongoDB activity logging
- [ ] Implement connection pooling

### 4. Payment Gateway

- [ ] Switch Razorpay from test mode to live mode
- [ ] Update all Razorpay keys and secrets
- [ ] Configure webhook for payment.captured events
- [ ] Test webhook delivery from Razorpay dashboard
- [ ] Implement payment reconciliation script
- [ ] Set up transaction logging and monitoring
- [ ] Test payment failure handling
- [ ] Verify invoice generation on successful payment

### 5. Email Service

- [ ] Configure production SMTP server
- [ ] Test email delivery (verify, password reset, invoice)
- [ ] Set up email templates
- [ ] Configure sender email address authenticity (SPF, DKIM, DMARC)
- [ ] Set up bounce and complaint handling
- [ ] Monitor email delivery rates

### 6. File Storage

- [ ] Upload logo and company assets to Cloudinary
- [ ] Set up Cloudinary transformation settings
- [ ] Configure CDN for faster image delivery
- [ ] Test invoice PDF generation and storage
- [ ] Set up Cloudinary backup/export
- [ ] Monitor storage quotas

### 7. Frontend Optimization

- [ ] Build production bundle: `npm run build`
- [ ] Verify bundle size (should be <200KB gzipped)
- [ ] Test all pages and features in production mode
- [ ] Verify API endpoints are correctly configured
- [ ] Enable gzip compression on web server
- [ ] Configure caching headers (browser + CDN)
- [ ] Test on multiple browsers and devices
- [ ] Verify mobile responsiveness
- [ ] Test performance (Lighthouse score >90)

### 8. Backend Optimization

- [ ] Review and optimize database queries
- [ ] Implement query result caching
- [ ] Use connection pooling for database
- [ ] Enable production logging (not debug logs)
- [ ] Configure log rotation
- [ ] Monitor server resource usage
- [ ] Test API response times under load
- [ ] Verify all endpoints are secure (require auth where needed)

### 9. Monitoring & Logging

- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure performance monitoring (e.g., New Relic)
- [ ] Set up uptime monitoring
- [ ] Create dashboard for key metrics
- [ ] Configure alerts for critical errors
- [ ] Monitor Razorpay payment failures
- [ ] Track invoice generation failures
- [ ] Monitor email delivery failures

### 10. Testing

- [ ] Run full test suite
- [ ] Test signup flow end-to-end
- [ ] Test email verification link
- [ ] Test password reset flow
- [ ] Test checkout and payment with test card
- [ ] Verify invoice generation and emailing
- [ ] Test admin dashboard functionality
- [ ] Test order status updates
- [ ] Test user dashboard and order history
- [ ] Test error handling for edge cases
- [ ] Test rate limiting
- [ ] Test CORS with production origin

### 11. Documentation

- [ ] Document API endpoints
- [ ] Document environment variables
- [ ] Document deployment procedure
- [ ] Document disaster recovery procedure
- [ ] Document scaling procedure
- [ ] Document troubleshooting guide
- [ ] Document payment gateway configuration
- [ ] Document email template customization

### 12. Deployment

- [ ] Choose hosting platform (AWS, DigitalOcean, Heroku, etc.)
- [ ] Set up CI/CD pipeline
- [ ] Configure auto-scaling if needed
- [ ] Set up load balancing if needed
- [ ] Test deployment procedure
- [ ] Create rollback procedure
- [ ] Set up database migration procedure
- [ ] Test blue-green or canary deployment

### 13. Backup & Disaster Recovery

- [ ] Configure automated database backups
- [ ] Test backup restoration
- [ ] Set up off-site backup replication
- [ ] Document RTO (Recovery Time Objective)
- [ ] Document RPO (Recovery Point Objective)
- [ ] Create incident response plan
- [ ] Test failover procedures

### 14. Legal & Compliance

- [ ] Privacy Policy is accurate and visible
- [ ] Terms & Conditions are finalized
- [ ] Refund/Return Policy is defined
- [ ] Shipping Policy is defined
- [ ] GST compliance verified
- [ ] PCI-DSS compliance verified (if processing cards)
- [ ] GDPR compliance verified (if EU customers)
- [ ] Cookie policy is documented

## Key Production Changes Made

### 1. Brand Renaming ✅
- Replaced "Vanca Interio" with "Vanca Patina" across:
  - Frontend UI (8 files updated)
  - Email templates
  - Invoice templates
  - Database configurations

### 2. Payment System Cleanup ✅
- Removed PayPal and COD payment methods
- Kept only Razorpay
- Updated Order model enum
- Updated validation schemas
- Added idempotency protection for duplicate webhooks

### 3. Invoice Generation ✅
- Updated invoice template to match PDF reference layout
- Implemented GST calculation (9% CGST + 9% SGST)
- Changed invoice numbering format: VP-YYYY-XXXX
- Added comprehensive invoice sections:
  - Company header
  - Consignee/Buyer information
  - Product itemization
  - Tax breakdown
  - Declaration and signature areas
- Integrated PDF generation via Puppeteer
- Automatic email delivery on payment success

### 4. Signup Flow ✅
- Email verification required before login
- Strong password validation (8+ chars, upper, lower, number, special char)
- Token expiry implemented (1 hour for verification, 30 min for password reset)
- Duplicate user prevention
- Clear error messages for all failure scenarios

### 5. Security Hardening ✅
- Helmet security headers enabled
- Rate limiting on all routes
- CORS strictly configured
- Request validation with Zod
- JWT token expiry: 15 minutes
- Refresh token: 7 days
- Account verification before login
- Account lockout for blocked users

### 6. Code Quality ✅
- Removed unused dependencies references
- Error handling middleware in place
- Async/await properly implemented
- No unhandled promise rejections
- Console.logs limited to test/utility files
- Comments added for complex logic

## Deployment Commands

### Backend Deployment
```bash
# Install dependencies
npm install

# Run migrations if needed
npm run migrate:images

# Start server
npm start

# Development
npm run dev
```

### Frontend Deployment
```bash
# Build production bundle
npm run build

# Preview production build
npm run preview

# Deploy to hosting
# (Specific commands depend on hosting platform)
```

## Health Check Endpoints

### Backend
- `GET /` - API running check
- `GET /api/auth/me` - Current user check (requires auth)
- `GET /api-docs` - Swagger documentation

### Frontend
- Test homepage loads
- Test login/signup redirects correctly
- Test product catalog loads

## Post-Deployment Verification

1. [ ] Frontend loads without errors
2. [ ] API is accessible and responsive
3. [ ] User can signup and verify email
4. [ ] User can login after verification
5. [ ] User can add products to cart
6. [ ] Checkout processes successfully
7. [ ] Payment gateway integration works
8. [ ] Invoice generates after payment
9. [ ] Invoice email is sent to customer
10. [ ] Admin dashboard is accessible
11. [ ] All API endpoints are secure
12. [ ] Rate limiting is working
13. [ ] Error handling displays appropriate messages
14. [ ] Database connections are stable
15. [ ] Monitoring and logging are active

## Support & Maintenance

### Weekly Tasks
- Monitor error rates and logs
- Check payment reconciliation
- Verify email delivery
- Review customer support queries

### Monthly Tasks
- Review and optimize database queries
- Rotate secrets and API keys
- Analyze user engagement metrics
- Plan feature releases

### Quarterly Tasks
- Security audit
- Performance audit
- Compliance review
- Capacity planning

## Emergency Contacts

- DevOps Lead: [Contact]
- Database Admin: [Contact]
- Payment Gateway Support: Razorpay (support@razorpay.com)
- Email Service Support: Gmail/SendGrid support
- Hosting Provider Support: [Contact]

---

**Last Updated**: April 2026
**Version**: 1.0
**Status**: Production Ready
