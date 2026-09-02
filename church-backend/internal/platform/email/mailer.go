package email

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"strings"
	"time"
)

// EmailMessage represents an outbound email payload.
type EmailMessage struct {
	To        []string `json:"to"`
	Subject   string   `json:"subject"`
	HTMLBody  string   `json:"html_body"`
	TextBody  string   `json:"text_body,omitempty"`
	FromEmail string   `json:"from_email,omitempty"`
	FromName  string   `json:"from_name,omitempty"`
	ReplyTo   string   `json:"reply_to,omitempty"`
}

// Mailer provides an abstraction for sending emails across different providers.
type Mailer interface {
	Send(ctx context.Context, msg EmailMessage) error
}

// SMTPConfig holds credentials and server parameters for SMTP dispatch.
type SMTPConfig struct {
	Host      string `json:"host"`       // e.g. "smtp.gmail.com"
	Port      int    `json:"port"`       // e.g. 587 or 465
	Username  string `json:"username"`   // e.g. "admin@hofchurch.org" or your Gmail address
	Password  string `json:"password"`   // e.g. Gmail App Password
	FromEmail string `json:"from_email"` // e.g. "no-reply@hofchurch.org"
	FromName  string `json:"from_name"`  // e.g. "Heritage MMC"
}

// SMTPMailer sends emails over SMTP (compatible with Gmail, Sendgrid, Mailgun, AWS SES, Postmark, etc.).
type SMTPMailer struct {
	config SMTPConfig
}

// NewSMTPMailer creates a new SMTPMailer.
func NewSMTPMailer(cfg SMTPConfig) *SMTPMailer {
	if cfg.FromName == "" {
		cfg.FromName = "Heritage MMC"
	}
	if cfg.Port == 0 {
		cfg.Port = 587
	}
	// Sanitize password by stripping any accidental spaces (common in Gmail App Passwords)
	cfg.Password = strings.ReplaceAll(strings.TrimSpace(cfg.Password), " ", "")
	cfg.Username = strings.TrimSpace(cfg.Username)
	cfg.Host = strings.TrimSpace(cfg.Host)
	cfg.FromEmail = strings.TrimSpace(cfg.FromEmail)

	return &SMTPMailer{config: cfg}
}

// Send dispatches an email message via SMTP.
func (m *SMTPMailer) Send(ctx context.Context, msg EmailMessage) error {
	if len(msg.To) == 0 {
		return fmt.Errorf("no recipients specified in email message")
	}

	fromAddr := msg.FromEmail
	if fromAddr == "" {
		fromAddr = m.config.FromEmail
	}
	if fromAddr == "" {
		fromAddr = m.config.Username
	}

	fromName := msg.FromName
	if fromName == "" {
		fromName = m.config.FromName
	}

	addr := fmt.Sprintf("%s:%d", m.config.Host, m.config.Port)
	boundary := fmt.Sprintf("boundary_%d", time.Now().UnixNano())

	// Build MIME message
	var rawMsg strings.Builder
	rawMsg.WriteString(fmt.Sprintf("From: %s <%s>\r\n", fromName, fromAddr))
	rawMsg.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(msg.To, ", ")))
	if msg.ReplyTo != "" {
		rawMsg.WriteString(fmt.Sprintf("Reply-To: %s\r\n", msg.ReplyTo))
	}
	rawMsg.WriteString(fmt.Sprintf("Subject: %s\r\n", msg.Subject))
	rawMsg.WriteString("MIME-Version: 1.0\r\n")
	rawMsg.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n", boundary))
	rawMsg.WriteString("\r\n")

	// Plaintext part
	if msg.TextBody != "" {
		rawMsg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		rawMsg.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
		rawMsg.WriteString("Content-Transfer-Encoding: 7bit\r\n\r\n")
		rawMsg.WriteString(msg.TextBody)
		rawMsg.WriteString("\r\n\r\n")
	}

	// HTML part
	rawMsg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	rawMsg.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	rawMsg.WriteString("Content-Transfer-Encoding: 7bit\r\n\r\n")
	rawMsg.WriteString(msg.HTMLBody)
	rawMsg.WriteString("\r\n\r\n")
	rawMsg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	bodyBytes := []byte(rawMsg.String())

	// If port is 465 (SMTPS / SSL)
	if m.config.Port == 465 {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: false,
			ServerName:         m.config.Host,
		}

		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("tls dial failed for %s: %w", addr, err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, m.config.Host)
		if err != nil {
			return fmt.Errorf("smtp client creation failed: %w", err)
		}
		defer client.Close()

		if m.config.Username != "" && m.config.Password != "" {
			auth := smtp.PlainAuth("", m.config.Username, m.config.Password, m.config.Host)
			if err = client.Auth(auth); err != nil {
				return fmt.Errorf("smtp authentication failed: %w", err)
			}
		}

		if err = client.Mail(fromAddr); err != nil {
			return fmt.Errorf("smtp MAIL FROM failed: %w", err)
		}
		for _, to := range msg.To {
			if err = client.Rcpt(to); err != nil {
				return fmt.Errorf("smtp RCPT TO failed for %s: %w", to, err)
			}
		}

		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("smtp DATA command failed: %w", err)
		}
		if _, err = w.Write(bodyBytes); err != nil {
			return fmt.Errorf("writing email body failed: %w", err)
		}
		if err = w.Close(); err != nil {
			return fmt.Errorf("closing smtp writer failed: %w", err)
		}

		return client.Quit()
	}

	// Standard STARTTLS (Port 587 or 25)
	var auth smtp.Auth
	if m.config.Username != "" && m.config.Password != "" {
		auth = smtp.PlainAuth("", m.config.Username, m.config.Password, m.config.Host)
	}

	// Custom dialer to support STARTTLS cleanly
	host, _, _ := net.SplitHostPort(addr)
	if host == "" {
		host = m.config.Host
	}

	return smtp.SendMail(addr, auth, fromAddr, msg.To, bodyBytes)
}

