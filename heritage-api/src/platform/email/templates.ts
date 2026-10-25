/**
 * Email templates matching the canonical design from church-backend.
 * Base layout: circular logo, 500px white card (12px radius, subtle shadow),
 * full footer with nav links, social icons, and copyright.
 */

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const CHURCH_NAME = 'Heritage of Faith';
const WEBSITE_URL = 'https://hofchurch.org';
const APP_URL = 'https://mmc.hofchurch.org';
const LOGO_URL = ''; // TODO: set logo URL

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
  bodyHtml: string;
  footnote?: string;
}

function layout(i: LayoutInput): string {
  const footNote = i.footnote
    ? `<tr><td align="center" style="padding-top:24px;"><p style="margin:0;font-size:12px;line-height:18px;color:#9ca3af;font-family:${FONT};">${i.footnote}</p></td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>${CHURCH_NAME}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
html,body{margin:0!important;padding:0!important;height:100%!important;width:100%!important;background-color:#edf2f7;font-family:${FONT};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
*{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}
table,td{mso-table-lspace:0pt!important;mso-table-rspace:0pt!important;border-collapse:collapse!important}
img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
a{color:#0088cc;text-decoration:none}
@media screen and (max-width:540px){
.email-container{width:100%!important;margin:auto!important}
.mobile-card{padding:32px 20px!important}
.mobile-padding{padding-left:16px!important;padding-right:16px!important}
.btn-mobile{display:block!important;width:100%!important;box-sizing:border-box!important}
}
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#edf2f7;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;font-family:sans-serif;">
${escapeHtml(i.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#edf2f7;table-layout:fixed;">
<tr><td align="center" style="padding:40px 16px 48px 16px;">
<!--[if (gte mso 9)|(IE)]><table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="500"><tr><td align="center" valign="top" width="500"><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width:500px;margin:0 auto;">

<!-- Brand Logo -->
<tr><td align="center" style="padding-bottom:32px;">
<a href="${WEBSITE_URL}" target="_blank" style="text-decoration:none;">
<img src="${LOGO_URL}" alt="${CHURCH_NAME}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:50%;margin:0 auto;" />
</a>
</td></tr>

<!-- White Card -->
<tr><td>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr><td align="center" style="padding:48px 36px;" class="mobile-card">
<h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;line-height:34px;font-family:${FONT};">${escapeHtml(i.title)}</h1>
${i.bodyHtml}
${footNote}
</td></tr>
</table>
</td></tr>

<!-- Footer -->
<tr><td align="center" style="padding:32px 16px 0 16px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
<tr><td align="center" style="font-family:${FONT};font-size:13px;font-weight:600;">
<a href="${WEBSITE_URL}" target="_blank" style="color:#374151;text-decoration:none;">Help Center</a>
<span style="color:#d1d5db;padding:0 10px;">|</span>
<a href="${APP_URL}" target="_blank" style="color:#374151;text-decoration:none;">Log In</a>
<span style="color:#d1d5db;padding:0 10px;">|</span>
<a href="${WEBSITE_URL}" target="_blank" style="color:#374151;text-decoration:none;">Contact Us</a>
</td></tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
<tr>
<td style="padding:0 5px;"><a href="https://facebook.com" target="_blank" style="text-decoration:none;display:inline-block;width:36px;height:36px;background-color:#0088cc;border-radius:50%;text-align:center;line-height:36px;color:#ffffff;font-weight:700;font-size:16px;font-family:sans-serif;">f</a></td>
<td style="padding:0 5px;"><a href="https://twitter.com" target="_blank" style="text-decoration:none;display:inline-block;width:36px;height:36px;background-color:#0088cc;border-radius:50%;text-align:center;line-height:36px;color:#ffffff;font-weight:700;font-size:14px;font-family:sans-serif;">X</a></td>
<td style="padding:0 5px;"><a href="https://linkedin.com" target="_blank" style="text-decoration:none;display:inline-block;width:36px;height:36px;background-color:#0088cc;border-radius:50%;text-align:center;line-height:36px;color:#ffffff;font-weight:700;font-size:13px;font-family:sans-serif;">in</a></td>
<td style="padding:0 5px;"><a href="https://instagram.com" target="_blank" style="text-decoration:none;display:inline-block;width:36px;height:36px;background-color:#0088cc;border-radius:50%;text-align:center;line-height:36px;color:#ffffff;font-weight:700;font-size:11px;font-family:sans-serif;">IG</a></td>
</tr>
</table>
<p style="margin:0;font-size:12px;line-height:18px;color:#9ca3af;font-family:${FONT};">&copy; ${CHURCH_NAME}</p>
</td></tr>

</table>
<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#4b5563;font-family:${FONT};max-width:380px;">${html}</p>`;
}

