# Agastyaveda — Product Requirements Document

## 1. Product Overview

**Product:** Agastyaveda

**Doctor:** Dr. Ankita Gawai, BAMS, MD

**Business:** Small-scale Ayurvedic consultation practice with self-made/doctor-managed products.

Agastyaveda combines a public clinic website, appointment booking, patient portal, and product ecommerce.

The actual medical/video consultation is **external**. Agastyaveda sends a consultation URL after confirmation rather than implementing video calling.

---

# 2. Product Goal

Enable a patient to independently complete normal digital workflows:

```text
Discover doctor/services
→ Create account
→ Book an available appointment
→ Pay consultation fee
→ Receive confirmation and consultation link
→ Attend external consultation
→ View relevant consultation history/documents
→ Browse products
→ Purchase products
→ Provide delivery address/map location
→ Pay
→ Track order
```

Human involvement remains appropriate for genuine business/clinical work such as conducting the consultation, packing products, changing availability, or handling exceptions. The developer should not be required to manually modify source code/database for normal operations.

---

# 3. Target Users

## Patient
A customer/patient who can manage their own account, appointments, consultation information, documents, addresses, orders and purchases.

## Admin
A trusted business/doctor-side user with full management access for the MVP.

Admin capabilities include appointment management, patient management, product CRUD, product photo management, order management, consultation-link management, availability and basic content/settings.

---

# 4. MVP Scope

## Public Website
- Home
- Doctor profile/about
- Services/consultation
- How consultation works
- Product catalog
- Product detail pages
- Contact
- Clinic/location map
- FAQ
- Privacy Policy
- Terms & Conditions
- Refund/Cancellation Policy
- Shipping/returns information as applicable
- Teleconsultation information/consent

## Authentication
- Signup
- Login
- Logout
- Email verification
- Password reset
- Profile/account management
- Clerk-based authentication

## Patient Dashboard
- Dashboard overview
- Profile
- Appointments
- Appointment details
- Consultation history
- Documents
- Prescriptions/consultation documents when provided
- Orders
- Addresses
- Settings

## Appointment System
- Admin-defined availability
- Date selection
- Time-slot selection
- Consultation fee
- Booking
- Razorpay payment
- Confirmation
- Cancellation/rescheduling as configured
- External consultation link
- Email notification
- Optional WhatsApp communication

## Ecommerce
- Products
- Product details
- Product images
- Cart
- Checkout
- Delivery address
- Google Maps location picker
- Razorpay payment
- Optional COD
- Order history
- Admin order management

## Admin
- Secure admin authentication
- Overview dashboard
- Patient management
- Appointment calendar/list
- Availability management
- Consultation link management
- Product CRUD
- Product image upload/edit/reorder/remove
- Stock/price/publication management
- Order management
- Basic content/settings
- Audit logs

---

# 5. Explicitly Out of Scope for MVP

Do not build unless requirements change:

- Embedded video calling
- WebRTC infrastructure
- Video recording
- Product authenticity/batch-verification system
- Multi-doctor marketplace
- Mobile app
- Subscription engine
- AI diagnosis
- AI medical chatbot
- Advanced loyalty/rewards
- Advanced BI analytics
- Complex enterprise role hierarchy
- Multi-country tax/payment platform

The MVP intentionally uses an external video consultation link.

---

# 6. Consultation Journey

```text
Visitor
  ↓
Book Consultation
  ↓
Login / Signup
  ↓
Patient information
  ↓
Choose date
  ↓
Choose available slot
  ↓
Review consultation fee
  ↓
Razorpay payment
  ↓
Server verifies payment
  ↓
Appointment CONFIRMED
  ↓
Confirmation email
  ↓
Consultation link sent when available
  ↓
External video consultation
  ↓
Doctor/admin records appropriate outcome
  ↓
Patient sees relevant history/documents
```

---

# 7. Product Purchase Journey

```text
Browse product
  ↓
View details
  ↓
Add to cart
  ↓
Login when required
  ↓
Checkout
  ↓
Enter delivery address
  ↓
Choose/confirm map location
  ↓
Backend re-checks price/stock
  ↓
Razorpay
  ↓
Payment verified
  ↓
Order confirmed
  ↓
Email confirmation
  ↓
Admin processes order
  ↓
Order status updated
```

---

# 8. Authentication Requirements

Use Clerk.

Protected routes/pages require authentication. Protected APIs require backend authentication checks.

Roles:
```text
patient
admin
```

A patient must never access admin endpoints.

Patients can access only their own resources.

Do not rely on frontend route hiding as security.

---

# 9. Patient Profile Requirements

Minimum profile can include:
- full name
- email
- phone
- date of birth where needed
- gender where appropriate
- address
- city
- state
- PIN code

Keep medical intake separate from basic account registration. Do not collect unnecessary health data.

---

# 10. Appointment Requirements

Admin controls:
- working days
- working hours
- appointment duration
- consultation fee
- breaks
- blocked dates
- holidays

