# Heritage SuperApp — Feature Backlog

> This file is the source of truth for all planned features across every team.
> Fill in each section as completely as possible. The more context you provide, the better I can implement it.

> [!IMPORTANT]
> **Database & Architecture Directives:**
> - When implementing and iterating on features, developers/agents have explicit permission to **wipe/reset the database** whenever necessary.
> - **Recreate, refactor, and reconnect entire schemas, tables, migrations, and seed scripts** cleanly to match the optimal data models without needing backward-compatibility hacks for temporary local data.

---

## How to Write a Feature

For each feature, fill in the fields below. You can copy the template and paste it under the relevant team section.

```
### [Feature Name]

**Priority:** High | Medium | Low
**Status:** Not Started | In Progress | Done

**User Story:**
As a [role], I want to [action], so that [reason/benefit].

**Who can use this:**
List the roles that have access (e.g. church_admin, team_lead, resident_pastor, member, guest).

**What it looks like (UI):**
Describe the page or component — is it a table, a modal, a form, a card grid, a chart?
Where does it live in the sidebar / which page?

**What it does (behaviour):**
Step-by-step description of what happens when the user interacts with this feature.
Include edge cases, validation rules, error states.

**Data needed:**
What information needs to be stored or fetched?
Are there relationships to other entities (e.g. member → team, child → parent)?

**Backend notes (optional):**
Any specific API endpoints, filters, or business logic you expect on the server side.

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

---

## Teams

### 📋 Information Center Team
> Manages visitor registration, member directory, attendance tracking, foundation class recommendation, books & merchandise store, and announcements. Scoped strictly to the local church.

#### 1. Visitor / First-Timer Intake & Profile Capture

**Priority:** High  
**Status:** Done  

**User Story:**  
As an Information Center Worker, I want to capture complete details for first-time church visitors on a mobile, tablet, or desktop interface, so that their initial visit is properly documented and ready for membership workflows.

**Who can use this:**  
`info_center_worker`, `info_center_lead`, `church_admin` (scoped strictly to local church).

**What it looks like (UI):**  
- Lives under sidebar: **Information Center > New Visitor**.
- Responsive wizard / card-based intake form optimized for tablets and mobile devices.
- Fields:
  - First Name, Last Name (Required)
  - Phone Number (Required, with real-time duplicate check)
  - Gender (Required: Male / Female)
  - First Date of Attendance (Defaults to current service date/today)
  - Residential Address / Area (Required)
  - Email Address (Optional)
  - Prayer Request / Special Notes (Textarea, Optional)
  - Who Invited You? (Searchable member dropdown by Name or Phone Number with fallback for free-form text if not a registered member)

**What it does (behaviour):**  
1. When typing a phone number, the system checks for existing records in the local church.
2. **Duplicate Handling:** If phone number already exists:
   - Displays modal: *"Visitor Record Found: [First Name] [Last Name] (First visited on [Date], Total Visits: [X])"*.
   - Gives the worker two options: **Update Profile Info** or **Mark as Subsequent Visit (e.g. 2nd/3rd Timer)** without duplicating the master profile.
3. On successful submission:
   - Creates/Updates the Visitor profile with initial status `First Timer` and visit count = 1.
   - Logs the service attendance record for today's service.
   - Resets the form with a success confirmation toast ready for the next visitor.
   - **Note:** Does *not* trigger external SMS (outbound communication is owned by Membership Team).

**Data needed:**  
- `visitors` / `members`: `id`, `church_id`, `first_name`, `last_name`, `phone_number`, `gender`, `address`, `email`, `first_attendance_date`, `invited_by_member_id` (foreign key to members or text), `prayer_request`, `status` (`first_timer`, `returning_visitor`, `foundation_class_candidate`, `member`), `created_by`.
- `attendance_records`: `id`, `church_id`, `member_id`, `service_date`, `service_type`, `recorded_by`.

**Backend notes:**  
- `POST /api/v1/churches/{church_id}/info-center/visitors`
- `GET /api/v1/churches/{church_id}/info-center/visitors/check-phone?phone={phone}`
- Strict local church tenancy enforcement: workers can only query/create within their own `church_id`.

**Acceptance Criteria:**  
- [x] Responsive form works seamlessly on mobile, tablet, and desktop viewports.
- [x] Duplicate phone numbers trigger the duplicate prompt with option to record subsequent visit.
- [x] "Who invited you" allows searching registered members by name or phone, or typing a guest name.
- [x] Submission creates a visitor profile and logs service attendance.

---

#### 2. Visitor Attendance & Service Presence Tracking

**Priority:** High  
**Status:** Done  

**User Story:**  
As an Information Center Worker, I want to search and mark returning visitors present during service, so that their attendance count increments accurately and prompts next-step recommendations.

**Who can use this:**  
`info_center_worker`, `info_center_lead`, `church_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Information Center > Attendance Tracking**.
- Search bar (by Name or Phone Number) with quick-filter tabs: *All Visitors*, *First Timers*, *Returning Visitors*.
- List/Table showing: Full Name, Phone, First Visit Date, Total Attendance Count, Last Attended Date, and an instant **"Mark Present"** button.

**What it does (behaviour):**  
1. Worker searches for a visitor who walked in.
2. Worker clicks **"Mark Present"** for the current service.
3. System increments their attendance count and logs the date/service.
4. If the new attendance count reaches or exceeds the local church's configured Foundation Class threshold (configured by `church_admin`), a badge appears: *"Eligible for Foundation Class"*.

**Data needed:**  
- `attendance_records` linking `member_id`, `service_date`, `service_id`.
- Total visits aggregate calculation or cached `visit_count` on profile.

**Backend notes:**  
- `POST /api/v1/churches/{church_id}/info-center/attendance/mark`
- `GET /api/v1/churches/{church_id}/info-center/visitors?query=...`

**Acceptance Criteria:**  
- [x] Worker can quickly search and mark a visitor present in under 3 clicks.
- [x] Prevents double-marking attendance for the same visitor on the same service date.
- [x] Automatically flags profiles that hit the Foundation Class attendance threshold.

---

#### 3. Foundation Class Recommendation & Membership Handoff

**Priority:** High  
**Status:** Done  

**User Story:**  
As an Information Center Worker / Lead, I want to review visitors who have met attendance criteria and recommend them for Foundation Class, so that they automatically appear as actionable tasks for the Membership Team.

**Who can use this:**  
`info_center_worker`, `info_center_lead`, `church_admin`.

**What it looks like (UI):**  
- Tab menu item under **Information Center > Foundation Class Recommendations** (also mirrored in **Membership Team > Inflow Queue**).
- Displays candidates filtered by meeting the attendance threshold (configurable by `church_admin`, e.g., 2 or 3 visits).
- Table columns: Visitor Name, Phone, Address, Total Visits, Dates Attended, Inviter, Worker Notes, Action Button (**"Recommend for Foundation Class"**).