function ctaButton(label: string, url?: string | null): string {
  const href = escapeHtml(url || '');
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr><td align="center" style="background-color:#0088cc;border-radius:24px;">
<a href="${href}" target="_blank" class="btn-mobile" style="font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;padding:14px 40px;display:inline-block;font-family:${FONT};border-radius:24px;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(label)}</a>
</td></tr>
</table>`;
}

function copyLinkFallback(url?: string | null): string {
  const href = escapeHtml(url || '');
  return `<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;font-family:${FONT};">If the button does not work, copy this link:<br><span style="color:#6b7280;word-break:break-all;">${href}</span></p>`;
}

function infoCard(labelHtml: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border-radius:8px;margin-bottom:24px;">
<tr><td align="center" style="padding:14px 18px;">${labelHtml}</td></tr>
</table>`;
}

function blockquote(text: string): string {
  return `<div style="margin:16px 0 24px;padding:16px;background:#f8fafc;border-left:4px solid #0088cc;border-radius:4px;font-family:${FONT};color:#1e293b;font-size:15px;line-height:24px;white-space:pre-wrap;">${escapeHtml(text)}</div>`;
}

function otpCodeBox(code: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:2px dashed #0088cc;border-radius:8px;margin:0 auto 24px auto;">
<tr><td align="center" style="padding:16px 32px;">
<span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#0088cc;font-family:'Courier New',Courier,monospace;display:block;">${escapeHtml(code)}</span>
</td></tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function stewardInvitationEmail(p: {
  firstName: string;
  roleLabel: string | null;
  teamName: string | null;
  url: string;
  expiresInHours: number;
}) {
  const scope = p.teamName ? ` on the <strong>${escapeHtml(p.teamName)}</strong> team` : '';
  const intro = p.roleLabel
    ? `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, you have been appointed as <strong>${escapeHtml(p.roleLabel)}</strong>${scope}.`
    : `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, your ${CHURCH_NAME} member profile has been verified and is ready to claim.`;

  const bodyHtml = [
    paragraph(intro),
    paragraph('Click below to confirm your identity, set your password, and complete your onboarding setup.'),
    ctaButton('Claim Account', p.url),
    copyLinkFallback(p.url),
  ].join('\n');

  return {
    subject: p.roleLabel
      ? `You've been invited to serve at ${CHURCH_NAME}`
      : `Claim your ${CHURCH_NAME} account`,
    html: layout({
      preheader: 'Claim and set up your account',
      title: p.roleLabel ? 'Welcome to the team' : `Welcome to ${CHURCH_NAME}`,
      bodyHtml,
      footnote: `This link expires in ${p.expiresInHours} hours and can only be used once. If you were not expecting this, you can ignore this email.`,
    }),
    text: `Hi ${p.firstName}, claim your ${CHURCH_NAME} account: ${p.url} (expires in ${p.expiresInHours} hours).`,
  };
}