Patient can:
- choose date
- see available slots
- select one slot
- pay
- receive confirmation
- cancel/reschedule when allowed

Appointment states:
```text
PAYMENT_PENDING
CONFIRMED
RESCHEDULED
CANCELLED
COMPLETED
NO_SHOW
```

Temporary internal state may be:
```text
HELD
```

---

# 11. Appointment Race Condition Requirement

This is a critical acceptance requirement.

Scenario:
```text
Patient A selects 5:00 PM.
Patient B selects 5:00 PM.
Both submit nearly simultaneously.
```

Expected:
```text
Only one booking succeeds.
```

The backend must perform an atomic/transaction-safe reservation and final availability check. The frontend must never be considered authoritative.

Also safely handle:
- payment started but abandoned
- payment succeeds while browser disconnects
- duplicate client submission
- duplicate webhooks
- appointment blocked by admin during payment
- cancellation during payment

---

# 12. Payment Requirements

Use Razorpay.

Two payment categories:
1. consultation
2. products

Backend calculates the authoritative payable amount.

For products:
```text
current database price × quantity
+ applicable charges
+ applicable shipping
= order amount
```

Do not trust a client-provided price or total.

Payment handling must verify provider signatures/webhooks and be idempotent.

---

# 13. Product Requirements

Admin-managed product fields:
```text
name
category
shortDescription
fullDescription
price
mrp (if applicable)
ingredients
benefits
usage
stock
published
images
```

Admin must be able to create, edit, publish, unpublish, deactivate, update price, update stock, upload multiple images, reorder images and remove images.

No developer/source-code edit should be required for ordinary product changes.

Do not implement product-authenticity/batch verification in MVP.

Product claims and regulatory classification must be reviewed before real-world sale; do not design the system around unverified medical guarantees.

---

# 14. Cart Requirements

Support:
- add item
- quantity increase/decrease
- remove
- clear cart
- subtotal
- applicable tax
- shipping
- total

A browser cart can be used for user experience, but checkout must re-fetch current product price/availability from the backend.

---

# 15. Checkout Requirements

Fields:
```text
full name
phone
email
address line 1
address line 2
city
state
PIN
latitude/longitude when map selection is used
delivery instructions
```

Google Maps integration should provide address search/selection. Do not continuously track GPS.

---

# 16. Order Requirements

Suggested states:
```text
PENDING_PAYMENT
PAID
PROCESSING
SHIPPED
DELIVERED
CANCELLED
REFUND_PENDING
REFUNDED
```

Patient sees:
- order ID
- items
- purchase amount
- payment status
- order status
- delivery address
- order date

Store purchase-time snapshots of product name and unit price so historical orders do not change when catalog data changes.

---

# 17. Consultation Link Requirements

Appointment stores:
```text
consultationLink
```

Admin can:
- add
- update
- replace
- remove

The patient may see the link when the appointment is confirmed and the link is ready.

The link can point to Google Meet, Zoom, WhatsApp or another external service.

No embedded video system is required.

---

# 18. Documents

Possible documents:
- lab reports
- previous prescriptions
- consultation attachments
- other relevant patient files

Store in private S3.

Access pattern:
```text
Authenticated request
→ authorization/ownership check
→ temporary signed URL
→ private object
```

Validate type/size. Do not use public document URLs.

---

# 19. Notifications

Email notifications:
- appointment confirmation
- appointment reminder
- cancellation/reschedule
- consultation-link available
- payment confirmation
- order confirmation
- order status
- admin alerts

WhatsApp can be manual in MVP. Automated WhatsApp can be added later.

Do not include unnecessary medical details in normal notifications.

---

# 20. Admin Dashboard Requirements

## Overview
Show:
- today's appointments
- pending appointments
- recent orders
- active products
- patient count
- important payment/order exceptions

## Appointments
Admin can view and manage calendar/list, availability, appointment state and consultation links.

## Patients
Admin can search/view authorized patient information, appointment history, consultation information and documents.

## Products
Admin can manage all product fields and images.

## Orders
Admin can view/search orders, update statuses and manage payment/refund workflows as integrated.

## Content/Settings
Admin may manage basic doctor/business content and appointment settings.

---

# 21. Data Model — Initial Collections

Suggested MongoDB collections:
```text
users
patientProfiles
doctorProfiles
appointmentSlots
appointments
consultations
prescriptions
medicalDocuments
products
orders
orderItems
payments
addresses
notifications
auditLogs
```

Keep the initial model practical. Expand only when actual requirements appear.

---

# 22. Security Requirements

The backend is the security boundary.

Required:
- server-side input validation
- authentication checks
- role-based authorization
- ownership checks
- rate limiting
- secure error handling
- secret management
- HTTPS in production
- correct CORS
- security headers
- webhook verification
- upload restrictions
- private S3
- audit logging

Important abuse tests:
```text
Patient A → request Patient B data
Patient → admin API
Unauthenticated → protected API
Changed product price in browser
Duplicate payment request
Duplicate webhook
Two users booking same slot
Guessed document URL
Oversized/malicious file
```

