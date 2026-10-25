/**
 * Email templates ported (condensed) from the legacy Go templates
 * (church-backend/internal/platform/email/templates/base.html + magic_link.html).
 * All interpolated values are escaped.
 */

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const CHURCH_NAME = 'Heritage of Faith';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LayoutInput {
  preheader: string;
  title: string;
  paragraphs: string[]; // already-escaped HTML fragments
  actionLabel: string;
  actionUrl: string;
  footnote: string;
}

function layout(i: LayoutInput): string {
  const url = escapeHtml(i.actionUrl);
  const paras = i.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#4b5563;font-family:${FONT};">${p}</p>`,
    )
    .join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${CHURCH_NAME}</title></head>
<body style="margin:0;padding:0;background:#edf2f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(i.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf2f7;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;">
<tr><td style="padding:40px 36px;text-align:center;">
<p style="margin:0 0 24px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#0088cc;font-weight:700;font-family:${FONT};">${CHURCH_NAME}</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:#111827;font-family:${FONT};">${escapeHtml(i.title)}</h1>
${paras}
<a href="${url}" target="_blank" style="display:inline-block;margin:8px 0 24px;padding:14px 36px;background:#0088cc;color:#ffffff;border-radius:24px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;font-family:${FONT};">${escapeHtml(i.actionLabel)}</a>
<p style="margin:0;font-size:12px;line-height:18px;color:#9ca3af;font-family:${FONT};">${escapeHtml(i.footnote)}</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;font-family:${FONT};">If the button does not work, copy this link:<br><span style="color:#6b7280;word-break:break-all;">${url}</span></p>
</td></tr></table></body></html>`;
}

export function stewardInvitationEmail(p: {
  firstName: string;
  roleLabel: string;
  teamName: string | null;
  url: string;
  expiresInHours: number;
}) {
  const scope = p.teamName ? ` on the <strong>${escapeHtml(p.teamName)}</strong> team` : '';
  return {
    subject: `You've been invited to serve at ${CHURCH_NAME}`,
    html: layout({
      preheader: 'Activate your steward account',
      title: 'Welcome to the team',
      paragraphs: [
        `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, you have been appointed as <strong>${escapeHtml(p.roleLabel)}</strong>${scope}.`,
        'Click below to confirm your details and set a password for your account.',
      ],
      actionLabel: 'Activate account',
      actionUrl: p.url,
      footnote: `This link expires in ${p.expiresInHours} hours and can only be used once. If you were not expecting this, you can ignore this email.`,
    }),
    text: `Hi ${p.firstName}, you have been invited to serve at ${CHURCH_NAME}. Activate your account: ${p.url} (expires in ${p.expiresInHours} hours).`,
  };
}

export function magicLoginEmail(p: { firstName: string; url: string; expiresInMinutes: number }) {
  return {
    subject: `Your ${CHURCH_NAME} sign-in link`,
    html: layout({
      preheader: 'Sign in without a password',
      title: 'Sign in to Heritage',
      paragraphs: [
        `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, use the button below to sign in.`,
      ],
      actionLabel: 'Sign in',
      actionUrl: p.url,
      footnote: `This link expires in ${p.expiresInMinutes} minutes and works once. If you didn't request it, ignore this email — your account is safe.`,
    }),
    text: `Sign in to ${CHURCH_NAME}: ${p.url} (expires in ${p.expiresInMinutes} minutes).`,
  };
}

export function welcomeVisitorEmail(p: { firstName: string; serviceTitle: string; webUrl: string }) {
  return {
    subject: `Welcome to ${CHURCH_NAME}, ${p.firstName}!`,
    html: layout({
      preheader: `Thank you for worshipping with us at ${CHURCH_NAME}`,
      title: `We're glad you came, ${p.firstName}!`,
      paragraphs: [
        `Thank you for joining us for <strong>${escapeHtml(p.serviceTitle)}</strong> at ${CHURCH_NAME}.`,
        'One of our follow-up stewards will reach out shortly to say hello and see how we can stand with you in prayer.',
      ],
      actionLabel: 'Visit Our Church',
      actionUrl: p.webUrl,
      footnote: 'You received this welcome note because your visit was recorded at our Information Center.',
    }),
    text: `Welcome to ${CHURCH_NAME}, ${p.firstName}! Thank you for joining us for ${p.serviceTitle}. A member of our follow-up team will reach out to you soon.`,
  };
}