export function magicLoginEmail(p: { firstName: string; url: string; expiresInMinutes: number }) {
  const bodyHtml = [
    paragraph(`Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, use the button below to sign in.`),
    ctaButton('Sign In', p.url),
    copyLinkFallback(p.url),
  ].join('\n');

  return {
    subject: `Your ${CHURCH_NAME} sign-in link`,
    html: layout({
      preheader: 'Sign in without a password',
      title: 'Sign in to Heritage',
      bodyHtml,
      footnote: `This link expires in ${p.expiresInMinutes} minutes and works once. If you didn't request it, ignore this email — your account is safe.`,
    }),
    text: `Sign in to ${CHURCH_NAME}: ${p.url} (expires in ${p.expiresInMinutes} minutes).`,
  };
}

export function welcomeVisitorEmail(p: {
  firstName: string;
  serviceTitle: string;
  webUrl: string;
  nextServiceTime?: string | null;
}) {
  const parts: string[] = [
    paragraph(`Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, it was a tremendous joy having you worship with us during our <strong>${escapeHtml(p.serviceTitle)}</strong> at ${CHURCH_NAME}. We pray God's Word transforms and empowers your life!`),
  ];

  if (p.nextServiceTime) {
    parts.push(
      infoCard(
        `<span style="font-size:11px;font-weight:600;color:#0088cc;text-transform:uppercase;display:block;margin-bottom:4px;font-family:${FONT};">Next Upcoming Service</span>` +
          `<span style="font-size:14px;font-weight:700;color:#1f2937;font-family:${FONT};">${escapeHtml(p.nextServiceTime)}</span>`,
      ),
    );
  }

  parts.push(
    `<p style="margin:0 0 32px;font-size:14px;line-height:22px;color:#6b7280;font-family:${FONT};">Discover more about our life groups and connect with our pastoral team.</p>`,
    ctaButton('Get Connected', p.webUrl),
  );

  return {
    subject: `Welcome to ${CHURCH_NAME}, ${p.firstName}!`,
    html: layout({
      preheader: `Thank you for worshipping with us at ${CHURCH_NAME}`,
      title: `We're glad you came, ${p.firstName}!`,
      bodyHtml: parts.join('\n'),
    }),
    text: `Welcome to ${CHURCH_NAME}, ${p.firstName}! Thank you for joining us for ${p.serviceTitle}. A member of our follow-up team will reach out to you soon.`,
  };
}

export function pastoralPrayerRequestEmail(p: {
  visitorName: string;
  visitorPhone?: string | null;
  visitorEmail?: string | null;
  serviceTitle?: string | null;
  formattedContent: string;
  senderName: string;
  webUrl: string;
}) {
  const contactLines = [
    p.visitorPhone ? `Phone: <strong>${escapeHtml(p.visitorPhone)}</strong>` : null,
    p.visitorEmail ? `Email: <strong>${escapeHtml(p.visitorEmail)}</strong>` : null,
    p.serviceTitle ? `Service: <strong>${escapeHtml(p.serviceTitle)}</strong>` : null,
  ]
    .filter(Boolean)
    .join(' &middot; ');

  const bodyHtml = [
    paragraph(
      `Resident Pastor, the Membership Team Lead, <strong>${escapeHtml(p.senderName)}</strong>, has forwarded the following confidential prayer request:`,
    ),
    paragraph(`<strong>Member/Visitor:</strong> ${escapeHtml(p.visitorName)}<br/>${contactLines}`),
    blockquote(p.formattedContent),
    ctaButton('Open Pastoral Dashboard', p.webUrl),
  ].join('\n');

  return {
    subject: `[Confidential Prayer Request] ${p.visitorName} - Membership Follow-up`,
    html: layout({
      preheader: `Confidential prayer request forwarded by ${escapeHtml(p.senderName)} (Membership Team Lead)`,
      title: 'Pastoral Prayer Request',
      bodyHtml,
      footnote: 'This is a strictly confidential pastoral transmission sent by the Membership Team Head.',
    }),
    text: `Pastoral Prayer Request for ${p.visitorName}\nForwarded by ${p.senderName} (Membership Team Lead)\n\nRequest:\n${p.formattedContent}\n\nView at ${p.webUrl}`,
  };
}

