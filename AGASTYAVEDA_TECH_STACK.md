# Agastyaveda — Technical Stack & Engineering Standards

## 1. Project Overview
Agastyaveda is a small-scale digital clinic and ecommerce website for **Dr. Ankita Gawai, BAMS, MD (Ayurvedic Doctor)**.

The system has a public website plus two authenticated areas: **Patient Dashboard** and **Admin Dashboard**.

The actual consultation is **not hosted inside Agastyaveda**. A confirmed appointment stores an external consultation URL and the system sends the date, time and link by email and/or WhatsApp.

The MVP must remain simple and maintainable for a solo developer.

## 2. Core Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5 | Structure |
| Styling | CSS3 | Design/responsive UI |
| Frontend logic | Vanilla JavaScript | Interactions/API calls |
| Backend | Node.js + Express.js | REST API/business logic |
| Database | MongoDB Atlas | Application data |
| Authentication | Clerk | Signup/login/session/account management |
| Payments | Razorpay | Product and appointment payments |
| Product images | Cloudinary | Product image storage/optimization |
| Patient documents | Amazon S3 | Private medical/patient files |
| Maps | Google Maps Platform | Address/map selection |
| Email | Amazon SES | Transactional email |
| Consultation | External video link | Actual consultation |
| Source control | GitHub | Version control |
| Containers | Docker | Local/production consistency |

## 3. Stack Constraints
### Frontend
Use only HTML, CSS and Vanilla JavaScript for MVP. Use Fetch API and ES modules where useful. Do not introduce React/Next/Vue/Angular for this version.

### Backend
Use one Express application. Keep controllers, services, models, validators, integrations and middleware organized, but avoid microservices.

Suggested structure:
```text
server/
├── src/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── validators/
│   ├── integrations/
│   │   ├── clerk/
│   │   ├── razorpay/
│   │   ├── cloudinary/
│   │   ├── s3/
│   │   └── ses/
│   ├── utils/
│   └── app.js
└── server.js
```

### Database
MongoDB Atlas is the source of truth for products, appointments, users, orders and other application data. Do not hard-code product prices/descriptions in frontend JavaScript.

## 4. Authentication and Authorization
Use Clerk for signup, login, logout, email verification, password reset and session management.

Use roles:
```text
patient
admin
```

Clerk authenticates identity; Express authorizes access. Never trust a frontend role value.

Every protected request must check authentication, role where applicable, and resource ownership.

Do not build custom password/session infrastructure for MVP.

## 5. API Areas
Suggested REST API groups:
```text
/api/users/*
/api/patients/*
/api/availability/*
/api/appointments/*
/api/consultations/*
/api/documents/*
/api/prescriptions/*
/api/products/*
/api/orders/*
/api/payments/*
/api/addresses/*
/api/notifications/*
/api/admin/*
```

## 6. Payment Architecture
Use Razorpay for appointment and product payments.

The browser must never be authoritative for price, tax, shipping, stock, appointment fee or payment success.

```text
Frontend selects IDs/quantities/slot
        ↓
Backend fetches current database values
        ↓
Backend validates availability/stock
        ↓
Backend calculates authoritative amount
        ↓
Backend creates Razorpay order
        ↓
Customer pays
        ↓
Razorpay result/webhook
        ↓
Backend verifies signature/webhook
        ↓
Database state updated
```

Implement idempotent payment handling. Repeated webhooks or client retries must not create duplicate orders/appointments.

## 7. Appointment Architecture
Admin controls:
- working days
- working hours
- break periods
- consultation duration
- consultation fee
- blocked dates/holidays

Patients see available slots only.

Appointment states:
```text
AVAILABLE
HELD
PAYMENT_PENDING
CONFIRMED
RESCHEDULED
CANCELLED
COMPLETED
NO_SHOW
```

The booking operation must be race-condition safe. Two patients attempting the same slot simultaneously must result in one successful reservation only.

Use MongoDB atomic operations/transactions and appropriate indexes. Never rely only on the frontend availability state.

## 8. External Consultation Links
The appointment contains:
```text
consultationLink
```

The admin can add/update the link. It may point to Google Meet, Zoom, WhatsApp or another external service.

Agastyaveda does not implement WebRTC or video infrastructure in MVP. Recording is out of scope.

Notifications should include appointment date/time and link but not unnecessary medical details.

## 9. Product Images
Use Cloudinary for product photos.

Admin must be able to:
- upload multiple images
- select primary image
- reorder images
- replace/remove images
- publish/unpublish products

Validate image MIME type, extension and size. Never expose Cloudinary secrets to the frontend.

## 10. Patient Documents
Use a **private** Amazon S3 bucket for patient/medical documents.

Preferred access flow:
```text
Authenticated request
        ↓
Backend checks authorization/ownership
        ↓
Backend creates temporary signed URL
        ↓
Private S3 object accessed
```

Never use publicly readable URLs for medical documents.

Do not expose predictable document paths. Add file-size/type controls and consider malware scanning before production.

S3 free-tier/pricing eligibility must be verified at deployment; do not design the business around permanent free storage.

## 11. Google Maps
Use Google Maps for product delivery address/location selection and clinic location.

For checkout, allow:
- address search/autocomplete
- map point selection
- confirmed address
- latitude/longitude when needed

Do not continuously track GPS.

## 12. Email
Use Amazon SES for transactional messages:
- appointment confirmation
- reminder
- cancellation/reschedule
- consultation link available
- payment confirmation
- order confirmation
- order status
- admin notifications

Do not put sensitive medical details into ordinary email notifications.

SES pricing/limits must be verified for the production account.

## 13. Security Requirements
Server-side validation is the security boundary.

Validate:
- required fields
- types
- lengths
- allowed values
- numeric ranges
- product IDs
- appointment IDs
- quantities
- file type/size
- authorization/ownership

Apply rate limiting to sensitive endpoints such as authentication-related operations, appointment creation, document upload, contact/support forms and payment-related actions.

Production errors must not reveal stack traces, database errors, secrets, file paths or sensitive patient information.

Use HTTPS, secure headers, correct CORS, secret management and request size limits.

## 14. Secrets
Never commit real credentials to GitHub.

Typical environment variables:
```text
NODE_ENV=
PORT=
MONGODB_URI=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_SES_FROM_EMAIL=
GOOGLE_MAPS_API_KEY=
```

Provide `.env.example`; never commit `.env` with real values.

## 15. Audit Logging
Record important sensitive/admin actions, such as:
- admin viewed patient information
- admin accessed patient document
- appointment modified
- product created/edited/deactivated
- price changed
- order status changed
- refund operation
- permission/role change

## 16. Testing Priorities
Test:
- authentication and role checks
- patient A vs patient B ownership
- direct unauthorized API calls
- double-booking race conditions
- duplicate payment webhook
- payment success with frontend disconnect
- abandoned payment
- stock changes during checkout
- product price changes after cart add
- unauthorized document access
- invalid/oversized uploads
- cancellation/rescheduling edge cases

## 17. Engineering Rule
Use this workflow:
```text
Plan
→ Implement
→ Review architecture
→ Validate server-side
→ Secure authentication
→ Implement authorization
→ Protect APIs
→ Secure secrets/config
→ Test abuse and edge cases
→ Deploy
→ Monitor
→ Patch
```

Do not treat AI-generated code as production-safe without review.
