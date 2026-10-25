import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { Resend } from 'resend';
import { AppConfig } from '../config/config.module.js';

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Prevents duplicate sends if a request is retried. */
  idempotencyKey?: string;
}

/**
 * Resend-backed mailer. Without RESEND_API_KEY (dev/test) emails are logged
 * instead of sent so the full flow can be exercised locally.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: AppConfig) {
    const key = config.get('RESEND_API_KEY');
    this.resend = key ? new Resend(key) : null;
  }

  async send(email: OutboundEmail): Promise<{ id: string | null }> {
    if (!this.resend) {
      this.logger.warn(`[dev mail] to=${email.to} subject="${email.subject}"\n${email.text}`);
      return { id: null };
    }
    const { data, error } = await this.resend.emails.send(
      {
        from: this.config.get('EMAIL_FROM'),
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
    );
    if (error) {
      // Never log message bodies: they contain single-use tokens.
      this.logger.error(`Resend delivery failed to=${email.to}: ${error.name} ${error.message}`);
      throw new Error('EMAIL_DELIVERY_FAILED');
    }
    return { id: data?.id ?? null };
  }
}

@Global()
@Module({ providers: [EmailService], exports: [EmailService] })
export class EmailModule {}