**What it does (behaviour):**  
1. Shows all visitors whose attendance count >= configured threshold who haven't yet been handed off.
2. Worker can add an optional recommendation note (e.g., *"Eager to join choir, regular at Sunday second service"*).
3. Clicking **"Recommend for Foundation Class"**:
   - Updates visitor status to `foundation_class_candidate`.
   - Creates a pending **To-Do item** on the **Membership Team Dashboard** (e.g., *"Follow up with [Name] for upcoming Foundation Class cohort"*).
   - Removes them from the Information Center pending recommendation list.

**Data needed:**  
- `church_settings`: `foundation_class_min_attendance` (integer, default e.g. 2).
- `member_lifecycle_stages`: `stage` (`foundation_class_candidate`), `transitioned_by`, `transitioned_at`, `handoff_notes`.
- `team_todos`: `id`, `church_id`, `target_team` (`membership`), `title`, `description`, `entity_type` (`member`), `entity_id`, `status` (`pending`, `completed`).

**Backend notes:**  
- `POST /api/v1/churches/{church_id}/info-center/foundation-recommendations/{member_id}`
- Triggers creation of `team_todos` record for the Membership team.

**Acceptance Criteria:**  
- [x] Church Admin can configure the threshold number of visits in Church Settings.
- [x] Eligible visitors appear in the recommendation tab across both Information Center and Membership Team tabs.
- [x] Submitting recommendation immediately pushes an actionable To-Do onto the Membership Team dashboard.

---

#### 4. Books & Merchandise Inventory & Transfer Sales Tracker

**Priority:** Medium  
**Status:** Not Started  

**User Story:**  
As an Information Center Worker, I want to manage local church inventory for books (primarily authored by the General Overseer) and merchandise (T-shirts, hoodies, caps) and record sales paid via bank transfer, so that stock is tracked and transfer receipts are logged.

**Who can use this:**  
`info_center_worker`, `info_center_lead`, `church_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Information Center > Books & Merchandise**.
- **Inventory Tab:** Catalog grid/table showing Item Image/Thumbnail, Title/Name, Category (*Book*, *Apparel*, *Accessory*), Unit Price (₦), Available Stock Quantity, Low Stock Alert badge.
- **Record Sale Modal:**
  - Item selector & Quantity
  - Total Amount (auto-calculated)
  - Buyer Name & Phone Number (Optional / Search Member)
  - Payment Method: **Bank Transfer** (Fixed)
  - Transfer Reference / Transaction ID / Upload Proof of Payment Screenshot
- **Sales History Tab:** Chronological table of all completed sales with date, worker name, items, amount, and payment reference.

**What it does (behaviour):**  
1. Local church manages its own items (Add new book/merch, edit price, adjust stock quantity).
2. When recording a sale:
   - Worker selects item(s) and quantity.
   - Enters transfer reference/proof.
   - On submit, system verifies sufficient stock, deducts inventory count, and logs the transaction.
   - If stock drops to 0, item is marked *Out of Stock*.

**Data needed:**  
- `inventory_items`: `id`, `church_id`, `name`, `category`, `description`, `price`, `stock_quantity`, `low_stock_threshold`, `image_url`, `created_at`.
- `inventory_sales`: `id`, `church_id`, `item_id`, `quantity`, `unit_price`, `total_amount`, `payment_method` (`transfer`), `payment_reference`, `proof_url`, `buyer_name`, `buyer_phone`, `recorded_by_user_id`, `created_at`.

**Backend notes:**  
- `GET/POST /api/v1/churches/{church_id}/inventory`
- `POST /api/v1/churches/{church_id}/inventory/sales`
- Isolated per local church (no cross-branch stock mixing).

**Acceptance Criteria:**  
- [ ] Local church workers can add, update, and track stock for books and merch.
- [ ] Records sales exclusively via Bank Transfer with transfer reference / receipt tracking.
- [ ] Deducts stock automatically upon sale confirmation and prevents sales when out of stock.

---

#### 5. Local Church Announcements Hub & Expiration Manager

**Priority:** Medium  
**Status:** Not Started  

**User Story:**  
As an Information Center Worker / Church Minister, I want a centralized announcements hub where active church announcements can be viewed during service and broadcast to the Member Dashboard, with automatic expiration dates so obsolete announcements disappear.

**Who can use this:**  
- Create/Edit/Archive: `info_center_lead`, `church_admin`, `resident_pastor`.
- View during service: `info_center_worker`, `resident_pastor`, `ministers`.
- View on Member Dashboard: `member`, `steward`.

**What it looks like (UI):**  
- **Admin/Worker View (Information Center > Announcements):**
  - List of active, scheduled, and expired announcements.
  - "New Announcement" modal: Title, Category (*Service Alert*, *Program*, *Departmental*, *General*), Body/Description, Target Audience (*All*, *Stewards*, *Workers*), Priority (*Normal*, *Urgent*), Active Start Date/Time, Expiration Date/Time, Optional Attachment/Flyer.
- **Service Bulletin View:** Clean, distraction-free presenter view for ministers/workers reading announcements during service.
- **Member Dashboard View:** Announcements widget/carousel on the member home screen showing currently active items.

**What it does (behaviour):**  
1. Admin/Worker creates an announcement with an expiration date/time.
2. While `current_time` is between `start_date` and `expiration_date`, announcement appears on the active list and Member Dashboard.
3. Once expired, system automatically moves it to the *Expired/Archived* tab and hides it from the Member Dashboard.

**Data needed:**  
- `announcements`: `id`, `church_id`, `title`, `content`, `category`, `priority`, `target_audience`, `flyer_image_url`, `start_date`, `expiration_date`, `is_active`, `created_by`.

**Backend notes:**  
- `GET/POST /api/v1/churches/{church_id}/announcements`
- `GET /api/v1/churches/{church_id}/announcements/active` (queried by Member Dashboard and Service Bulletin).

**Acceptance Criteria:**  
- [ ] Active announcements appear on both Information Center Service view and Member Dashboard.
- [ ] Automatically hides announcements once expiration date passes.
- [ ] Scoped strictly to the member's / worker's local church.

---

#### 6. (Future Version 3) Self-Service QR Visitor Intake Kiosk

**Priority:** Low (V3 Planned)  
**Status:** Not Started  

**User Story:**  
As a First-Time Visitor, I want to scan a QR code on the church screen or seat flyer with my smartphone, so that I can fill out my first-timer details self-service without waiting for a physical worker.

**Who can use this:**  
`guest` (public form via tokenized local church URL), `info_center_worker`.

**What it looks like (UI):**  
- Mobile web landing page branded with Heritage of Faith International Church + Local Church branch name.
- Simple, friendly mobile questionnaire.

**What it does (behaviour):**  
- QR code points to `https://app.heritageoffaith.org/welcome/{church_slug}`.
- Submits visitor record directly into the local church's Information Center queue with tag `source: self_service_qr`.

**Acceptance Criteria:**  
- [ ] Public mobile web form loads quickly on any smartphone browser without requiring app login.
- [ ] Seamlessly integrates into local church Information Center incoming visitor list.


---

### 👥 Membership Team
> Manages the full member lifecycle from First-Timer to Stewardship: profile enrichment, call CRM follow-ups, cohort-based discipleship training, pseudo-team volunteering, celebration reminders, and situation reports.