export function celebrationGreetingEmail(p: {
  firstName: string;
  kind: 'BIRTHDAY' | 'ANNIVERSARY';
  customNote?: string | null;
  webUrl: string;
}) {
  const isBirthday = p.kind === 'BIRTHDAY';
  const title = isBirthday ? `Happy Birthday, ${p.firstName}!` : `Happy Anniversary, ${p.firstName}!`;
  const intro = isBirthday
    ? `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, your ${CHURCH_NAME} family celebrates you today! We pray that this new year of your life overflows with God's grace, wisdom, and divine favor.`
    : `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, your ${CHURCH_NAME} family rejoices with you on your wedding anniversary! May the Lord continue to strengthen, bless, and multiply the joy in your home.`;

  const parts: string[] = [paragraph(intro)];

  if (p.customNote) {
    parts.push(blockquote(p.customNote));
  }

  parts.push(ctaButton('Connect With Us', p.webUrl));

  return {
    subject: isBirthday
      ? `Happy Birthday from ${CHURCH_NAME}, ${p.firstName}!`
      : `Happy Anniversary from ${CHURCH_NAME}, ${p.firstName}!`,
    html: layout({
      preheader: `${title} With love and prayers from ${CHURCH_NAME}.`,
      title,
      bodyHtml: parts.join('\n'),
      footnote: `Sent with love by the Membership & Care Team at ${CHURCH_NAME}.`,
    }),
    text: `${title}\n\n${p.customNote ? `${p.customNote}\n\n` : ''}With love and prayers from ${CHURCH_NAME} (${p.webUrl}).`,
  };
}

// HOF-005 — OTP verification code
export function otpVerificationEmail(p: {
  firstName: string;
  otpCode: string;
  purpose?: string | null;
  expiryMinutes?: number;
  requestIp?: string | null;
}) {
  const expiry = p.expiryMinutes ?? 10;
  const purposeLabel = p.purpose ?? `${CHURCH_NAME} Authentication`;

  const bodyHtml = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, you requested a one-time verification code for <strong>${escapeHtml(purposeLabel)}</strong>.`,
    ),
    otpCodeBox(p.otpCode),
    `<p style="margin:0 0 4px;font-size:14px;line-height:22px;color:#6b7280;font-family:${FONT};">This code expires in <strong>${expiry} minutes</strong>.</p>`,
    `<p style="margin:0;font-size:12px;line-height:18px;color:#9ca3af;font-family:${FONT};">${p.requestIp ? `Requested from IP: ${escapeHtml(p.requestIp)}. ` : ''}Never share this code with anyone.</p>`,
  ].join('\n');

  return {
    subject: `Your ${CHURCH_NAME} verification code`,
    html: layout({
      preheader: `Your verification code is ${p.otpCode}`,
      title: 'Verification Code',
      bodyHtml,
    }),
    text: `Hi ${p.firstName}, your verification code for ${purposeLabel} is: ${p.otpCode}. It expires in ${expiry} minutes. Never share this code.`,
  };
}

// HOF-005 — PIN/password reset token
export function recoveryTokenEmail(p: {
  firstName: string;
  url: string;
  expiresInMinutes: number;
}) {
  const bodyHtml = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, we received a request to reset your password. Click the button below to set a new one.`,
    ),
    paragraph('If you did not request this, you can safely ignore this email — your password will remain unchanged.'),
    ctaButton('Reset Password', p.url),
    copyLinkFallback(p.url),
  ].join('\n');

  return {
    subject: `Reset your ${CHURCH_NAME} password`,
    html: layout({
      preheader: 'Password reset requested',
      title: 'Reset Your Password',
      bodyHtml,
      footnote: `This link expires in ${p.expiresInMinutes} minutes and can only be used once.`,
    }),
    text: `Hi ${p.firstName}, reset your ${CHURCH_NAME} password: ${p.url} (expires in ${p.expiresInMinutes} minutes).`,
  };
}

