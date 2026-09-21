# Agastyaveda — Design System & UI Specification

## 1. Design Goal
Agastyaveda should feel like a **calm, trustworthy, simple Ayurvedic clinic**, not a generic ecommerce marketplace.

Visual direction:
- clean
- minimal
- natural green palette
- warm white backgrounds
- generous whitespace
- rounded cards
- subtle shadows
- simple typography
- clear CTAs
- strong mobile responsiveness

The supplied reference site's simple green Ayurvedic style is the visual baseline.

Avoid excessive animation, crowded dashboards, heavy gradients, glassmorphism, flashy ecommerce patterns and overly decorative UI.

## 2. Brand
**Agastyaveda**

**Dr. Ankita Gawai, BAMS, MD**

Positioning: a doctor-led Ayurvedic consultation and wellness product practice.

Keep consultation/service content visually distinct from physical products.

## 3. Color Tokens
Reference palette:
```css
--primary: #2c5e3a;
--primary-dark: #234a2e;
--primary-light: #e8f5e9;
--bg: #ffffff;
--bg-alt: #f7f9f7;
--text: #333333;
--text-muted: #666666;
--border: #eeeeee;
--danger: #d32f2f;
--radius: 10px;
```

Keep the palette restrained. Status colors should be used only where they communicate state.

## 4. Typography
Use a readable system font stack initially:
```css
font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
```

Hierarchy:
```text
Page title
Section title
Card title
Body
Muted metadata
Small supporting text
```

Do not depend on remote font providers for the core experience.

## 5. Global Layout
Use a centered container around 1200px maximum width, 20px page padding and consistent vertical rhythm.

Recommended radius:
```css
--radius: 10px;
```

Header is sticky. Content must never feel cramped.

## 6. Public Header
Desktop:
```text
┌───────────────────────────────────────────────────────┐
│ Agastyaveda    Home About Consultation Products      │
│ Ayurvedic      Contact                     🛒  ☾       │
│ Healing                                                │
└───────────────────────────────────────────────────────┘
```

Mobile uses a clean menu button.

Cart count should be visually small and unobtrusive.

## 7. Homepage Structure
Recommended order:
```text
Header
Hero
Doctor introduction
Consultation/services
How consultation works
Products
Why Agastyaveda
Testimonials
FAQ
Location / Map
Contact
Footer
```

Hero example:
```text
Where Ancient Wisdom Meets
Personalized Wellness

Personalized Ayurvedic consultations with
Dr. Ankita Gawai, BAMS, MD.

[Book Consultation] [Explore Products]
```

Primary CTA = Book Consultation.

## 8. Doctor Section
Show:
- professional photo
- name
- qualification
- short introduction
- care philosophy
- relevant consultation areas

Example:
```text
┌─────────────────────┬───────────────────────────┐
│                     │ About Dr. Ankita Gawai    │
│     Doctor Photo    │ BAMS, MD                  │
│                     │                           │
│                     │ Personalized Ayurvedic    │
│                     │ care...                   │
└─────────────────────┴───────────────────────────┘
```

Do not create stronger medical claims than the approved content provides.

## 9. Consultation Section
Explain the flow visually:
```text
1. Create account
      ↓
2. Choose date/time
      ↓
3. Pay consultation fee
      ↓
4. Booking confirmed
      ↓
5. Receive external video link
      ↓
6. Attend consultation
```

## 10. Booking UI
```text
Choose Date

< September 2026 >

Mon 21   Tue 22   Wed 23   Thu 24   Fri 25

Available Times

10:00 AM   10:30 AM   11:00 AM
05:00 PM   05:30 PM   06:00 PM

[Continue]
```

Unavailable slots must be visually disabled.

## 11. Authentication UI
Keep login/signup visually consistent with the public site. Clerk handles authentication functionality.

The surrounding page should be simple and trustworthy rather than looking like a separate SaaS product.

## 12. Patient Dashboard
Desktop layout:
```text
┌───────────────┬────────────────────────────────────┐
│ Agastyaveda   │ Dashboard                          │
│               │                                    │
│ Dashboard     │ Upcoming Appointment               │
│ Appointments  │                                    │
│ Consultations │ 28 Sep 2026 • 5:00 PM             │
│ Documents     │ Confirmed                          │
│ Prescriptions │                                    │
│ Orders        │ [View Appointment]                 │
│ Profile       │                                    │
│ Settings      │ Recent Orders                      │
│ Logout        │                                    │
└───────────────┴────────────────────────────────────┘
```

Mobile: sidebar becomes a menu/drawer or compact top navigation.

Keep patient dashboard information focused on actions and personal records.

## 13. Appointment Cards
```text
┌───────────────────────────────────────────┐
│ Ayurvedic Consultation                    │
│ 28 Sep 2026 • 5:00 PM                     │
│ Status: Confirmed                         │
│                                           │
│ Consultation link will be sent before     │
│ the appointment.                          │
│                                           │
│ [View Details]                            │
└───────────────────────────────────────────┘
```

When the link is available:
```text
[Join Consultation]
```