#### 1. Member Profile Enrichment & Maker-Checker Approval Queue

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Membership Team Worker, I want an actionable To-Do queue of member profiles missing critical information, so that I can update their complete details with changes reviewed and approved by the Membership Team Lead before updating the live record.

**Who can use this:**  
- Propose Edits (Maker): `membership_worker`, `membership_assistant_team_lead`.
- Review & Approve (Checker): `membership_team_lead`, `membership_assistant_team_lead`, `church_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Membership > Incomplete Profiles (To-Do Queue)**.
- Badge count indicating pending profile completion tasks.
- **Profile Edit Form:**
  - First Name, Last Name (Surname)
  - Email, Phone Number
  - Home Address, Gender
  - Date of Birth: Day (int: 1–31) and Month (int: 1–12) captured separately and reconstructed in frontend.
  - Marital Status (Single, Married, Widowed, Divorced)
  - Wedding Anniversary: Day (int: 1–31) and Month (int: 1–12) if married
  - Occupation, Primary Team, Sector, Volunteering Team
  - Emergency Contact Name & Emergency Contact Phone Number
  - Medical Notes, Allergies
  - Current Stage in Membership Journey
  - *Note:* `photo_url` is strictly updated by the member themselves via Member Dashboard.
- **Maker-Checker Approval Drawer:** Team Lead view showing side-by-side diff (Original vs Proposed Changes) with **"Approve Changes"** and **"Reject with Feedback"** buttons.

**What it does (behaviour):**  
1. System automatically generates a "Complete Profile" To-Do whenever a member profile is missing any critical field (`first_name`, `last_name`, `phone_number`, `date_of_birth_day`, `date_of_birth_month`, `marital_status`, `wedding_anniversary_day`/`month` if married, or `current_stage`).
2. When a Membership Worker inputs missing data, it creates a pending change request (`profile_change_requests`).
3. The Team Lead or Assistant Lead receives a notification in their approval queue.
4. Upon Lead approval, the member's master profile is updated and the To-Do is marked resolved.

**Data needed:**  
- `members` table schema: `date_of_birth_day`, `date_of_birth_month`, `marital_status`, `wedding_anniversary_day`, `wedding_anniversary_month`, `occupation`, `emergency_contact_name`, `emergency_contact_phone`, `allergies`, `medical_notes`, `sector_id`, `team_id`, `volunteering_team_id`, `current_stage`.
- `profile_change_requests`: `id`, `church_id`, `member_id`, `requested_by`, `reviewed_by`, `status` (`pending`, `approved`, `rejected`), `payload` (JSON diff), `rejection_reason`, `created_at`, `reviewed_at`.

**Backend notes:**  
- `GET /api/v1/churches/{church_id}/membership/todos/incomplete-profiles`
- `POST /api/v1/churches/{church_id}/membership/members/{id}/propose-update`
- `POST /api/v1/churches/{church_id}/membership/change-requests/{id}/review`

**Acceptance Criteria:**  
- [ ] Automatically generates To-Dos when critical fields are missing.
- [ ] Captures Day and Month for birthdays and anniversaries as separate integers.
- [ ] Enforces Maker-Checker workflow: worker submissions remain pending until approved by Lead or Assistant Lead.
- [ ] Member photo upload is strictly restricted to member self-service.

---

#### 2. First-Timer Follow-Up CRM, Manual Delegation & Weekly Pastor Collation

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Membership Team Lead / Caller, I want first-time guests manually assigned to team callers, so that workers can welcome them, record call feedback notes, send templated SMS, and collate a weekly summary for the Resident Pastor.

**Who can use this:**  
- Assign Calls: `membership_team_lead`, `membership_assistant_team_lead`.
- Call & Log Notes: `membership_worker`, `membership_assistant_team_lead`.
- Weekly Report Review: `resident_pastor`, `church_admin`.

**What it looks like (UI):**  
- **Lead Dashboard (Membership > Call Allocation):** List of unassigned first-timers; batch/single assign dropdown to choose callers; ability to appoint active members as `assistant_team_lead`.
- **Worker Call Screen (Membership > My Assigned Follow-ups):**
  - Card view of assigned first-timers with Phone, First Visit Date, Inviter info, and Prayer Request.
  - **Quick Action Bar:** Direct Call trigger + **"Send SMS"** drawer with pre-configured templates (*"Welcome to Heritage"*, *"Service Reminder"*, *"Foundation Class Invitation"*).
  - **Call Summary Modal:** Log call date/time, call outcome status, conversation summary notes, and prayer items.
  - **My Historical Follow-ups Tab:** Longitudinal view of all first-timers previously assigned to the worker with live badge tracking their current stage (up to Stewardship).
- **Weekly Pastoral Collation (Membership > Weekly Pastor Report):** Aggregated digest of total first-timers received, total called, summary highlights, and pastoral intervention flags.

**What it does (behaviour):**  
1. Information Center handoffs arrive in the Membership Inflow Queue.
2. Team Lead or Assistant Lead assigns batches of first-timers to callers.
3. Worker calls the guest, logs the call summary note, and optionally triggers a templated SMS.
4. The system aggregates all call notes for the week into an executive summary automatically ready every Monday for the Resident Pastor's review.
5. The assigned caller can permanently follow their assignees' spiritual growth across stages.

**Data needed:**  
- `first_timer_assignments`: `id`, `church_id`, `member_id`, `assigned_to_user_id`, `assigned_by_user_id`, `status` (`pending`, `contacted`, `unreachable`, `completed`), `created_at`.
- `call_logs`: `id`, `church_id`, `member_id`, `caller_id`, `call_date`, `outcome`, `summary_notes`, `pastoral_escalation_needed` (bool).
- `sms_outbound_logs`: `id`, `church_id`, `recipient_phone`, `template_key`, `content`, `sent_by`, `sent_at`, `status`.

**Backend notes:**  
- `POST /api/v1/churches/{church_id}/membership/assignments/batch`
- `POST /api/v1/churches/{church_id}/membership/call-logs`
- `POST /api/v1/churches/{church_id}/membership/sms/send-template`
- `GET /api/v1/churches/{church_id}/membership/reports/weekly-pastoral-summary?week={week}`

**Acceptance Criteria:**  
- [ ] Team Lead and Assistant Lead can manually assign first-timers to specific callers.
- [ ] Callers can log structured call summary notes and dispatch templated SMS messages.
- [ ] Callers retain a dedicated history tab tracking their assignees' progress through Stewardship.
- [ ] Weekly collation report automatically generates for the Resident Pastor.

---

#### 3. Discipleship Academy Pipeline & Continuous Assessment Engine

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Discipleship Training Coordinator / Teacher, I want to manage cohort classes and track continuous student assessments across all stages (Foundation Class -> Sunday School Modules 1-3 -> Membership Class -> Stewardship), so that students are systematically evaluated without written exams.

**Who can use this:**  
- Manage Cohorts & Teachers: `training_coordinator`, `membership_team_lead`, `church_admin`.
- Grade & Record Attendance: `class_teacher` (Stewards/MIT/Leaders assigned to class).
- View Own Progress: `member`.

**What it looks like (UI):**  
- Lives under sidebar: **Membership > Discipleship Academy**.
- **Cohort Overview:** Active batches (e.g. *"Q2 2026 Foundation Class Cohort"*, *"Sunday School Module 1 - Batch B"*), Start Date, Assigned Teachers, Student Roster.
- **Continuous Assessment Gradebook:**
  - 1. Class Assignment (Weight: 20%)
  - 2. Verbal Assessment (Weight: 20%)
  - 3. Class Participation (Weight: 20%)
  - 4. Discipler's Report Form (Weight: 20% - tracks Devotion Consistency, Church Attendance, Evangelism Participation, Engagement Score)
  - 5. Proof of Note (Weight: 10%)
  - 6. Attendance (Weight: 10% - 6 total classes per module)
  - **Total Score:** Auto-computed out of 100%. Pass mark: **50%**.
- **Attendance & Makeup Management Tab:**
  - Class session tracker (Session 1 to 6).
  - Flags students with <= 3 attended classes (<=50%) as *"Must Retake Module"*.
  - Flags students who missed 1–2 classes as *"Eligible for Makeup Class"* at Coordinator's discretion.

**What it does (behaviour):**  
1. Foundation Class eligibility is fed from Information Center recommendations; SMS/call announcements are dispatched for cohort start dates.
2. Progression strict hierarchy:
   - Must complete Foundation Class -> Unlocks Sunday School Module 1.
   - Sunday School Module 1 -> Module 2 -> Module 3 -> Membership Class -> Full Stewardship.
   - *(Note: HSOM and MIT are managed outside this standard membership pipeline)*.
3. Continuous assessment scores are entered weekly by teachers.
4. When student achieves >= 50% total score and meets attendance requirements:
   - System certifies the module as completed.
   - Automatically advances member stage to the next module.

**Data needed:**  
- `academy_cohorts`: `id`, `church_id`, `module_type` (`foundation_class`, `sunday_school_module_1`, `sunday_school_module_2`, `sunday_school_module_3`, `membership_class`), `cohort_name`, `start_date`, `end_date`, `status` (`enrolling`, `active`, `completed`).
- `cohort_enrollments`: `id`, `cohort_id`, `member_id`, `teacher_id`, `status` (`enrolled`, `passed`, `makeup_required`, `retake_required`, `dropped`).
- `continuous_assessments`: `id`, `enrollment_id`, `assignment_score` (0-20), `verbal_assessment_score` (0-20), `participation_score` (0-20), `disciplers_report_score` (0-20), `proof_of_note_score` (0-10), `attendance_score` (0-10), `total_score` (0-100), `discipler_devotion_rating`, `discipler_evangelism_rating`, `makeup_completed` (bool).

**Backend notes:**  
- `POST /api/v1/churches/{church_id}/membership/cohorts`
- `POST /api/v1/churches/{church_id}/membership/cohorts/{cohort_id}/enroll`
- `PUT /api/v1/churches/{church_id}/membership/enrollments/{id}/grade`
- `POST /api/v1/churches/{church_id}/membership/enrollments/{id}/graduate`

**Acceptance Criteria:**  
- [ ] Implements the 6-part weighted continuous assessment structure totalling 100% with a 50% pass mark.
- [ ] Enforces strict prerequisite progression from Foundation Class up to Membership Class.
- [ ] Enforces attendance rules: <50% (<=3 of 6 classes) triggers module retake; 1-2 missed classes flags for makeup.
- [ ] Dispatches automated/manual notifications to candidates when new cohorts are announced.

---

#### 4. Pseudo-Team Volunteering Intake & Assignment (Post-Module 2)

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Student completing Sunday School Module 2, I want to submit my preferred church service department (Choir, Ushering, Media, Protocol, etc.), so that the Membership Team can assign me to a volunteering pseudo-team to begin practical service.

**Who can use this:**  
- Submit Request: `member` (upon passing Sunday School Module 2).
- Review & Assign: `membership_team_lead`, `church_admin`, `departmental_lead`.

**What it looks like (UI):**  
- **Member Form View (Member Dashboard):** Simple preference form: 1st Choice Department, 2nd Choice Department, Talents/Skills/Experience, Availability.
- **Admin Assignment View (Membership > Volunteer Placements):**
  - Table of eligible post-Module 2 students and their preferences.
  - Action modal to assign the student to a target team under `pseudo_team` status (probationary/volunteer steward).

**What it does (behaviour):**  
1. When a student passes Sunday School Module 2, the system prompts them to fill out the Volunteer Team Selection form.
2. Membership Team reviews requests and manually assigns them to the department.
3. The assigned team lead receives notification of the new volunteer joining their department on probation.
4. Upon completing Membership Class, the student transitions from pseudo-team to full Stewardship.

**Data needed:**  
- `volunteer_applications`: `id`, `church_id`, `member_id`, `preferred_team_1_id`, `preferred_team_2_id`, `skills_notes`, `status` (`pending`, `placed`).
- `member_teams`: `member_id`, `team_id`, `role_type` (`volunteer_pseudo_team`, `full_steward`, `team_lead`).

**Backend notes:**  
- `POST /api/v1/churches/{church_id}/membership/volunteer-applications`
- `POST /api/v1/churches/{church_id}/membership/volunteer-assignments`

**Acceptance Criteria:**  
- [ ] Triggers volunteer application intake immediately upon passing Sunday School Module 2.
- [ ] Allows manual placement by Membership Team into local church departments with `pseudo_team` status.
- [ ] Automatically elevates status to full steward upon final Membership Class graduation.

---

#### 5. Milestone Celebrations & Proactive 3-Day Alert Engine

**Priority:** Medium  
**Status:** Not Started  

**User Story:**  
As a Membership Team Worker, I want automated celebration reminders 3 days before upcoming birthdays and anniversaries, plus a landmark tracker for college/university graduations, so that the church can celebrate members proactively.

**Who can use this:**  
`membership_worker`, `membership_team_lead`, `church_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Membership > Celebrations & Landmarks**.
- **Upcoming Celebrations Widget:** Filterable tabs (*Next 3 Days*, *This Week*, *This Month*, *Graduations & Milestones*).
- Cards showing Member Photo, Name, Phone, Celebration Type (*Birthday*, *Wedding Anniversary*, *Academic Graduation*), Milestone Date, and quick-action buttons (**"Send SMS"**, **"Call"**, **"Mark Celebrated"**).
- **Log Landmark Modal:** Member search, Landmark Type (*College/University Graduation*, *Childbirth*, *Career Landmark*), Institution/Details, Date.

