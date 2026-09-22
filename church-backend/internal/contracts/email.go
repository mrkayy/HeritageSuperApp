package contracts

import "context"

// EmailDispatcher defines cross-module email sending capabilities.
type EmailDispatcher interface {
	SendMagicLink(ctx context.Context, toEmail string, recipientName string, actionURL string, role string, churchCenter string) error
	SendTestEmail(ctx context.Context, toEmail string, templateName string, recipientName string) error
}
