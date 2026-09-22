package email

import (
	"context"
	"strings"
	"testing"
)

func TestRenderer_AllTemplates(t *testing.T) {
	r, err := NewRenderer()
	if err != nil {
		t.Fatalf("failed to initialize renderer: %v", err)
	}

	tests := []struct {
		name         string
		renderFn     func() (string, string, error)
		expectedHTML []string
		expectedText []string
	}{
		{
			name: "MagicLink",
			renderFn: func() (string, string, error) {
				return r.RenderMagicLink(MagicLinkEmailData{
					RecipientName: "Pastor John",
					ActionURL:     "https://mmc.hofchurch.org/verify?token=abc123xyz",
					Role:          "Resident Pastor",
					ExpiryHours:   24,
					ChurchCenter:  "Lekki Center",
				})
			},
			expectedHTML: []string{"Pastor John", "Resident Pastor", "Lekki Center", "https://mmc.hofchurch.org/verify?token=abc123xyz"},
			expectedText: []string{"Pastor John", "Resident Pastor", "Lekki Center"},
		},
		{
			name: "Birthday",
			renderFn: func() (string, string, error) {
				return r.RenderBirthday(BirthdayEmailData{
					MemberName:     "Sister Grace",
					ScriptureVerse: "The Lord bless you and keep you.",
					ScriptureRef:   "Numbers 6:24",
					PastorMessage:  "May your year be filled with exponential grace!",
					PastorName:     "Pastor Michael",
					ChurchCenter:   "Lekki Center",
				})
			},
			expectedHTML: []string{"Sister Grace", "Numbers 6:24", "exponential grace", "Pastor Michael"},
			expectedText: []string{"Sister Grace", "Numbers 6:24"},
		},
		{
			name: "OTP",
			renderFn: func() (string, string, error) {
				return r.RenderOTP(OTPEmailData{
					RecipientName: "Brother Paul",
					OTPCode:       "849201",
					Purpose:       "Password Reset",
					ExpiryMinutes: 10,
					RequestIP:     "197.210.226.5",
				})
			},
			expectedHTML: []string{"Brother Paul", "849201", "Password Reset", "10", "197.210.226.5"},
			expectedText: []string{"Brother Paul", "849201", "10"},
		},
		{
			name: "WelcomeVisitor",
			renderFn: func() (string, string, error) {
				return r.RenderWelcomeVisitor(WelcomeVisitorEmailData{
					VisitorName:     "David Adeleke",
					ServiceAttended: "Sunday 1st Service",
					ChurchCenter:    "Lekki Center",
					NextServiceTime: "Wednesday Midweek Service @ 6:00 PM",
					PastorName:      "Pastor Michael",
					NextStepsURL:    "https://hofchurch.org/connect",
				})
			},
			expectedHTML: []string{"David Adeleke", "Sunday 1st Service", "Wednesday Midweek Service", "https://hofchurch.org/connect"},
			expectedText: []string{"David Adeleke", "Sunday 1st Service"},
		},
		{
			name: "NewMemberWelcome",
			renderFn: func() (string, string, error) {
				return r.RenderNewMemberWelcome(NewMemberEmailData{
					MemberName:   "Mary Johnson",
					MemberID:     "HOF-2026-0042",
					ChurchCenter: "Ikeja Center",
					PortalURL:    "https://mmc.hofchurch.org",
				})
			},
			expectedHTML: []string{"Mary Johnson", "HOF-2026-0042", "Ikeja Center", "https://mmc.hofchurch.org"},
			expectedText: []string{"Mary Johnson", "HOF-2026-0042"},
		},
		{
			name: "Anniversary",
			renderFn: func() (string, string, error) {
				return r.RenderAnniversary(AnniversaryEmailData{
					CoupleNames:      "Mr. & Mrs. Okonkwo",
					YearsCelebrating: 15,
					ScriptureVerse:   "A cord of three strands is not quickly broken.",
					ScriptureRef:     "Ecclesiastes 4:12",
				})
			},
			expectedHTML: []string{"Mr. &amp; Mrs. Okonkwo", "15", "Ecclesiastes 4:12"},
			expectedText: []string{"Mr. & Mrs. Okonkwo", "15"},
		},
		{
			name: "TeamAssignment",
			renderFn: func() (string, string, error) {
				return r.RenderTeamAssignment(TeamAssignmentEmailData{
					MemberName:      "Samuel Doe",
					TeamName:        "Media & Production",
					RoleTitle:       "Live Stream Technician",
					TeamLeadName:    "Deacon Joshua",
					TeamLeadEmail:   "media@hofchurch.org",
					MeetingSchedule: "Saturdays @ 4:00 PM",
					RosterURL:       "https://mmc.hofchurch.org/teams/media",
				})
			},
			expectedHTML: []string{"Samuel Doe", "Media &amp; Production", "Live Stream Technician", "Deacon Joshua", "media@hofchurch.org", "Saturdays @ 4:00 PM"},
			expectedText: []string{"Samuel Doe", "Media & Production"},
		},
		{
			name: "EventReminder",
			renderFn: func() (string, string, error) {
				return r.RenderEventReminder(EventReminderEmailData{
					RecipientName: "Church Family",
					EventTitle:    "Annual Believers Victory Conference",
					EventDate:     "October 15-18, 2026",
					EventTime:     "5:30 PM Daily",
					Venue:         "Main Auditorium, Lekki Center",
					Description:   "Experience deep prophetic worship and supernatural impartation.",
					ActionURL:     "https://hofchurch.org/events/victory-conf",
					IsOnline:      true,
					StreamURL:     "https://youtube.com/live/hofchurch",
				})
			},
			expectedHTML: []string{"Annual Believers Victory Conference", "October 15-18, 2026", "Main Auditorium", "https://youtube.com/live/hofchurch"},
			expectedText: []string{"Annual Believers Victory Conference", "October 15-18, 2026"},
		},
		{
			name: "DonationReceipt",
			renderFn: func() (string, string, error) {
				return r.RenderDonationReceipt(DonationReceiptEmailData{
					DonorName:       "Emmanuel Ade",
					ReceiptNumber:   "REC-2026-9812",
					Date:            "September 2, 2026",
					AmountFormatted: "₦100,000.00",
					FundType:        "Tithe",
					PaymentMethod:   "Paystack Online",
					TransactionRef:  "pstk_trx_9812304",
				})
			},
			expectedHTML: []string{"Emmanuel Ade", "REC-2026-9812", "₦100,000.00", "Tithe", "pstk_trx_9812304"},
			expectedText: []string{"Emmanuel Ade", "REC-2026-9812", "₦100,000.00"},
		},
		{
			name: "PastoralCare",
			renderFn: func() (string, string, error) {
				return r.RenderPastoralCare(PastoralCareEmailData{
					MemberName:    "Sister Deborah",
					PastorName:    "Pastor Michael & Sarah",
					PastorTitle:   "Lead Pastors",
					Message:       "We wanted to check in on how you are settling into your new neighborhood.",
					PrayerLinkURL: "https://hofchurch.org/prayer-request",
				})
			},
			expectedHTML: []string{"Sister Deborah", "Pastor Michael &amp; Sarah", "Lead Pastors", "settling into your new neighborhood", "https://hofchurch.org/prayer-request"},
			expectedText: []string{"Sister Deborah", "Pastor Michael & Sarah"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			html, text, err := tt.renderFn()
			if err != nil {
				t.Fatalf("%s render returned error: %v", tt.name, err)
			}
			if html == "" {
				t.Fatalf("%s produced empty HTML", tt.name)
			}
			if text == "" {
				t.Fatalf("%s produced empty Plaintext", tt.name)
			}

			for _, sub := range tt.expectedHTML {
				if !strings.Contains(html, sub) {
					t.Errorf("%s HTML missing expected substring %q", tt.name, sub)
				}
			}

			for _, sub := range tt.expectedText {
				if !strings.Contains(text, sub) {
					t.Errorf("%s Plaintext missing expected substring %q", tt.name, sub)
				}
			}
		})
	}
}

func TestLogMailer(t *testing.T) {
	mailer := NewLogMailer()
	err := mailer.Send(context.Background(), EmailMessage{
		To:       []string{"member@example.com"},
		Subject:  "Test Email",
		HTMLBody: "<p>Hello</p>",
		TextBody: "Hello",
	})
	if err != nil {
		t.Fatalf("LogMailer returned unexpected error: %v", err)
	}
}

func TestEmailService_WithLogMailer(t *testing.T) {
	renderer, err := NewRenderer()
	if err != nil {
		t.Fatalf("failed to init renderer: %v", err)
	}

	mailer := NewLogMailer()
	svc := NewEmailService(mailer, renderer)

	err = svc.SendMagicLink(context.Background(), "pastor@example.com", "Pastor David", "https://mmc.hofchurch.org/invite?token=123", "Resident Pastor", "Lekki Center")
	if err != nil {
		t.Fatalf("SendMagicLink failed: %v", err)
	}
}