// LogMailer is a mock/dev mailer that logs outbound emails to console without sending network packets.
type LogMailer struct{}

// NewLogMailer creates a new LogMailer.
func NewLogMailer() *LogMailer {
	return &LogMailer{}
}

// Send logs email message details.
func (l *LogMailer) Send(ctx context.Context, msg EmailMessage) error {
	log.Printf("[LogMailer] ========================================")
	log.Printf("[LogMailer] To: %s", strings.Join(msg.To, ", "))
	log.Printf("[LogMailer] Subject: %s", msg.Subject)
	log.Printf("[LogMailer] From: %s <%s>", msg.FromName, msg.FromEmail)
	if msg.TextBody != "" {
		preview := msg.TextBody
		if len(preview) > 300 {
			preview = preview[:300] + "..."
		}
		log.Printf("[LogMailer] Plaintext Body:\n%s", preview)
	}
	log.Printf("[LogMailer] ========================================")
	return nil
}

// EmailService integrates the Renderer and Mailer for high-level email delivery workflows.
type EmailService struct {
	mailer   Mailer
	renderer *Renderer
}

// NewEmailService creates a new high-level EmailService.
func NewEmailService(mailer Mailer, renderer *Renderer) *EmailService {
	return &EmailService{
		mailer:   mailer,
		renderer: renderer,
	}
}

// SendMagicLink renders and sends a leadership / magic link invitation email.
func (s *EmailService) SendMagicLink(ctx context.Context, toEmail string, recipientName string, actionURL string, role string, churchCenter string) error {
	return s.SendMagicLinkWithData(ctx, toEmail, MagicLinkEmailData{
		RecipientName: recipientName,
		ActionURL:     actionURL,
		Role:          role,
		ChurchCenter:  churchCenter,
	})
}