// HOF-007 — Leadership invitation link
export function leadershipInvitationEmail(p: {
  firstName: string;
  roleTitle: string;
  inviterName: string;
  url: string;
  expiresInHours: number;
}) {
  const bodyHtml = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, <strong>${escapeHtml(p.inviterName)}</strong> has invited you to serve as <strong>${escapeHtml(p.roleTitle)}</strong> at ${CHURCH_NAME}.`,
    ),
    paragraph('Click below to accept this leadership role and set up your account.'),
    ctaButton('Accept Invitation', p.url),
    copyLinkFallback(p.url),
  ].join('\n');

  return {
    subject: `Leadership invitation from ${CHURCH_NAME}`,
    html: layout({
      preheader: `You've been invited to serve as ${p.roleTitle}`,
      title: 'Leadership Invitation',
      bodyHtml,
      footnote: `This invitation expires in ${p.expiresInHours} hours. If you were not expecting this, please contact your church administrator.`,
    }),
    text: `Hi ${p.firstName}, ${p.inviterName} has invited you to serve as ${p.roleTitle} at ${CHURCH_NAME}. Accept: ${p.url} (expires in ${p.expiresInHours} hours).`,
  };
}

// HOF-021 — New member welcome (membership graduation)
export function newMemberWelcomeEmail(p: {
  firstName: string;
  membershipId?: string | null;
  webUrl: string;
}) {
  const parts: string[] = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, we are overjoyed to officially welcome you into the ${CHURCH_NAME} family! Your membership has been confirmed and your profile is now active.`,
    ),
  ];

  if (p.membershipId) {
    parts.push(
      infoCard(
        `<span style="font-size:11px;font-weight:600;color:#0088cc;text-transform:uppercase;display:block;margin-bottom:4px;font-family:${FONT};">Membership ID</span>` +
          `<span style="font-size:14px;font-weight:700;color:#1f2937;font-family:${FONT};">${escapeHtml(p.membershipId)}</span>`,
      ),
    );
  }

  parts.push(
    paragraph('You can now access all member resources, connect with life groups, and explore serving opportunities through your dashboard.'),
    ctaButton('Go to Dashboard', p.webUrl),
  );

  return {
    subject: `Welcome to the family, ${p.firstName}!`,
    html: layout({
      preheader: `Your ${CHURCH_NAME} membership is confirmed`,
      title: `Welcome to the Family!`,
      bodyHtml: parts.join('\n'),
      footnote: `Sent by the Membership Team at ${CHURCH_NAME}.`,
    }),
    text: `Welcome to ${CHURCH_NAME}, ${p.firstName}! Your membership is confirmed.${p.membershipId ? ` Membership ID: ${p.membershipId}.` : ''} Visit your dashboard: ${p.webUrl}`,
  };
}

// HOF-021/HOF-047 — Team/department assignment
export function teamAssignmentEmail(p: {
  firstName: string;
  teamName: string;
  roleTitle?: string | null;
  teamLeadName?: string | null;
  teamLeadEmail?: string | null;
  meetingSchedule?: string | null;
  rosterUrl?: string | null;
}) {
  const roleClause = p.roleTitle ? ` as <strong>${escapeHtml(p.roleTitle)}</strong>` : '';

  const parts: string[] = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, you have been assigned to serve in the <strong>${escapeHtml(p.teamName)}</strong> unit${roleClause} at <strong>${CHURCH_NAME}</strong>.`,
    ),
  ];

  if (p.teamLeadName) {
    let leaderHtml =
      `<span style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;display:block;margin-bottom:4px;font-family:${FONT};">Team Leader</span>` +
      `<span style="font-size:14px;font-weight:700;color:#1f2937;font-family:${FONT};">${escapeHtml(p.teamLeadName)}${p.teamLeadEmail ? ` (${escapeHtml(p.teamLeadEmail)})` : ''}</span>`;
    if (p.meetingSchedule) {
      leaderHtml += `<span style="font-size:12px;color:#d97706;display:block;margin-top:6px;font-weight:600;font-family:${FONT};">Meeting: ${escapeHtml(p.meetingSchedule)}</span>`;
    }
    parts.push(infoCard(leaderHtml));
  }

  parts.push(
    `<p style="margin:0 0 32px;font-size:14px;line-height:22px;color:#6b7280;font-family:${FONT};">You can view your roster and duty schedules anytime on Heritage MMC.</p>`,
    ctaButton('View Department Roster', p.rosterUrl ?? APP_URL),
  );

  return {
    subject: `You've been assigned to ${p.teamName} at ${CHURCH_NAME}`,
    html: layout({
      preheader: `Team assignment: ${p.teamName}`,
      title: 'Team Assignment',
      bodyHtml: parts.join('\n'),
    }),
    text: `Hi ${p.firstName}, you have been assigned to the ${p.teamName} team${p.roleTitle ? ` as ${p.roleTitle}` : ''} at ${CHURCH_NAME}.${p.teamLeadName ? ` Team Leader: ${p.teamLeadName}.` : ''} View roster: ${p.rosterUrl ?? APP_URL}`,
  };
}

