package email

import "time"

// TemplateName represents the identifier of an email template.
type TemplateName string

const (
	TemplateMagicLink        TemplateName = "magic_link.html"
	TemplateBirthday         TemplateName = "birthday.html"
	TemplateOTP              TemplateName = "otp_verification.html"
	TemplateWelcomeVisitor   TemplateName = "welcome_visitor.html"
	TemplateNewMemberWelcome TemplateName = "new_member_welcome.html"
	TemplateAnniversary      TemplateName = "anniversary.html"
	TemplateTeamAssignment   TemplateName = "team_assignment.html"
	TemplateEventReminder    TemplateName = "event_reminder.html"
	TemplateDonationReceipt  TemplateName = "donation_receipt.html"
	TemplatePastoralCare     TemplateName = "pastoral_care.html"
)

// BaseEmailData contains standard fields present across all Heritage MMC email templates.
type BaseEmailData struct {
	ChurchName      string `json:"church_name"`
	SupportEmail    string `json:"support_email"`
	WebsiteURL      string `json:"website_url"`
	LogoURL         string `json:"logo_url"`
	CurrentYear     int    `json:"current_year"`
	PhysicalAddress string `json:"physical_address"`
	UnsubscribeURL  string `json:"unsubscribe_url,omitempty"`
	Preheader       string `json:"preheader,omitempty"`
}

// DefaultBaseData returns sensible defaults for Heritage MMC emails.
func DefaultBaseData() BaseEmailData {
	return BaseEmailData{
		ChurchName:      "Heritage of Faith Church",
		SupportEmail:    "support@hofchurch.org",
		WebsiteURL:      "https://hofchurch.org",
		LogoURL:         "https://mmc.hofchurch.org/logo-design.png",
		CurrentYear:     time.Now().Year(),
		PhysicalAddress: "Heritage of Faith Church, Lekki Center, Lagos, Nigeria",
		Preheader:       "Heritage MMC — Member Management Console",
	}
}

// MagicLinkEmailData is used for leadership invitation and passwordless sign-in.
type MagicLinkEmailData struct {
	BaseEmailData
	RecipientName string `json:"recipient_name"`
	ActionURL     string `json:"action_url"`
	Role          string `json:"role"`
	ExpiryHours   int    `json:"expiry_hours"`
	InvitedBy     string `json:"invited_by,omitempty"`
	ChurchCenter  string `json:"church_center,omitempty"`
}

// BirthdayEmailData is used for celebratory member birthday greetings.
type BirthdayEmailData struct {
	BaseEmailData
	MemberName     string `json:"member_name"`
	ScriptureVerse string `json:"scripture_verse"`
	ScriptureRef   string `json:"scripture_ref"`
	PastorMessage  string `json:"pastor_message,omitempty"`
	PastorName     string `json:"pastor_name,omitempty"`
	ChurchCenter   string `json:"church_center,omitempty"`
}

// OTPEmailData is used for two-factor authentication and security verification.
type OTPEmailData struct {
	BaseEmailData
	RecipientName string `json:"recipient_name"`
	OTPCode       string `json:"otp_code"`
	Purpose       string `json:"purpose"` // e.g. "Password Reset", "Email Verification", "Sign In"
	ExpiryMinutes int    `json:"expiry_minutes"`
	RequestIP     string `json:"request_ip,omitempty"`
}

// WelcomeVisitorEmailData is used when a first-timer or soul convert is profiled.
type WelcomeVisitorEmailData struct {
	BaseEmailData
	VisitorName        string `json:"visitor_name"`
	ServiceAttended    string `json:"service_attended"` // e.g. "Sunday Celebration Service"
	ChurchCenter       string `json:"church_center"`
	NextServiceTime    string `json:"next_service_time"`
	PastorName         string `json:"pastor_name"`
	NextStepsURL       string `json:"next_steps_url,omitempty"`
	BelieversClassInfo string `json:"believers_class_info,omitempty"`
}

// NewMemberEmailData is used when an individual is fully onboarded to the church directory.
type NewMemberEmailData struct {
	BaseEmailData
	MemberName   string `json:"member_name"`
	MemberID     string `json:"member_id,omitempty"`
	ChurchCenter string `json:"church_center"`
	PortalURL    string `json:"portal_url"`
	SupportPhone string `json:"support_phone,omitempty"`
}

// AnniversaryEmailData is used for wedding and milestone anniversaries.
type AnniversaryEmailData struct {
	BaseEmailData
	CoupleNames      string `json:"couple_names"`
	YearsCelebrating int    `json:"years_celebrating,omitempty"`
	ScriptureVerse   string `json:"scripture_verse"`
	ScriptureRef     string `json:"scripture_ref"`
	PastorMessage    string `json:"pastor_message,omitempty"`
}

// TeamAssignmentEmailData is sent when a member is assigned to a service department/unit.
type TeamAssignmentEmailData struct {
	BaseEmailData
	MemberName      string `json:"member_name"`
	TeamName        string `json:"team_name"` // e.g. "Choir", "Ushering & Protocol", "Media & Tech"
	RoleTitle       string `json:"role_title"` // e.g. "Team Member", "Assistant Team Lead"
	TeamLeadName    string `json:"team_lead_name"`
	TeamLeadEmail   string `json:"team_lead_email,omitempty"`
	MeetingSchedule string `json:"meeting_schedule,omitempty"`
	RosterURL       string `json:"roster_url,omitempty"`
}

// EventReminderEmailData is used for special programs, vigils, conferences, and services.
type EventReminderEmailData struct {
	BaseEmailData
	RecipientName string `json:"recipient_name"`
	EventTitle    string `json:"event_title"`
	EventDate     string `json:"event_date"`
	EventTime     string `json:"event_time"`
	Venue         string `json:"venue"`
	Description   string `json:"description"`
	ActionURL     string `json:"action_url,omitempty"`
	ActionText    string `json:"action_text,omitempty"`
	IsOnline      bool   `json:"is_online"`
	StreamURL     string `json:"stream_url,omitempty"`
}

// DonationReceiptEmailData is used to acknowledge tithes, offerings, building funds, and pledges.
type DonationReceiptEmailData struct {
	BaseEmailData
	DonorName       string `json:"donor_name"`
	ReceiptNumber   string `json:"receipt_number"`
	Date            string `json:"date"`
	AmountFormatted string `json:"amount_formatted"` // e.g. "₦50,000.00" or "$150.00"
	FundType        string `json:"fund_type"`        // e.g. "Tithe", "General Offering", "Kingdom Builders"
	PaymentMethod   string `json:"payment_method"`   // e.g. "Card Payment (Paystack)", "Bank Transfer"
	TransactionRef  string `json:"transaction_ref"`
	DownloadURL     string `json:"download_url,omitempty"`
}

// PastoralCareEmailData is used for pastor check-ins, prayer follow-ups, and encouragement.
type PastoralCareEmailData struct {
	BaseEmailData
	MemberName    string `json:"member_name"`
	PastorName    string `json:"pastor_name"`
	PastorTitle   string `json:"pastor_title,omitempty"`
	Message       string `json:"message"`
	PrayerLinkURL string `json:"prayer_link_url,omitempty"`
}