**What it does (behaviour):**  
1. Cron job evaluates members whose `date_of_birth_day` and `date_of_birth_month` (or wedding anniversary day/month) are exactly 3 days away.
2. Generates proactive celebration alerts on the Membership Team dashboard.
3. Membership Team can send one-click personalized SMS wishes or initiate calls.
4. Graduations and special landmarks submitted by members or workers are tracked and featured in the announcements/bulletin feed.

**Data needed:**  
- `member_landmarks`: `id`, `church_id`, `member_id`, `landmark_type` (`graduation`, `childbirth`, `wedding`, `career`, `custom`), `title`, `institution_or_org`, `event_date`, `notes`, `created_by`.

**Backend notes:**  
- `GET /api/v1/churches/{church_id}/membership/celebrations/upcoming?days=3`
- `POST /api/v1/churches/{church_id}/membership/landmarks`

**Acceptance Criteria:**  
- [ ] Proactively flags celebrants 3 days in advance on the dashboard using day/month integer matching.
- [ ] Supports logging student university/college graduations and life achievements.
- [ ] Provides instant SMS messaging triggers for celebrations.

---

#### 6. Situation Reports (SitRep) & Longitudinal Pastoral Care Log

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Membership Team Worker / Team Lead, I want to file and track structured Situation Reports on members throughout their journey, so that a medical-style pastoral history is maintained, with urgent cases triggering instant email alerts to the Resident Pastor.

