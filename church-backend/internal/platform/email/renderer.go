package email

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"regexp"
	"strings"
	"sync"
	"time"
)

//go:embed templates/*.html
var templateFS embed.FS

// Renderer is responsible for compiling and rendering Heritage MMC email templates.
type Renderer struct {
	templates map[TemplateName]*template.Template
	mu        sync.RWMutex
}

var (
	defaultFuncs = template.FuncMap{
		"formatDate": func(t time.Time, layout string) string {
			return t.Format(layout)
		},
		"now": func() time.Time {
			return time.Now()
		},
		"upper": func(s string) string {
			return strings.ToUpper(s)
		},
		"lower": func(s string) string {
			return strings.ToLower(s)
		},
		"safeHTML": func(s string) template.HTML {
			return template.HTML(s)
		},
	}
	headRegex    = regexp.MustCompile(`(?i)<head[\s\S]*?</head>`)
	styleRegex   = regexp.MustCompile(`(?i)<style[\s\S]*?</style>`)
	scriptRegex  = regexp.MustCompile(`(?i)<script[\s\S]*?</script>`)
	htmlTagRegex = regexp.MustCompile(`<[^>]*>`)
)

// NewRenderer compiles all embedded HTML templates and returns a Renderer instance.
func NewRenderer() (*Renderer, error) {
	r := &Renderer{
		templates: make(map[TemplateName]*template.Template),
	}

	knownTemplates := []TemplateName{
		TemplateMagicLink,
		TemplateBirthday,
		TemplateOTP,
		TemplateWelcomeVisitor,
		TemplateNewMemberWelcome,
		TemplateAnniversary,
		TemplateTeamAssignment,
		TemplateEventReminder,
		TemplateDonationReceipt,
		TemplatePastoralCare,
	}

	baseContent, err := templateFS.ReadFile("templates/base.html")
	if err != nil {
		return nil, fmt.Errorf("failed to read base.html: %w", err)
	}

	for _, tName := range knownTemplates {
		childPath := fmt.Sprintf("templates/%s", tName)
		childContent, err := templateFS.ReadFile(childPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read template %s: %w", tName, err)
		}

		tmpl, err := template.New(string(tName)).Funcs(defaultFuncs).Parse(string(baseContent))
		if err != nil {
			return nil, fmt.Errorf("failed to parse base for %s: %w", tName, err)
		}

		_, err = tmpl.Parse(string(childContent))
		if err != nil {
			return nil, fmt.Errorf("failed to parse child template %s: %w", tName, err)
		}

		r.templates[tName] = tmpl
	}

	return r, nil
}

// Render renders the specified template and returns both HTML and Plaintext versions.
func (r *Renderer) Render(tName TemplateName, data any) (htmlOut string, textOut string, err error) {
	r.mu.RLock()
	tmpl, ok := r.templates[tName]
	r.mu.RUnlock()

	if !ok {
		return "", "", fmt.Errorf("template %s not found in registry", tName)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", "", fmt.Errorf("failed to execute template %s: %w", tName, err)
	}

	htmlContent := buf.String()
	plainText := htmlToPlainText(htmlContent)

	return htmlContent, plainText, nil
}

// RenderMagicLink renders the magic link / invitation email.
func (r *Renderer) RenderMagicLink(data MagicLinkEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("You have been invited to Heritage MMC as %s", data.Role)
	}
	return r.Render(TemplateMagicLink, data)
}

// RenderBirthday renders the celebratory birthday email.
func (r *Renderer) RenderBirthday(data BirthdayEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("Happy Birthday %s! Celebrating God's faithfulness in your life.", data.MemberName)
	}
	return r.Render(TemplateBirthday, data)
}

// RenderOTP renders the one-time password / security code email.
func (r *Renderer) RenderOTP(data OTPEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("Your Heritage MMC verification code is %s", data.OTPCode)
	}
	return r.Render(TemplateOTP, data)
}

// RenderWelcomeVisitor renders the first-timer / soul follow-up email.
func (r *Renderer) RenderWelcomeVisitor(data WelcomeVisitorEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("Welcome to %s, %s! We are thrilled you joined us.", data.ChurchName, data.VisitorName)
	}
	return r.Render(TemplateWelcomeVisitor, data)
}

// RenderNewMemberWelcome renders the full member directory onboarding email.
func (r *Renderer) RenderNewMemberWelcome(data NewMemberEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("Welcome to the Heritage family, %s! Access your member portal.", data.MemberName)
	}
	return r.Render(TemplateNewMemberWelcome, data)
}

// RenderAnniversary renders wedding and milestone anniversary celebrations.
func (r *Renderer) RenderAnniversary(data AnniversaryEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("Happy Wedding Anniversary %s! God bless your covenant union.", data.CoupleNames)
	}
	return r.Render(TemplateAnniversary, data)
}

// RenderTeamAssignment renders ministry and service department assignments.
func (r *Renderer) RenderTeamAssignment(data TeamAssignmentEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("You have been assigned to the %s unit at Heritage", data.TeamName)
	}
	return r.Render(TemplateTeamAssignment, data)
}

// RenderEventReminder renders church event and service reminders.
func (r *Renderer) RenderEventReminder(data EventReminderEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("Reminder: %s on %s", data.EventTitle, data.EventDate)
	}
	return r.Render(TemplateEventReminder, data)
}

// RenderDonationReceipt renders tithe, offering, and contribution receipts.
func (r *Renderer) RenderDonationReceipt(data DonationReceiptEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("Official Receipt %s for your contribution of %s", data.ReceiptNumber, data.AmountFormatted)
	}
	return r.Render(TemplateDonationReceipt, data)
}

// RenderPastoralCare renders pastoral care notes and prayer check-ins.
func (r *Renderer) RenderPastoralCare(data PastoralCareEmailData) (string, string, error) {
	if data.BaseEmailData.ChurchName == "" {
		data.BaseEmailData = DefaultBaseData()
	}
	if data.Preheader == "" {
		data.Preheader = fmt.Sprintf("A note of pastoral care and encouragement from %s", data.ChurchName)
	}
	return r.Render(TemplatePastoralCare, data)
}

// htmlToPlainText strips HTML tags and produces readable plain-text email body.
func htmlToPlainText(html string) string {
	text := headRegex.ReplaceAllString(html, "")
	text = styleRegex.ReplaceAllString(text, "")
	text = scriptRegex.ReplaceAllString(text, "")

	// Simple conversions for links and breaks
	text = strings.ReplaceAll(text, "<br>", "\n")
	text = strings.ReplaceAll(text, "<br/>", "\n")
	text = strings.ReplaceAll(text, "<br />", "\n")
	text = strings.ReplaceAll(text, "</p>", "\n\n")
	text = strings.ReplaceAll(text, "</tr>", "\n")
	text = strings.ReplaceAll(text, "</td>", " ")
	text = strings.ReplaceAll(text, "&nbsp;", " ")
	text = strings.ReplaceAll(text, "&zwnj;", "")
	text = strings.ReplaceAll(text, "&copy;", "©")
	text = strings.ReplaceAll(text, "&rarr;", "->")
	text = strings.ReplaceAll(text, "&ldquo;", "\"")
	text = strings.ReplaceAll(text, "&rdquo;", "\"")
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = htmlTagRegex.ReplaceAllString(text, "")

	// Clean up multi-lines
	lines := strings.Split(text, "\n")
	var cleaned []string
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}
	return strings.Join(cleaned, "\n\n")
}