This opens the external consultation service.

## 14. Product Cards
```text
┌─────────────────────────┐
│                         │
│      PRODUCT IMAGE      │
│                         │
├─────────────────────────┤
│ Kumkumadi Glow Oil      │
│ Short product summary   │
│ ₹549                    │
│                         │
│ [View Details]          │
└─────────────────────────┘
```

Use real product photography where available. Keep cards consistent in height and spacing.

## 15. Product Detail
Desktop:
```text
┌──────────────────────┬───────────────────────────┐
│                      │ Product Name              │
│                      │ ₹549                      │
│     Main Image       │                           │
│                      │ Description               │
│                      │ Ingredients               │
│                      │ Benefits                  │
│                      │ Usage                     │
│                      │                           │
│                      │ [Add to Cart]             │
│                      │ [Buy Now]                 │
└──────────────────────┴───────────────────────────┘
```

Support multiple photos with a simple gallery.

## 16. Cart
Desktop:
```text
Products                       Order Summary

[product] x2                   Subtotal   ₹...
[product] x1                   Tax        ₹...
                                Shipping   ₹...
                                ───────────────
                                Total      ₹...

                                [Checkout]
```

Mobile stacks the summary under the products.

## 17. Checkout
Separate visually:
```text
Delivery Information
Payment
Order Summary
```

Product checkout includes address and map picker.

Example:
```text
Name
Phone
Email
Address
City
State
PIN

[Choose location on map]

Payment method
○ UPI
○ Card
○ Other supported method
○ COD (only if enabled)
```

## 18. Map Picker
```text
Delivery Location

[Search address________________]

┌─────────────────────────────┐
│                             │
│            📍               │
│       selected point        │
│                             │
└─────────────────────────────┘

[Confirm Location]
```

Do not continuously track GPS.

## 19. Admin Dashboard
Admin UI can be denser than the patient UI but must remain clear.

```text
┌───────────────┬───────────────────────────────────┐
│ Dashboard     │ Overview                          │
│ Appointments  │                                   │
│ Patients      │ [Patients] [Appointments]         │
│ Products      │ [Products] [Orders]               │
│ Orders        │                                   │
│ Availability  │ Today's Appointments              │
│ Documents     │                                   │
│ Content       │ Recent Orders                     │
│ Settings      │                                   │
└───────────────┴───────────────────────────────────┘
```

## 20. Admin Product Editor
This is a core screen.

```text
ADD / EDIT PRODUCT

Product Name       [________________________]
Category            [________________________]
Short Description   [________________________]
Full Description    [________________________]
Price               [________]
MRP                 [________]
Stock               [________]
Ingredients         [________________________]
Benefits            [________________________]
Usage               [________________________]

Product Photos
[ Upload Images ]

[ img ] [ img ] [ img ]

☐ Published

[Save Product] [Cancel]
```

Admin must be able to add/edit product name, descriptions, ingredients, benefits, usage, price, stock, photos and publication state without code changes.

## 21. Admin Appointment Calendar
```text
September 2026

Mon Tue Wed Thu Fri Sat Sun

Selected day: 28 Sep

10:00  Patient A   Confirmed
10:30  Available
11:00  Patient B   Confirmed
11:30  Blocked
```

Admin actions: block/unblock slot, reschedule, cancel, mark completed/no-show, add consultation link.

## 22. Admin Patient View
Show only information required for legitimate administration:
```text
Patient
Name
Phone
Email
Address

Appointments
Consultation History
Documents
Orders
```

Sensitive operations should be visibly deliberate and auditable.

## 23. Status Badges
Use compact badges for:
```text
Confirmed
Completed
Pending
Cancelled
No-show
Processing
Shipped
Delivered
Refunded
```

Use text plus color; never rely on color alone.

## 24. Responsive Rules
Approximate breakpoints:
```text
1200px desktop
860px tablet/small desktop
768px mobile/tablet
480px small mobile
```

At smaller widths:
- navigation collapses
- multi-column layouts stack
- dashboard sidebar becomes drawer/menu
- buttons may become full width
- tables can become cards or scroll containers
- product grid reduces columns
- checkout stacks vertically

## 25. Accessibility
Use:
- semantic HTML
- labels
- keyboard navigation
- visible focus states
- alt text
- accessible icon labels
- sufficient contrast
- non-color status meaning
- skip link when useful

## 26. Animation
Use subtle transitions only:
- hover
- small fade
- modal transitions
- toast transitions

Do not make animation a core visual feature.

## 27. Empty and Error States
Examples:
```text
No upcoming appointments

You do not have an upcoming consultation.
[Book Appointment]
```

```text
Something went wrong.
Please try again.
[Retry]
```

```text
Your cart is empty.
[Continue Shopping]
```

Never expose stack traces or technical errors to users.

## 28. Overall Visual Direction
The final experience should feel:
```text
Calm
Medical
Natural
Professional
Trustworthy
Minimal
Warm
```

The visual simplicity of the reference files should remain the baseline even as the application becomes functionally richer.