**Who can use this:**  
- File & View: `membership_worker`, `membership_team_lead`, `team_lead` (for stewards in their team), `resident_pastor`, `church_admin`.
- Urgent Alerts Recipient: `resident_pastor`.

**What it looks like (UI):**  
- Sub-tab on Member Profile: **Pastoral Care & SitRep History**.
- Chronological timeline displaying all historical situation reports with date, reporter, category, urgency badge, details, and follow-up outcome.
- **"Log Situation Report" Modal:**
  - Situation Category (*Health / Hospitalization*, *Bereavement*, *Childbirth*, *Academic Distress*, *Job Loss / Financial*, *Spiritual Counseling*, *Relocation*, *General*)
  - Detailed Situation Notes
  - Action Taken / Recommended Support
  - Urgent Flag toggle: **"Flag as Urgent (Instant Email to Resident Pastor)"**

**What it does (behaviour):**  
1. Worker logs a Situation Report for a member.
2. The report is permanently pinned to the member's profile timeline as a cumulative pastoral care record.
3. If marked **Urgent**:
   - System immediately sends an email alert with the SitRep details directly to the Resident Pastor of that Local Church.
4. Membership Team retains permanent visibility and tracking access even after members transition to Stewardship.

**Data needed:**  
- `situation_reports`: `id`, `church_id`, `member_id`, `category`, `notes`, `action_taken`, `is_urgent`, `filed_by_user_id`, `pastor_reviewed` (bool), `created_at`.

**Backend notes:**  
- `POST /api/v1/churches/{church_id}/membership/situation-reports`
- `GET /api/v1/churches/{church_id}/membership/members/{member_id}/situation-reports`
- Triggers SMTP email dispatch to Local Church `resident_pastor` when `is_urgent == true`.

**Acceptance Criteria:**  
- [ ] Maintains a chronological, longitudinal timeline of situation reports on member profiles.
- [ ] Supports customizable category tags and notes.
- [ ] Urgent flag dispatches immediate email notifications to the Resident Pastor.
- [ ] Membership team retains tracking access across all lifecycle stages.

---

#### 7. First-Timer Intake-to-Member Formal Profiling Pipeline (Gatekeeper Flow)

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Membership Team Worker / Lead, I want exclusive authority to review raw visitor slips from the Information Center, verify their details during follow-up, and formally profile them into the platform as official church members, so that only verified people gain platform identity.

**Who can use this:**  
`membership_worker`, `membership_assistant_team_lead`, `membership_team_lead`, `church_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Membership > Profiling Queue (Unprofiled Visitors)**.
- Table / Cards of unprofiled first-time guests received from Information Center with search & filter by Name, Phone, and Visit Date.
- **"Formally Profile Member" Modal:**
  - Prefilled with visitor data (First Name, Last Name, Phone, Gender, Address).
  - Required Intake: Verified **Email Address** (mandatory for digital platform claiming), Date of Birth (Day & Month), Marital Status, Sector/Area.
  - Action Button: **"Complete Profiling & Send Account Claim Magic Link"** (or save profile without sending link yet).

**What it does (behaviour):**  
1. Information Center creates the initial visitor slip.
2. Membership Team views the profiling queue, contacts the visitor, and completes their profile with verified email and details.
3. Clicking **"Profile Member"**:
   - Converts the visitor record into a formal `members` record.
   - Dispatches a secure, single-use **Magic Link** to the member's email so they can claim their account and set up their PIN/photo.
   - Marks the visitor slip as `profiled`.

**Data needed:**  
- `members` table: `is_profiled` (bool), `profiled_by_user_id`, `profiled_at`, `email` (unique per church/platform).
- `account_claim_tokens`: `id`, `member_id`, `token_hash`, `expires_at`, `used_at`.

**Backend notes:**  
- `GET /api/v1/churches/{church_id}/membership/unprofiled-visitors`
- `POST /api/v1/churches/{church_id}/membership/visitors/{id}/profile`
- Triggers background email dispatch with unique claim URL: `https://app.heritageoffaith.org/claim-account?token=...`.

**Acceptance Criteria:**  
- [ ] Only Membership Team and Admins have permission to formally profile members into the platform.
- [ ] Requires email address before generating account claim magic link.
- [ ] Profiling automatically transitions visitor into the permanent church member registry.

---

#### 8. Inter-Branch Member Transfer & Longitudinal History Migration

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Membership Team Lead / Church Admin, I want to transfer a member who has relocated to another Local Church branch, so that their new local church gains their profile while their complete discipleship progress, continuous assessment scores, attendance records, and pastoral situation reports migrate intact.

**Who can use this:**  
`membership_team_lead`, `church_admin` (Origin Church & Receiving Church approval).

**What it looks like (UI):**  
- Lives under sidebar: **Membership > Member Transfers**.
- **Initiate Transfer Modal (Origin Church):**
  - Member search
  - Destination Local Church dropdown (all branches under Heritage of Faith International)
  - Transfer Reason (*Relocation*, *Marriage*, *Work/School posting*)
  - Transfer Notes / Pastoral Recommendation
- **Receiving Church Transfer Inflow Queue:**
  - Table of pending inbound transfers with preview of member lifecycle stage, past teams served, and pastoral summary.
  - Action Buttons: **"Accept Transfer & Assign Local Sector"** or **"Reject / Request Clarification"**.

**What it does (behaviour):**  
1. Origin church initiates transfer; member status changes to `transfer_pending`.
2. Receiving church reviews and accepts transfer.
3. System atomic transaction:
   - Updates member's `local_church_id` to the destination branch.
   - Migrates all foreign key associations (discipleship academy grades, attendance history, past situation reports, milestones) so no history is lost.
   - Resets active team assignments in the old branch, setting stage to allow new volunteer team assignment in the new branch.
   - Logs an audit entry in `member_transfer_logs`.

**Data needed:**  
- `member_transfers`: `id`, `member_id`, `from_church_id`, `to_church_id`, `initiated_by`, `approved_by`, `status` (`pending`, `completed`, `cancelled`), `reason`, `notes`, `created_at`, `completed_at`.

**Backend notes:**  
- `POST /api/v1/churches/{church_id}/membership/transfers/initiate`
- `POST /api/v1/churches/{church_id}/membership/transfers/{id}/accept`