---

# 23. Privacy and Legal Requirements

Initial pages/flows should cover:
```text
Privacy Policy
Terms & Conditions
Refund/Cancellation Policy
Shipping/Returns Policy
Teleconsultation information/consent
Contact/Support
```

Policy text must reflect the real business and actual third-party processors/integrations.

Do not copy a US-specific checklist directly into the Indian application. Review applicable Indian healthcare, privacy, ecommerce, product and professional requirements before production launch.

---

# 24. Analytics

Keep MVP analytics minimal.

Potential non-sensitive events:
```text
page_view
product_view
add_to_cart
checkout_started
order_completed
appointment_started
appointment_booked
```

Do not send diagnoses, medical reports, or unnecessary health information to generic analytics services.

Skip session replay in MVP.

---

# 25. Edge Cases

### Authentication
- duplicate account
- expired session
- unverified account
- unauthorized API call
- patient trying admin endpoint

### Appointment
- slot already taken
- simultaneous booking
- abandoned payment
- successful payment but lost browser connection
- duplicate webhook
- admin blocks slot
- cancellation after allowed window
- reschedule to unavailable slot
- doctor unavailable
- no-show

### Ecommerce
- product removed after cart add
- product price changes
- stock changes
- quantity exceeds stock
- duplicate checkout
- payment failure
- payment success but frontend timeout
- refund

### Documents
- unsupported file
- oversized file
- unauthorized access
- expired signed URL

### Notifications
- email failure
- invalid recipient
- duplicate notification
- notification for cancelled appointment

---

# 26. Non-Functional Requirements

## Performance
- fast initial load
- optimized images
- minimal JavaScript
- efficient API/database queries
- pagination for admin tables

## Reliability
- database backups
- tested restore process
- webhook recovery
- idempotent payment/booking actions
- graceful error handling

## Maintainability
- predictable project structure
- reusable frontend components/utilities
- centralized API client/error handling
- environment configuration
- minimal duplication

---

# 27. MVP Acceptance Criteria

## Patient
- Can sign up/login/logout.
- Can manage profile.
- Can see available appointment slots.
- Cannot access another patient’s data.
- Can book an appointment.
- Cannot double-book a slot.
- Can pay consultation fee.
- Payment is server-verified.
- Receives confirmation.
- Can see an external consultation link when provided.
- Can browse products.
- Can add products to cart.
- Can checkout.
- Can choose/confirm delivery location with map.
- Can pay for product order.
- Can see their order.
- Can access only their authorized documents.

## Admin
- Can securely sign in.
- Can see overview dashboard.
- Can manage availability.
- Can manage appointments.
- Can add/update consultation links.
- Can view authorized patient information.
- Can create products.
- Can edit products.
- Can upload/edit/reorder/remove product photos.
- Can update price, stock and publication state.
- Can manage orders and order statuses.
- Sensitive actions are authorization-protected and auditable.

## System
- Real secrets are absent from GitHub.
- Backend validates all security-sensitive inputs.
- Ownership checks prevent cross-user access.
- Razorpay signatures/webhooks are verified.
- Duplicate webhooks are safe.
- Appointment race conditions are handled.
- Patient documents are private.
- Production errors do not expose internals.
- Responsive UI works on common mobile/desktop sizes.
- Policies/consent pages are present.
- Backup/restore procedure exists.

---

# 28. Recommended Build Order

```text
1. Repository/project setup
2. Global CSS/design system
3. Public pages
4. Express API skeleton
5. MongoDB connection/models
6. Clerk authentication
7. Patient profile
8. Admin role + authorization
9. Admin dashboard shell
10. Product CRUD
11. Cloudinary image uploads
12. Public product catalog
13. Cart
14. Checkout
15. Razorpay integration
16. Payment webhook verification/idempotency
17. Google Maps address picker
18. Appointment availability
19. Race-condition-safe appointment booking
20. Appointment payment
21. External consultation-link workflow
22. Email notifications
23. S3 private documents
24. Order/appointment admin management
25. Audit logs
26. Security review
27. Abuse/edge-case testing
28. Docker/deployment
29. Production test pass
```

---

# 29. MVP Timeline

For a solo developer already familiar with HTML/CSS/JS, Node.js, Express, MongoDB, AWS and Git:

```text
Full-time:   approximately 6–9 weeks
Part-time:   approximately 10–14 weeks
```

The largest risks are payment correctness, appointment race conditions, authorization, patient document security and production testing.

---

# 30. Future Expansion

Only after real usage validates the MVP:

### Phase 2
- automated WhatsApp
- richer reminders
- shipping integration
- refund automation
- better calendar workflows
- staff accounts/roles
- richer consultation records
- reporting

### Phase 3
- multi-doctor support
- mobile app
- ABDM/ABHA integrations where appropriate
- advanced patient records
- deeper automation/marketing

Do not build these before the core single-doctor workflow works reliably.
