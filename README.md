# Agastyaveda

Agastyaveda is a vanilla HTML/CSS/JavaScript Ayurvedic clinic website with an Express API layer for appointments, products, orders, payments, email, authentication, and an admin overview.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Open `http://localhost:3000`. Without a `MONGODB_URI`, or when MongoDB cannot be reached during local development, the server uses an in-memory store seeded with the three catalog products. Without payment or SMTP credentials, payment orders and emails run in safe local-preview mode. In production (`NODE_ENV=production`), a MongoDB connection failure stops startup instead of silently falling back.

## Production configuration

Set these values in `.env` or your deployment secret manager:

- `MONGODB_URI` and `MONGODB_DB` for persistent data. Copy the complete URI from Atlas **Connect > Drivers**; a hostname alone is not enough.
- `CLERK_SECRET_KEY` (`sk_...`) and `CLERK_PUBLISHABLE_KEY` (`pk_...`) for Clerk session verification
- `ADMIN_ACCESS_EMAIL=agastyaaveda@gmail.com` as the exact Clerk email allowed to use the admin panel
- `ADMIN_CLERK_IDS` as an optional additional allowlist of Clerk user IDs
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and set `RAZORPAY_ENABLED=true` only when live/test payment checkout is ready
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, and `ADMIN_EMAIL`
- `CLIENT_ORIGIN` to the deployed frontend origin
- `GOOGLE_MAPS_API_KEY` for the optional interactive draggable delivery picker. Restrict this browser key by production domain and Maps JavaScript API; checkout retains a no-key fallback.
- `NODE_ENV=production`

### MongoDB Atlas IP Access List

Atlas does not read the IP Access List from this project or from `.env`. Add the public IP address of the computer running this server in Atlas:

1. Open the Atlas project that owns the cluster.
2. Go to **Security > Network Access**.
3. Select **Add IP Address**.
4. Choose **Add My Current IP Address**, or enter a specific IP/CIDR range supplied by your hosting provider.
5. Save the entry and wait for Atlas to finish applying it.

For local development, add your current public IP only. Avoid `0.0.0.0/0` unless this is a temporary, explicitly accepted development trade-off. If your ISP changes your IP, update the Atlas entry.

The backend never trusts prices from the browser: it resolves product names/IDs and current prices server-side before creating a Razorpay order. Appointment slots are protected by a unique MongoDB index on `date` and `time`.

## API surface

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/appointments`
- `POST /api/payments/verify` (disabled until `RAZORPAY_ENABLED=true`)
- `POST /api/orders`
- `POST /api/contact`
- `POST /api/webhooks/razorpay` (signature-verified lifecycle updates; disabled until configured)
- `GET /api/availability`
- `POST /api/admin/products`
- `PUT /api/admin/products/:id`
- `PATCH /api/admin/orders/:id`
- `PUT /api/admin/availability`
- `POST /api/admin/documents` (private S3 upload)
- `GET /api/admin/overview` (authenticated admin)
- `GET /api/patient/overview` (authenticated patient)
- `GET /api/patient/appointments` (authenticated patient)
- `GET /api/patient/orders` (authenticated patient)

The admin dashboard is available at `/admin.html`. In production it requires a valid Clerk session whose verified email is exactly `ADMIN_ACCESS_EMAIL`; `ADMIN_CLERK_IDS` can be used as an additional allowlist.

Patient sign-in and sign-up are available at `/auth.html`, with the patient portal at `/patient.html`. Product details and recommendations are available at `/product.html?id=PRODUCT_ID`. Checkout is available at `/checkout.html` and captures structured delivery details plus a Google Maps location pin before creating an order.

## Deployment readiness

The project is a working integration-ready MVP, not yet a production launch. Before deployment:

1. Use production Clerk keys and configure explicit `ADMIN_CLERK_IDS`.
2. Configure Razorpay live keys and test successful, failed, cancelled, duplicate, and webhook payment flows.
3. Configure SMTP/SES and verify sender-domain authentication.
4. Provision a private S3 document store and implement signed download URLs before uploading medical records.
5. Add a production Google Maps API key if an embedded interactive picker, address autocomplete, or draggable marker is required. The current checkout safely supports browser geolocation, manual latitude/longitude, and an external Google Maps chooser.
6. Add rate limiting, request validation, CSRF/origin protection where applicable, structured logging, backups, monitoring, and HTTPS.
7. Run end-to-end tests against a staging MongoDB database and Razorpay test account.

### Current manual-order setup

Razorpay is disabled by default. To run the current checkout:

1. Set `ADMIN_EMAIL` to the inbox that should receive new order and appointment notifications.
2. Configure SMTP values (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM`). Without these values, notifications are printed as local mail previews only.
3. Keep `RAZORPAY_ENABLED=false` and leave Razorpay keys empty.
4. Configure Clerk keys and put the doctor's Clerk user ID in `ADMIN_CLERK_IDS` for the admin dashboard.
5. Configure Atlas and add the server's public IP to the Atlas Network Access list.