**Acceptance Criteria:**  
- [ ] A member can strictly belong to only ONE local church at a time.
- [ ] Full historical data (SitReps, discipleship scores, attendance) remains permanently connected to the member after transfer.
- [ ] Requires receiving church acceptance before switching active church tenancy.


---

### 🚌 Transport Team
> (Describe what this team does in your church context here)

<!-- Add features below -->


---

### 🙏 Soul / Evangelism Team
> Manages soul-winning records, follow-ups, and spiritual journals.

<!-- Add features below -->


---

### 🏛️ Administration (Church Admin)
> Cross-cutting tools available to church admins: user management, sector/local church config, reports.

<!-- Add features below -->


---

### 🔒 Super Admin & General Overseer
> Platform-level configuration: multi-branch local church provisioning, leadership invitation, branch feature flags, General Overseer 360° universal member intelligence, cross-branch executive analytics, and immutable audit logs.

#### 1. Local Church Branch Provisioning, Archival & Leadership Assignment

**Priority:** High  
**Status:** Done  

**User Story:**  
As a Super Admin, I want to create, configure, and manage Local Church branches under Heritage of Faith International Church, and assign or reassign their Resident Pastors and Church Admins, so that each branch operates with its own isolated local tenant data.

**Who can use this:**  
`super_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Super Admin > Local Churches**.
- **Branch Grid / Table:** Shows Branch Name, Slug, Physical Address, Active Resident Pastor, Church Admin, Status (*Active*, *Archived*), Total Members count, and quick actions.
- **"Provision New Branch" Modal:**
  - Branch Name (e.g. *"Heritage of Faith — Lekki Branch"*)
  - Branch Slug (e.g. `lekki`)
  - Physical Address, City, State
  - Appoint Resident Pastor (Select existing or send Invite Magic Link to Email)
  - Appoint Church Admin (Select existing or send Invite Magic Link to Email)
- **Reassign Leadership Modal:** Transfer / swap a Resident Pastor or Church Admin between branches.

**What it does (behaviour):**  
1. Super Admin fills branch information and submits.
2. System creates the `local_churches` tenant record and initializes default local configurations (default teams, discipleship stages, default attendance threshold).
3. If new emails are provided for Resident Pastor or Church Admin, the system automatically dispatches an **Executive Leadership Magic Link Invitation**.
4. Super Admin can archive a branch if merged or closed, preventing new logins while preserving historical records.

**Data needed:**  
- `local_churches`: `id`, `name`, `slug` (unique), `address`, `city`, `state`, `resident_pastor_user_id`, `church_admin_user_id`, `is_active`, `created_at`.

**Backend notes:**  
- `GET/POST /api/v1/super-admin/churches`
- `PUT /api/v1/super-admin/churches/{id}`
- `POST /api/v1/super-admin/churches/{id}/reassign-pastor`

**Acceptance Criteria:**  
- [x] Super Admin can provision new local churches and assign leadership.
- [x] Dispatches leadership invitation magic links automatically.
- [x] Supports reassigning/transferring Resident Pastors between branches.
- [x] Allows archiving branches without data loss.

---

#### 2. Executive Leadership Magic Link Invitation & Management Engine

**Priority:** High  
**Status:** Done  

**User Story:**  
As a Super Admin, I want to send secure Magic Link invitations to appoint new Super Admins, General Overseer accounts, Resident Pastors, and Church Admins, so that leadership onboarding is handled securely without manual password creation.

**Who can use this:**  
`super_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Super Admin > Leadership & Admins**.
- Table of platform leaders with Name, Email, Assigned Branch, Role (`super_admin`, `general_overseer`, `resident_pastor`, `church_admin`), Invitation Status (*Pending*, *Active*), and **"Resend Magic Link"** button.
- **"Invite Leader" Modal:** Email, First Name, Last Name, Phone, Role selector, Target Local Church (for Pastors & Church Admins).

**What it does (behaviour):**  
1. Super Admin inputs executive details and triggers invitation.
2. Backend generates a high-privilege single-use Magic Link with a 72-hour expiration and emails the invitee.
3. Invitee clicks the link, confirms their identity, creates their 4-6 digit Security PIN, and gains immediate role-gated access to their respective workspace.

**Data needed:**  
- `leadership_invitations`: `id`, `email`, `role`, `church_id` (nullable for super_admin/general_overseer), `token_hash`, `expires_at`, `status` (`pending`, `accepted`, `revoked`), `invited_by`.

**Backend notes:**  
- `POST /api/v1/super-admin/leadership/invite`
- `POST /api/v1/super-admin/leadership/resend/{id}`
- `DELETE /api/v1/super-admin/leadership/revoke/{id}`

**Acceptance Criteria:**  
- [x] Dedicated invitation pipeline for platform and branch leadership separate from general member onboarding.
- [x] Single-use token validation with automatic expiration and revoke capability.
- [x] Sets up Security PIN on initial acceptance.

---

#### 3. Granular Branch & Global Feature Flag Management

**Priority:** Medium  
**Status:** Done  

**User Story:**  
As a Super Admin, I want to enable or disable specific modules per local church (e.g. Transport, Books/Merch) as well as global platform flags (e.g. V3 QR Self-Service Kiosks, System Maintenance Mode), so that features roll out safely and adapt to individual branch capacities.

**Who can use this:**  
`super_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Super Admin > Feature Flags & Modules**.
- **Global Flags Tab:** List of platform toggles: *Self-Service QR Intake (V3)*, *Platform Maintenance Mode*, *Debug Mode*.
- **Branch Module Matrix Tab:** Table of all local branches with toggle switches for each modular team:
  - Transport Module (ON/OFF)
  - Books & Merch Store (ON/OFF)
  - Discipleship Academy (ON/OFF)
  - Soul Winning & Outreach Tracker (ON/OFF)

**What it does (behaviour):**  
1. When a module is toggled OFF for a local branch, its sidebar menu items, routes, and API endpoints are disabled for that branch's users.
2. Changes propagate instantly via cached feature flag middleware.

**Data needed:**  
- `feature_flags`: `id`, `key`, `name`, `description`, `is_global`, `default_enabled`.
- `church_feature_flags`: `church_id`, `flag_key`, `is_enabled`, `updated_by`, `updated_at`.

**Backend notes:**  
- `GET/PUT /api/v1/super-admin/feature-flags/global`
- `GET/PUT /api/v1/super-admin/feature-flags/churches/{church_id}`

**Acceptance Criteria:**  
- [x] Allows toggling specific feature modules per branch and globally.
- [x] Enforces immediate frontend menu hiding and backend route gating when a module is disabled.

---

#### 4. General Overseer 360° Universal Member Intelligence Dossier & Cross-Branch Search

**Priority:** High  
**Status:** Done  

**User Story:**  
As the General Overseer or Super Admin, I want to search and query any church member across all branches by name to view their complete 360-degree spiritual dossier, discipleship milestones, lifetime Situation Reports, and past team engagements without managing day-to-day branch clerical work.

**Who can use this:**  
`general_overseer`, `super_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Universal Intelligence > Global Member Dossier**.
- **Global Search Bar:** Instant typeahead search by Member Name or Phone Number across all local church branches.
- **360° Member Dossier Screen:**
  - Header: Photo, Full Name, Current Local Church Branch, Current Stage Badge (*First Timer*, *Foundation Class*, *Steward*, *MIT*, *Leader*).
  - **Spiritual Journey & Discipleship Tab:** Complete visual timeline of every class completed, attendance percentages, continuous assessment scores, and baptism/stewardship dates.
  - **Pastoral Situation Reports (SitRep) History:** Lifetime medical-style chronological log of every health, bereavement, counseling, and prayer situation report filed across all branches they ever attended.
  - **Service & Team Engagement Tab:** Departments served, volunteer pseudo-teams, current team roles.
  - **Evangelism & Souls Won Tab:** Total souls won, follow-up notes, and outreach participation.