// SendMagicLinkWithData sends a magic link with full custom data payload.
func (s *EmailService) SendMagicLinkWithData(ctx context.Context, toEmail string, data MagicLinkEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderMagicLink(data)
	if err != nil {
		return fmt.Errorf("failed to render magic link email: %w", err)
	}

	subject := fmt.Sprintf("Your %s Account Has Been Approved", data.ChurchName)
	if data.ChurchName == "" {
		subject = "Your Heritage MMC Account Has Been Approved"
	}

	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendBirthday renders and sends a celebratory birthday greeting email.
func (s *EmailService) SendBirthday(ctx context.Context, toEmail string, data BirthdayEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderBirthday(data)
	if err != nil {
		return fmt.Errorf("failed to render birthday email: %w", err)
	}

	subject := fmt.Sprintf("Happy Birthday %s! — From %s", data.MemberName, data.ChurchName)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendOTP renders and sends a one-time verification code email.
func (s *EmailService) SendOTP(ctx context.Context, toEmail string, data OTPEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderOTP(data)
	if err != nil {
		return fmt.Errorf("failed to render otp email: %w", err)
	}

	subject := fmt.Sprintf("%s — Your Verification Code", data.OTPCode)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendWelcomeVisitor renders and sends a first-timer / soul follow-up email.
func (s *EmailService) SendWelcomeVisitor(ctx context.Context, toEmail string, data WelcomeVisitorEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderWelcomeVisitor(data)
	if err != nil {
		return fmt.Errorf("failed to render welcome visitor email: %w", err)
	}

	subject := fmt.Sprintf("Welcome to %s!", data.ChurchName)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendNewMemberWelcome renders and sends the new member directory onboarding email.
func (s *EmailService) SendNewMemberWelcome(ctx context.Context, toEmail string, data NewMemberEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderNewMemberWelcome(data)
	if err != nil {
		return fmt.Errorf("failed to render new member welcome email: %w", err)
	}

	subject := fmt.Sprintf("Welcome to the %s Family, %s!", data.ChurchName, data.MemberName)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendAnniversary renders and sends a wedding anniversary celebration email.
func (s *EmailService) SendAnniversary(ctx context.Context, toEmail string, data AnniversaryEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderAnniversary(data)
	if err != nil {
		return fmt.Errorf("failed to render anniversary email: %w", err)
	}

	subject := fmt.Sprintf("Happy Wedding Anniversary %s! — %s", data.CoupleNames, data.ChurchName)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendTeamAssignment renders and sends a ministry unit assignment notification email.
func (s *EmailService) SendTeamAssignment(ctx context.Context, toEmail string, data TeamAssignmentEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderTeamAssignment(data)
	if err != nil {
		return fmt.Errorf("failed to render team assignment email: %w", err)
	}

	subject := fmt.Sprintf("Ministry Assignment: You Have Been Assigned to %s", data.TeamName)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendEventReminder renders and sends a special service or event reminder email.
func (s *EmailService) SendEventReminder(ctx context.Context, toEmail string, data EventReminderEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderEventReminder(data)
	if err != nil {
		return fmt.Errorf("failed to render event reminder email: %w", err)
	}

	subject := fmt.Sprintf("Reminder: %s (%s)", data.EventTitle, data.EventDate)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendDonationReceipt renders and sends a tithe/donation receipt email.
func (s *EmailService) SendDonationReceipt(ctx context.Context, toEmail string, data DonationReceiptEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderDonationReceipt(data)
	if err != nil {
		return fmt.Errorf("failed to render donation receipt email: %w", err)
	}

	subject := fmt.Sprintf("Donation Receipt %s — %s", data.ReceiptNumber, data.ChurchName)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendPastoralCare renders and sends a pastoral check-in note.
func (s *EmailService) SendPastoralCare(ctx context.Context, toEmail string, data PastoralCareEmailData) error {
	htmlBody, textBody, err := s.renderer.RenderPastoralCare(data)
	if err != nil {
		return fmt.Errorf("failed to render pastoral care email: %w", err)
	}

	subject := fmt.Sprintf("A Note of Pastoral Care and Encouragement — %s", data.ChurchName)
	return s.mailer.Send(ctx, EmailMessage{
		To:       []string{toEmail},
		Subject:  subject,
		HTMLBody: htmlBody,
		TextBody: textBody,
	})
}

// SendTestEmail renders and dispatches any chosen template to a test recipient.
func (s *EmailService) SendTestEmail(ctx context.Context, toEmail string, templateName string, recipientName string) error {
	if recipientName == "" {
		recipientName = "Church Leader"
	}

	switch strings.ToLower(strings.TrimSpace(templateName)) {
	case "magic_link", "magic-link", "invitation":
		return s.SendMagicLinkWithData(ctx, toEmail, MagicLinkEmailData{
			RecipientName: recipientName,
			ActionURL:     "https://heritage-mm-console.vercel.app/auth/magic-login?code=test-code-12345&email=" + toEmail,
			Role:          "Resident Pastor",
			ChurchCenter:  "Lekki Center",
		})
	case "birthday":
		return s.SendBirthday(ctx, toEmail, BirthdayEmailData{
			MemberName:     recipientName,
			ScriptureVerse: "The Lord bless you and keep you; The Lord make His face shine upon you.",
			ScriptureRef:   "Numbers 6:24-26",
			PastorName:     "Pastor Michael & Sarah",
			ChurchCenter:   "Lekki Center",
		})
	case "otp", "verification":
		return s.SendOTP(ctx, toEmail, OTPEmailData{
			RecipientName: recipientName,
			OTPCode:       "482910",
			Purpose:       "Portal Sign In & Two-Factor Authentication",
			ExpiryMinutes: 10,
		})
	case "welcome_visitor", "visitor", "first_timer":
		return s.SendWelcomeVisitor(ctx, toEmail, WelcomeVisitorEmailData{
			VisitorName:     recipientName,
			ServiceAttended: "Sunday 1st Celebration Service",
			ChurchCenter:    "Lekki Center",
			NextServiceTime: "Wednesday Midweek Service @ 6:00 PM",
			PastorName:      "Pastor Michael",
		})
	case "new_member_welcome", "new_member", "member":
		return s.SendNewMemberWelcome(ctx, toEmail, NewMemberEmailData{
			MemberName:   recipientName,
			MemberID:     "HOF-2026-0042",
			ChurchCenter: "Lekki Center",
			PortalURL:    "https://heritage-mm-console.vercel.app",
		})
	case "anniversary":
		return s.SendAnniversary(ctx, toEmail, AnniversaryEmailData{
			CoupleNames:      recipientName,
			YearsCelebrating: 10,
			ScriptureVerse:   "A cord of three strands is not quickly broken.",
			ScriptureRef:     "Ecclesiastes 4:12",
		})
	case "team_assignment", "team":
		return s.SendTeamAssignment(ctx, toEmail, TeamAssignmentEmailData{
			MemberName:      recipientName,
			TeamName:        "Media & Live Production",
			RoleTitle:       "Technician",
			TeamLeadName:    "Deacon Joshua",
			MeetingSchedule: "Saturdays @ 4:00 PM",
			RosterURL:       "https://heritage-mm-console.vercel.app/teams",
		})
	case "event_reminder", "event":
		return s.SendEventReminder(ctx, toEmail, EventReminderEmailData{
			RecipientName: recipientName,
			EventTitle:    "Annual Believers Victory Convention 2026",
			EventDate:     "October 15-18, 2026",
			EventTime:     "5:30 PM Daily",
			Venue:         "Main Auditorium, Lekki Center",
			Description:   "Join us for 4 days of prophetic worship, apostolic impartation, and breakthrough!",
			ActionURL:     "https://heritage-mm-console.vercel.app",
		})
	case "donation_receipt", "donation", "giving":
		return s.SendDonationReceipt(ctx, toEmail, DonationReceiptEmailData{
			DonorName:       recipientName,
			ReceiptNumber:   "REC-2026-8942",
			Date:            "September 2, 2026",
			AmountFormatted: "₦150,000.00",
			FundType:        "Tithe & Kingdom Builders",
			PaymentMethod:   "Online Card (Paystack)",
			TransactionRef:  "pstk_live_trx_89421",
		})
	case "pastoral_care", "pastoral":
		return s.SendPastoralCare(ctx, toEmail, PastoralCareEmailData{
			MemberName:    recipientName,
			PastorName:    "Pastor Michael & Sarah",
			PastorTitle:   "Resident Pastors",
			Message:       "We wanted to reach out, pray with you, and check in on how you and your household are doing this week.",
			PrayerLinkURL: "https://heritage-mm-console.vercel.app",
		})
	default:
		return s.SendMagicLinkWithData(ctx, toEmail, MagicLinkEmailData{
			RecipientName: recipientName,
			ActionURL:     "https://heritage-mm-console.vercel.app/auth/magic-login?code=test-code-12345&email=" + toEmail,
			Role:          "Church Admin",
			ChurchCenter:  "Lekki Center",
		})
	}
}