For local development without a Clerk production instance, set `LOCAL_AUTH_BYPASS=true`. This creates a local demo patient/admin session for protected routes and must remain unset or `false` in production.

When payment is ready later:

1. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` using the Razorpay dashboard values.
2. Set `RAZORPAY_ENABLED=true`.
3. Register `https://your-domain.example/api/webhooks/razorpay` in Razorpay.
4. Restore the payment UI only after staging tests cover success, failure, duplicate webhook, cancellation, and signature rejection.

### Private medical documents

Set `AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` only in the deployment secret manager. The S3 bucket must be private with public access blocked. The admin upload endpoint accepts PDF/JPEG/PNG bytes at `POST /api/admin/documents`; include `patient-id`, `title`, `type`, and `content-type` headers. Patients receive five-minute signed download URLs only after an ownership check.

The current document APIs intentionally expose metadata only. Medical files must not be stored in MongoDB or served from the public web root.

## Product catalog management

Admins can add and edit product name, description, category, price, stock, pack size, pack unit (`g`, `kg`, `ml`, `L`, or `piece`), publish status, and image URL from `/admin.html`. Product images currently use public HTTPS image URLs so no storage service is required. The URL is rendered on the shop, product detail, and recommendation cards. For private image uploads later, connect the same fields to an object storage upload flow.

## Current checkout behavior

Razorpay is intentionally hidden and disabled. Checkout creates an `ORDER_RECEIVED` request, sends the complete order and delivery details to `ADMIN_EMAIL`, and sends a confirmation to the customer. The team contacts the customer personally for payment and delivery confirmation. When Razorpay is introduced later, set `RAZORPAY_ENABLED=true`, add the three Razorpay secrets, restore a payment UI, and test the verified callback and webhook lifecycle in staging first.

### Formspree notifications

Create three Formspree forms and add their endpoints in the local `.env` file or Railway service Variables:

```env
FORMSPREE_MESSAGES_ENDPOINT=https://formspree.io/f/messages-form-id
FORMSPREE_APPOINTMENTS_ENDPOINT=https://formspree.io/f/appointments-form-id
FORMSPREE_ORDERS_ENDPOINT=https://formspree.io/f/orders-form-id
```

Use the messages form for contact notes, the appointments form for appointment requests, and the orders form for order requests. Set each Formspree recipient to `agastyaaveda@gmail.com`, then redeploy Railway. If an endpoint is empty, that notification uses the existing SMTP admin-email fallback. Customer confirmation emails continue to use SMTP.

## Railway deployment

The repository includes [railway.toml](./railway.toml) with the Node start command and `/api/health` health check.

1. Push this project to a private GitHub repository, or use Railway's local project upload.
2. In Railway, create a project and deploy the repository.
3. Add the variables from `.env` in the Railway service **Variables** screen. Do not upload `.env` or commit it.
4. Set `NODE_ENV=production`.
5. Set `LOCAL_AUTH_BYPASS=false`. Public deployment must not use local demo authentication.
6. Keep `RAZORPAY_ENABLED=false`; the checkout remains a manual order request.
7. Add the Railway public domain to `CLIENT_ORIGIN`.
8. Add the Railway outbound IP range to MongoDB Atlas Network Access, or use the approved Atlas network configuration for the service.
9. Confirm `/api/health` returns `ok: true` and `database: true`.

### Railway MongoDB TLS troubleshooting

Railway uses dynamic outbound IPs. If the deploy log reports `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`, `ReplicaSetNoPrimary`, or MongoDB server selection failure:

1. In Atlas, open **Security > Network Access**.
2. Add `0.0.0.0/0` temporarily to confirm the cause, or use Railway's fixed egress IP option if available on your plan.
3. Keep the database user password URL-encoded in `MONGODB_URI`.
4. Copy the full Atlas **Connect > Drivers** URI, including `mongodb+srv://`, username, password, host, and query options.
5. Set `FORCE_PUBLIC_DNS=false` on Railway so Railway's resolver is used.
6. Redeploy and check `/api/health`.
7. After confirming connectivity, replace `0.0.0.0/0` with the narrowest network range supported by your Railway plan.

The server now uses IPv4, TLS, connection retries, and a sanitized production error. It does not disable certificate verification.

For a public deployment, Clerk authentication must be configured with valid keys and `ADMIN_CLERK_IDS` must contain the doctor's Clerk user ID. Without those values, protected checkout, patient, and admin operations are intentionally unavailable in production rather than falling back to insecure local access.

If the public auth page says authentication is not configured, add `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` to the Railway service Variables and redeploy. Keep `LOCAL_AUTH_BYPASS=false` on Railway.
