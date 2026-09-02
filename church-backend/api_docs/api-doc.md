# API Documentation & Integration Guide — Heritage MMC

Comprehensive API documentation, authentication workflows, email dispatch endpoints, and route reference for Heritage MMC.

---

## 1. Quick Testing via HTTP Client

Direct executable HTTP scripts are available under [`church-backend/api_docs/`](file:///Users/mac/Desktop/HeritageSuperApp/church-backend/api_docs):
* [`auth.http`](file:///Users/mac/Desktop/HeritageSuperApp/church-backend/api_docs/auth.http): Login, Google OAuth, Profile endpoints.
* [`email.http`](file:///Users/mac/Desktop/HeritageSuperApp/church-backend/api_docs/email.http): Live email template testing and leadership invitation dispatch.

---

## 2. Authentication & Leadership Onboarding

### A. Admin / Local Login
* **Endpoint**: `POST /api/auth/login`
* **Request Body**:
  ```json
  {
    "email": "admin@hofchurch.org",
    "password": "Password123@"
  }
  ```
* **Response**: Returns JWT token, roles, church context, and user profile.

### B. Google OAuth (Pre-Profiled Members & Leaders)
* **Initiation Endpoint**: `GET /api/auth/login/google?email={user_email}`
* If the user is profiled in the church database, they are redirected to Google OAuth consent and returned with `{FRONTEND_URL}/login?token={jwtToken}`.
* If not profiled, redirected to `{FRONTEND_URL}/login?error=not_profiled`.

### C. Executive Leadership Invites (Magic Link)
* **Endpoint**: `POST /api/super-admin/leadership/invite`
* **Request Body**:
  ```json
  {
    "email": "pastor.david@hofchurch.org",
    "first_name": "David",
    "last_name": "Olukayode",
    "role": "resident_pastor",
    "church_id": "<church_uuid>"
  }
  ```
* **Email Delivery**: Dispatches an automatic **Account Approved** onboarding email with a single-use claim link:
  `{FRONTEND_URL}/auth/magic-login?code={otp_code}&email={email}`

---

## 3. Email Notification & Dispatch System

### A. SMTP Transport Layer
- **Host**: `smtp.gmail.com` (Port `587` with STARTTLS)
- **Sender**: Configurable via `SMTP_FROM_NAME` and `SMTP_FROM_EMAIL` (default: `"Heritage MMC"`).

### B. Test Email Dispatcher
Super Admins can manually test and trigger any of the 10 email templates from the web UI (`/super-admin/settings` &rarr; Communication tab) or via REST API:

* **Endpoint**: `POST /api/super-admin/email/send-test`
* **Headers**: `Authorization: Bearer <SUPER_ADMIN_JWT>`
* **Request Body**:
  ```json
  {
    "template": "magic_link",
    "to_email": "josepholukayode05@gmail.com",
    "name": "Pastor Joseph"
  }
  ```

### C. Supported Email Templates

| Template Key | Purpose | Key Content & Call to Action |
| :--- | :--- | :--- |
| `magic_link` | Account Approved & Leadership Onboarding | "GET STARTED" button pointing to secure token claim page |
| `birthday` | Member Birthday Greeting | Celebratory blessing, scripture verse, resident pastor greeting |
| `otp` | Two-Factor / Sign-In Verification | 6-digit security code and 10-minute expiry warning |
| `welcome_visitor` | First-Timer / Soul Welcome | Service attended acknowledgement & upcoming midweek service details |
| `new_member_welcome` | Full Church Portal Onboarding | Assigned Member ID (`HOF-2026-XXXX`) & member dashboard CTA |
| `anniversary` | Wedding & Milestone Anniversary | Couple congratulatory note & marital scripture blessing |
| `team_assignment` | Ministry Unit / Department Roster | Assigned service unit, team lead contact & rehearsal schedule |
| `event_reminder` | Program & Special Conference Reminder | Date, time, venue auditorium details & YouTube live stream link |
| `donation_receipt` | Tithe & Kingdom Giving Receipt | Receipt number, breakdown formatted in ₦/$, transaction reference |
| `pastoral_care` | Pastoral Check-in Note | Personal pastoral care letter & confidential prayer request link |

---

## 4. Complete Backend Route Inventory

| Module | Route Prefix | Method | Endpoint | Auth / Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | `/api` | `GET` | `/health-check` | Public |
| **Auth** | `/api/auth` | `POST` | `/login` | Public |
| | | `GET` | `/login/google` | Public |
| | | `GET` | `/callback/google` | Public |
| | | `GET` | `/magic-link/verify` | Public |
| | | `POST` | `/magic-link/claim` | Public |
| | | `GET` | `/me` | Bearer Token |
| **Profile** | `/api/profile` | `GET`, `PUT` | `/me` | Bearer Token |
| | | `GET`, `POST` | `/me/kids` | Bearer Token |
| | | `PUT`, `DELETE`| `/me/kids/:kidID` | Bearer Token |
| | | `GET` | `/:userID` | Bearer Token |
| **Super Admin** | `/api/super-admin`| `GET`, `POST`| `/churches` | Super Admin |
| | | `PUT` | `/churches/:id` | Super Admin |
| | | `POST` | `/churches/:id/reassign-leadership` | Super Admin |
| | | `POST` | `/churches/:id/toggle-status` | Super Admin |
| | | `GET` | `/leadership/invites` | Super Admin |
| | | `POST` | `/leadership/invite` | Super Admin (Triggers Email) |
| | | `DELETE` | `/leadership/invites/:id` | Super Admin |
| | | `GET` | `/audit-logs` | Super Admin |
| | | `GET`, `PUT` | `/settings` | Super Admin |
| | | `GET`, `PUT` | `/settings/permissions` | Super Admin |
| | | `GET` | `/settings/diagnostics` | Super Admin |
| | | `GET`, `PUT` | `/settings/churches/:id` | Super Admin |
| | | `POST` | `/email/send-test` | Super Admin (Live SMTP Test) |
| **General Overseer**| `/api/go` | `GET` | `/members/search` | General Overseer |
| | | `GET` | `/members/:id/360-dossier` | General Overseer |
| **Analytics** | `/api/analytics` | `GET` | `/executive-summary` | Executive / Super Admin |
| **Members** | `/api/members` | `GET`, `POST`| `/` | Branch Admin / Leader |
| | | `GET`, `PUT`, `DELETE` | `/:id` | Branch Admin / Leader |
| **Teams** | `/api/teams` | `GET`, `POST`| `/` | Bearer Token |
| | | `GET`, `PUT`, `DELETE` | `/:id` | Bearer Token |
| **Sectors** | `/api/sectors` | `GET`, `POST`| `/` | Bearer Token |
| | | `GET`, `PUT`, `DELETE` | `/:id` | Bearer Token |
| **Souls** | `/api/souls` | `GET`, `POST`| `/` | Bearer Token |
| | | `GET`, `PATCH`, `DELETE` | `/:id` | Bearer Token |
| | | `GET`, `POST`| `/:id/journal` | Bearer Token |
| **Follow-Up** | `/api/follow-up` | `GET`, `POST`| `/` | Bearer Token |
| | | `GET`, `PATCH`, `DELETE` | `/:id` | Bearer Token |
| **Transport** | `/api/transportation` | `GET`, `POST`| `/` | Bearer Token |
| | | `GET`, `PATCH`, `DELETE` | `/:id` | Bearer Token |
| **Dashboard** | `/api/dashboard` | `GET` | `/admin` | Bearer Token |