// HOF-023 — Pastoral urgent SitRep alert
export function pastoralAlertEmail(p: {
  recipientName: string;
  alertTitle: string;
  alertBody: string;
  severity: 'URGENT' | 'HIGH' | 'NORMAL';
  senderName: string;
  webUrl: string;
}) {
  const severityColor = p.severity === 'URGENT' ? '#dc2626' : p.severity === 'HIGH' ? '#d97706' : '#0088cc';
  const severityLabel = p.severity === 'URGENT' ? 'Urgent' : p.severity === 'HIGH' ? 'High Priority' : 'Normal';

  const bodyHtml = [
    paragraph(
      `Dear <strong style="color:#111827;">${escapeHtml(p.recipientName)}</strong>, ${escapeHtml(p.senderName)} has raised a pastoral alert requiring your attention.`,
    ),
    infoCard(
      `<span style="font-size:11px;font-weight:600;color:${severityColor};text-transform:uppercase;display:block;margin-bottom:4px;font-family:${FONT};">${severityLabel}</span>` +
        `<span style="font-size:14px;font-weight:700;color:#1f2937;font-family:${FONT};">${escapeHtml(p.alertTitle)}</span>`,
    ),
    blockquote(p.alertBody),
    ctaButton('View in Dashboard', p.webUrl),
  ].join('\n');

  return {
    subject: `[${severityLabel}] Pastoral Alert: ${p.alertTitle}`,
    html: layout({
      preheader: `${severityLabel} pastoral alert from ${p.senderName}`,
      title: 'Pastoral Alert',
      bodyHtml,
      footnote: 'This is a confidential pastoral communication. Please respond promptly.',
    }),
    text: `[${severityLabel}] Pastoral Alert: ${p.alertTitle}\nFrom: ${p.senderName}\n\n${p.alertBody}\n\nView: ${p.webUrl}`,
  };
}