**What it does (behaviour):**  
1. General Overseer searches any member name.
2. System queries across all local church databases and returns matching profiles with their current branch affiliation.
3. Opening the profile loads the complete unified spiritual history across all past branch transfers.
4. General Overseer has unrestricted read access without being burdened by local operational workflows.

**Data needed:**  
- Global cross-tenant query across `members`, `member_lifecycle_stages`, `continuous_assessments`, `situation_reports`, `member_teams`, `souls`.

**Backend notes:**  
- `GET /api/v1/general-overseer/members/search?q={query}`
- `GET /api/v1/general-overseer/members/{id}/360-dossier`

**Acceptance Criteria:**  
- [x] General Overseer can search and view complete dossiers for members in any local church.
- [x] Aggregates all lifetime SitReps, academy grades, and spiritual milestones across all branch transfers.
- [x] Read-only executive perspective without cluttering local team queues.

---

#### 5. Cross-Branch Executive Analytics & Report Generator (PDF/CSV)

**Priority:** High  
**Status:** Done  

**User Story:**  
As the General Overseer, Super Admin, or Resident Pastor, I want an executive analytics dashboard with exportable PDF/CSV reports, so that leadership can evaluate global and branch-level church health, first-timer retention, discipleship funnel efficiency, and evangelism growth.