// HOF-034 — Event reminder
export function eventReminderEmail(p: {
  firstName: string;
  eventName: string;
  eventDate: string;
  eventTime?: string | null;
  eventLocation?: string | null;
  webUrl: string;
}) {
  const parts: string[] = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, this is a friendly reminder about an upcoming event you registered for at ${CHURCH_NAME}.`,
    ),
  ];

  let cardHtml =
    `<span style="font-size:11px;font-weight:600;color:#0088cc;text-transform:uppercase;display:block;margin-bottom:4px;font-family:${FONT};">Upcoming Event</span>` +
    `<span style="font-size:14px;font-weight:700;color:#1f2937;font-family:${FONT};">${escapeHtml(p.eventName)}</span>` +
    `<span style="font-size:13px;color:#4b5563;display:block;margin-top:6px;font-family:${FONT};">${escapeHtml(p.eventDate)}${p.eventTime ? ` at ${escapeHtml(p.eventTime)}` : ''}</span>`;
  if (p.eventLocation) {
    cardHtml += `<span style="font-size:12px;color:#6b7280;display:block;margin-top:4px;font-family:${FONT};">${escapeHtml(p.eventLocation)}</span>`;
  }
  parts.push(infoCard(cardHtml));

  parts.push(
    paragraph('We look forward to seeing you there!'),
    ctaButton('View Event', p.webUrl),
  );

  return {
    subject: `Reminder: ${p.eventName} at ${CHURCH_NAME}`,
    html: layout({
      preheader: `Reminder for ${p.eventName} on ${p.eventDate}`,
      title: 'Event Reminder',
      bodyHtml: parts.join('\n'),
    }),
    text: `Hi ${p.firstName}, reminder: ${p.eventName} on ${p.eventDate}${p.eventTime ? ` at ${p.eventTime}` : ''}${p.eventLocation ? ` (${p.eventLocation})` : ''}. View: ${p.webUrl}`,
  };
}

// HOF-034-S02 — Event reschedule or cancellation
export function eventUpdateEmail(p: {
  firstName: string;
  eventName: string;
  kind: 'RESCHEDULED' | 'CANCELLED';
  newDate?: string | null;
  newTime?: string | null;
  reason?: string | null;
  webUrl: string;
}) {
  const isCancelled = p.kind === 'CANCELLED';
  const title = isCancelled ? 'Event Cancelled' : 'Event Rescheduled';

  const parts: string[] = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, the event <strong>${escapeHtml(p.eventName)}</strong> has been ${isCancelled ? 'cancelled' : 'rescheduled'}.`,
    ),
  ];

  if (p.reason) {
    parts.push(blockquote(p.reason));
  }

  if (!isCancelled && p.newDate) {
    parts.push(
      infoCard(
        `<span style="font-size:11px;font-weight:600;color:#0088cc;text-transform:uppercase;display:block;margin-bottom:4px;font-family:${FONT};">New Date</span>` +
          `<span style="font-size:14px;font-weight:700;color:#1f2937;font-family:${FONT};">${escapeHtml(p.newDate)}${p.newTime ? ` at ${escapeHtml(p.newTime)}` : ''}</span>`,
      ),
    );
  }

  parts.push(ctaButton('View Details', p.webUrl));

  return {
    subject: `${title}: ${p.eventName}`,
    html: layout({
      preheader: `${p.eventName} has been ${isCancelled ? 'cancelled' : 'rescheduled'}`,
      title,
      bodyHtml: parts.join('\n'),
    }),
    text: `Hi ${p.firstName}, ${p.eventName} has been ${isCancelled ? 'cancelled' : `rescheduled to ${p.newDate ?? 'TBD'}${p.newTime ? ` at ${p.newTime}` : ''}`}.${p.reason ? ` Reason: ${p.reason}` : ''} View: ${p.webUrl}`,
  };
}