**Who can use this:**  
- Cross-Branch Global View: `general_overseer`, `super_admin`.
- Local Church Scoped View: `resident_pastor`, `church_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Executive Intelligence > Analytics & Reports**.
- **Executive KPI Cards:**
  - Total Active Membership (Global & Per Branch)
  - Weekly Service Attendance & First-Timer Inflow
  - Discipleship Pipeline Conversion Rate (% First Timers ➔ Foundation Class ➔ Full Stewards)
  - Total Souls Won & Outreach Engagement
- **Branch Performance Comparison Table:** Side-by-side branch metrics table.
- **Export Center Modal:**
  - Report Type (*Executive Summary*, *Discipleship Pipeline Health*, *Soul Winning & Outreach Digest*, *Financial & Merchandise Summary*)
  - Date Range Filter (Weekly, Monthly, Quarterly, Annual)
  - Export Format: **PDF Executive Brief** or **CSV Raw Dataset**.

**What it does (behaviour):**  
1. Global leadership selects date range and views live cross-branch visual charts.
2. Clicking **"Export Executive Brief (PDF)"** generates a branded, executive-ready PDF report formatted for the Board of Trustees / General Overseer.
3. Resident Pastors access the exact same reporting dashboard, automatically filtered and scoped strictly to their local church.

**Data needed:**  
- Aggregate analytical queries across `attendance_records`, `visitors`, `cohort_enrollments`, `souls`, `inventory_sales`.

**Backend notes:**  
- `GET /api/v1/analytics/executive-summary` (Global for GO/Super Admin, Scoped for Resident Pastor)
- `POST /api/v1/analytics/export/pdf`
- `POST /api/v1/analytics/export/csv`

**Acceptance Criteria:**  
- [x] General Overseer & Super Admin see aggregated data across all branches; Resident Pastors see data scoped to their branch.
- [x] Visualizes discipleship pipeline conversion and retention rates.
- [x] Generates clean, downloadable PDF and CSV executive reports.

---

#### 6. Platform Security Center & Immutable Audit Trail

**Priority:** High  
**Status:** Done  

**User Story:**  
As a Super Admin, I want an immutable, tamper-evident audit log tracking all high-privilege operations (branch creation, leadership appointments, inter-branch transfers, role elevations, PIN resets), so that platform security and accountability are strictly maintained.

**Who can use this:**  
`super_admin`.

**What it looks like (UI):**  
- Lives under sidebar: **Super Admin > Audit Logs**.
- Searchable & filterable security table with columns: Timestamp, Actor Name & Email, Actor Role, Target Church, Action Category (*Auth*, *Leadership*, *Branch*, *Transfer*, *Config*), Description, IP Address / User Agent, and Metadata JSON drawer.

**What it does (behaviour):**  
1. Any sensitive action taken across the platform automatically records an immutable event in `audit_logs`.
2. Super Admin can filter by date range, specific actor, action type, or branch.
3. Audit logs cannot be updated or deleted from the application.

**Data needed:**  
- `audit_logs`: `id`, `actor_user_id`, `church_id` (nullable), `action`, `resource_type`, `resource_id`, `details` (JSON), `ip_address`, `user_agent`, `created_at`.

**Backend notes:**  
- `GET /api/v1/super-admin/audit-logs`
- Middleware automatically logs all state-changing mutations on administrative endpoints.

**Acceptance Criteria:**  
- [x] Automatically records all high-privilege actions with actor, IP, timestamp, and payload diffs.
- [x] Read-only view with rich search and filtering.


---

## Global / Cross-Team Features

> Features that apply across all teams or the whole app: Authentication, Onboarding Wizard, PIN Security, Multi-Role Access & Delegation, and System Notifications.

#### 1. Pre-Profiled Magic Link Onboarding & Welcome Activation Wizard

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Profiled Church Member, I want to receive a secure Magic Link in my email, click it to claim my account, verify my information, set up my security PIN, and upload my profile photo, so that I gain access to my member dashboard.

**Who can use this:**  
`member` (Profiled by Membership Team), `guest` (for un-profiled rejection handling).

**What it looks like (UI):**  
- **Login / Account Claim Screen:**
  - Email input field with **"Send Login / Claim Link"** button and **"Sign in with Google"** option.
  - **Friendly Un-profiled Rejection Modal:** If an un-profiled email is entered:
    *"We couldn't find your record. Please visit the Information Center at church or reach out to the Membership Team."*
- **Welcome Activation Wizard (Multi-step Flow):**
  - **Step 1: Welcome & Identity Verification:** Confirms First Name, Last Name, Local Church branch.
  - **Step 2: Profile Photo Upload:** Upload personal profile picture (`photo_url` is strictly managed by member).
  - **Step 3: Security PIN Setup:** Create a 4 or 6-digit numeric Security PIN with PIN confirmation.
  - **Step 4: Optional Google Account Linking:** One-tap button to link their Google OAuth for subsequent 1-click logins.
  - **Step 5: Completion:** Direct launch into the Member Dashboard.

**What it does (behaviour):**  
1. Membership Team profiles the member and triggers the claim email.
2. Member clicks the single-use Magic Link (`/claim-account?token=...`).
3. Backend validates token expiration (e.g. valid for 48 hours, single-use).
4. Member completes the Welcome Wizard:
   - Sets hashed Security PIN.
   - Uploads profile image.
   - System provisions full platform `user` credentials linked to `member_id`.
   - Generates persistent JWT session.

**Data needed:**  
- `users`: `id`, `church_id`, `member_id`, `email`, `pin_hash`, `is_active`, `last_login_at`.
- `auth_magic_links`: `id`, `email`, `token_hash`, `type` (`claim_account`, `login`), `expires_at`, `used_at`.

**Backend notes:**  
- `POST /api/v1/auth/magic-link/request`
- `POST /api/v1/auth/magic-link/verify`
- `POST /api/v1/auth/onboarding/complete`

**Acceptance Criteria:**  
- [ ] Strictly rejects un-profiled users with the required friendly notice to visit the Information Center.
- [ ] Magic links expire after designated timeframe and cannot be reused once claimed.
- [ ] Onboarding wizard forces Security PIN creation and allows member photo upload.
- [ ] Links user record directly to existing member database record.

---

#### 2. Security PIN & Biometric Quick-Login Engine

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Member or Worker, I want to authenticate quickly using my 4-to-6 digit Security PIN (or device Biometrics on mobile), so that I can securely unlock my app without re-typing magic links or passwords every session.

**Who can use this:**  
`member`, `worker`, `team_lead`, `church_admin`, `super_admin`.

**What it looks like (UI):**  
- Lock screen / PIN keypad overlay:
  - 4 or 6 circular indicator dots.
  - Responsive numeric keypad (0-9) with backspace and biometric (Face ID / Fingerprint) icon.
  - *"Forgot PIN?"* link (triggers magic link reset to registered email).

**What it does (behaviour):**  
1. When session requires re-authentication (e.g. app reopened, sensitive action, or session lock):
2. Prompts user for their Security PIN.
3. Compares hashed PIN with salt in database / secure enclave.
4. If entered incorrectly 5 consecutive times, locks account temporarily for 15 minutes and sends security alert to email.
5. On successful PIN verification, issues refreshed session token.

**Data needed:**  
- `users.pin_hash`, `users.failed_pin_attempts`, `users.pin_locked_until`.

**Backend notes:**  
- `POST /api/v1/auth/pin/verify`
- `POST /api/v1/auth/pin/reset-request`
- `POST /api/v1/auth/pin/reset`

**Acceptance Criteria:**  
- [ ] Secure bcrypt/argon2 hashing of PIN with rate-limiting and temporary lockout after 5 failed attempts.
- [ ] Seamless PIN reset flow via email magic link.
- [ ] Enables rapid, frictionless mobile authentication.

---

#### 3. Multi-Role Management, Team Lead Permission Delegation & Sector Leadership Engine

**Priority:** High  
**Status:** Not Started  

**User Story:**  
As a Church Leader or Worker, I want the system to support holding multiple roles simultaneously, allow the Resident Pastor full branch oversight, place Church Admin directly beneath the Resident Pastor, give Team Leads full departmental authority with granular toggleable delegation to Assistant Leads, enable Sector Leaders to pastor local cells, and give all leaders standard Steward capabilities.

**Who can use this:**  
- Full Platform Config: `super_admin`.
- Full Local Church Oversight: `resident_pastor`.
- Local Church Operations & Role Assignment: `church_admin`.
- Departmental Delegation: `department_lead` (Choir, Transport, Media, Ushering, Membership, Info Center, etc.).
- Sector Pastoring: `sector_lead`.
- Serving Tier: `steward`, `member`.

**What it looks like (UI):**  
- **Resident Pastor Executive Cockpit:**
  - High-level overview dashboard with drill-down tabs into every department (Info Center, Membership, Academy, Transport, Evangelism, Finance/Merch) with all branch metrics visible in real time.
- **Team Lead Delegation Matrix (Department Settings > Access & Delegation):**
  - List of assigned department workers and appointed `assistant_team_lead`(s).
  - Granular toggle checklist for Assistant Leads:
    - [x] Review & Approve Profile Changes (Checker)
    - [x] Batch Assign First-Timers to Callers
    - [x] View Department Situation Reports
    - [ ] Approve Inter-Branch Transfers (Lead-only lock)
    - [x] Manage Department Roster & Duty Attendance
- **Sector Leader Dashboard (Sectors > My Sector):**
  - Directory of all members residing in their geographic neighborhood/sector.
  - Sector attendance and local cell meeting tracker.
  - Ability to log pastoral situation reports on sector members.
- **Multi-Role Role Switcher (Top Navigation Bar):**
  - If a user has multiple roles (e.g. Choir Lead + Membership Worker + Sunday School Teacher), an instant switcher dropdown allows switching active workspace views without logging out.

**What it does (behaviour):**  
1. **Hierarchy Model:**
   - `super_admin` > `resident_pastor` > `church_admin` > `department_lead` > `assistant_team_lead` (custom toggles) > `steward` > `member`.
   - `resident_pastor` has unrestricted read and oversight access across all teams and data in their local church.
   - `church_admin` sits beneath `resident_pastor` and manages operational configurations.
   - All `department_lead`, `assistant_team_lead`, and `sector_lead` roles inherently inherit all standard `steward` capabilities (soul-winning logging, personal dashboard, etc.).
2. **Granular Delegation:**
   - Team Leads can appoint Assistant Leads and explicitly toggle which specific permissions are granted.
3. **Multi-Role Aggregation:**
   - Permissions are additive. The API middleware evaluates the active context role or combined role permissions for each endpoint.

**Data needed:**  
- `user_roles`: `user_id`, `church_id`, `role_name`, `team_id` (nullable), `sector_id` (nullable), `assigned_by`, `created_at`.
- `team_delegated_permissions`: `id`, `team_id`, `user_id`, `permission_key` (`approve_profiles`, `assign_calls`, `view_sitreps`, `edit_roster`, `approve_transfers`), `is_enabled`, `updated_by`.
- `sectors`: `id`, `church_id`, `name`, `code`, `sector_lead_user_id`, `meeting_location`, `created_at`.

**Backend notes:**  
- `GET/POST /api/v1/churches/{church_id}/roles`
- `PUT /api/v1/churches/{church_id}/teams/{team_id}/delegations/{user_id}`
- `GET /api/v1/churches/{church_id}/sectors/{sector_id}/members`

**Acceptance Criteria:**  
- [ ] Users can be assigned multiple roles across different teams/sectors.
- [ ] Resident Pastor has global read/oversight visibility across all local church teams.
- [ ] Church Admin sits beneath Resident Pastor in permissions.
- [ ] Team Leads can toggle granular permission switches for Assistant Leads.
- [ ] Sector Leaders have a dedicated pastoral view for members in their geographic sector.
- [ ] All leaders inherit baseline Steward functionality.


---

## Notes & Open Questions

> Use this section to capture anything unclear, decisions pending, or things to discuss.

-