// HOF-035-S04 — Donation receipt
export function donationReceiptEmail(p: {
  firstName: string;
  amount: string;
  currency?: string;
  donationDate: string;
  reference?: string | null;
  purpose?: string | null;
  webUrl: string;
}) {
  const cur = p.currency ?? 'NGN';

  const parts: string[] = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, thank you for your generous gift to ${CHURCH_NAME}. Your donation has been received and recorded.`,
    ),
  ];

  let receiptHtml =
    `<span style="font-size:11px;font-weight:600;color:#0088cc;text-transform:uppercase;display:block;margin-bottom:4px;font-family:${FONT};">Donation Receipt</span>` +
    `<span style="font-size:20px;font-weight:800;color:#1f2937;font-family:${FONT};">${escapeHtml(cur)} ${escapeHtml(p.amount)}</span>` +
    `<span style="font-size:13px;color:#4b5563;display:block;margin-top:6px;font-family:${FONT};">${escapeHtml(p.donationDate)}</span>`;
  if (p.purpose) {
    receiptHtml += `<span style="font-size:12px;color:#6b7280;display:block;margin-top:4px;font-family:${FONT};">Purpose: ${escapeHtml(p.purpose)}</span>`;
  }
  if (p.reference) {
    receiptHtml += `<span style="font-size:12px;color:#6b7280;display:block;margin-top:2px;font-family:${FONT};">Ref: ${escapeHtml(p.reference)}</span>`;
  }
  parts.push(infoCard(receiptHtml));

  parts.push(
    paragraph('May the Lord multiply your seed sown and bless the work of your hands.'),
    ctaButton('View Giving History', p.webUrl),
  );

  return {
    subject: `Donation receipt from ${CHURCH_NAME}`,
    html: layout({
      preheader: `Thank you for your gift of ${cur} ${p.amount}`,
      title: 'Thank You for Your Gift',
      bodyHtml: parts.join('\n'),
      footnote: `This receipt is for your records. For any questions, contact ${CHURCH_NAME} finance team.`,
    }),
    text: `Hi ${p.firstName}, thank you for your donation of ${cur} ${p.amount} on ${p.donationDate}.${p.reference ? ` Ref: ${p.reference}.` : ''}${p.purpose ? ` Purpose: ${p.purpose}.` : ''} View: ${p.webUrl}`,
  };
}

// HOF-029-S05 — Transport dispatch notification
export function transportDispatchEmail(p: {
  firstName: string;
  pickupLocation: string;
  pickupTime: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleInfo?: string | null;
  webUrl: string;
}) {
  const parts: string[] = [
    paragraph(
      `Hi <strong style="color:#111827;">${escapeHtml(p.firstName)}</strong>, your transport has been arranged for an upcoming ${CHURCH_NAME} service.`,
    ),
  ];

  let dispatchHtml =
    `<span style="font-size:11px;font-weight:600;color:#0088cc;text-transform:uppercase;display:block;margin-bottom:4px;font-family:${FONT};">Pickup Details</span>` +
    `<span style="font-size:14px;font-weight:700;color:#1f2937;font-family:${FONT};">${escapeHtml(p.pickupTime)}</span>` +
    `<span style="font-size:13px;color:#4b5563;display:block;margin-top:6px;font-family:${FONT};">${escapeHtml(p.pickupLocation)}</span>`;
  if (p.driverName) {
    dispatchHtml += `<span style="font-size:12px;color:#6b7280;display:block;margin-top:6px;font-family:${FONT};">Driver: <strong style="color:#374151;">${escapeHtml(p.driverName)}</strong>${p.driverPhone ? ` (${escapeHtml(p.driverPhone)})` : ''}</span>`;
  }
  if (p.vehicleInfo) {
    dispatchHtml += `<span style="font-size:12px;color:#6b7280;display:block;margin-top:2px;font-family:${FONT};">Vehicle: ${escapeHtml(p.vehicleInfo)}</span>`;
  }
  parts.push(infoCard(dispatchHtml));

  parts.push(
    paragraph('Please be ready at the pickup point 5 minutes before the scheduled time.'),
    ctaButton('View Transport Details', p.webUrl),
  );

  return {
    subject: `Your ${CHURCH_NAME} transport is confirmed`,
    html: layout({
      preheader: `Pickup at ${p.pickupTime} from ${p.pickupLocation}`,
      title: 'Transport Confirmed',
      bodyHtml: parts.join('\n'),
    }),
    text: `Hi ${p.firstName}, your pickup is at ${p.pickupTime} from ${p.pickupLocation}.${p.driverName ? ` Driver: ${p.driverName}${p.driverPhone ? ` (${p.driverPhone})` : ''}.` : ''}${p.vehicleInfo ? ` Vehicle: ${p.vehicleInfo}.` : ''} View: ${p.webUrl}`,
  };
}

