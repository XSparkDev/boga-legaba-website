/**
 * Shared HTML-email theme for every transactional email the site sends
 * (payment receipts, admin alerts, enquiry confirmations, registration, etc).
 *
 * Colors/fonts are taken directly from app/globals.css so every email matches
 * the live website: --color-black #0A0A0A, --color-gold #C9A84C,
 * --color-gold-hover #B8973B, --color-sand #F2EDE4, --color-body-text #3D3532,
 * --brand-text-muted #8C7B6B, --color-white #FAFAF8. Display font is Playfair
 * Display (Georgia fallback for email clients); body font is DM Sans (Arial
 * fallback). Keep this file as the single source of truth for email branding —
 * new emails should build on emailShell()/emailInfoTable() rather than
 * hand-rolling HTML, so brand changes only need to happen once.
 */

export const EMAIL_BRAND = {
  name: "Boga Legaba",
  fullName: "Boga Legaba Guest House & Conference Centre",
  tagline: "Guest House & Conference Centre",
  address: "Riviera Park, Mahikeng, North West Province, 2745, South Africa",
  phone: "+27 82 875 7018",
  phoneHref: "tel:+27828757018",
  email: "info@bogalegaba.co.za",
  website: "www.bogalegaba.co.za",
  websiteHref: "https://www.bogalegaba.co.za",
  whatsappHref: "https://wa.me/27828757018",
}

export const EMAIL_COLORS = {
  black: "#0A0A0A",
  gold: "#C9A84C",
  goldHover: "#B8973B",
  sand: "#F2EDE4",
  border: "#E8E0D4",
  white: "#FAFAF8",
  bodyText: "#3D3532",
  muted: "#8C7B6B",
  danger: "#EF4444",
}

const FONT_DISPLAY = "'Playfair Display', Georgia, serif"
const FONT_BODY = "'DM Sans', Arial, Helvetica, sans-serif"

/**
 * Full HTML document wrapper: header (logo + tagline), optional accent bar,
 * the caller's body content, and a consistent footer. Every email should be
 * built by passing its unique content as `bodyHtml`.
 */
export function emailShell(opts: {
  title: string
  preheader?: string
  eyebrow?: string
  accentBarColor?: string
  bodyHtml: string
  footerNote?: string
}) {
  const { title, preheader, eyebrow, accentBarColor = EMAIL_COLORS.gold, bodyHtml, footerNote } = opts
  const c = EMAIL_COLORS

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${c.sand};font-family:${FONT_BODY};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="background:${c.sand};padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.12);">

  <!-- HEADER -->
  <tr><td style="background:${c.black};padding:32px 40px;text-align:center;">
    <p style="color:${c.gold};margin:0;font-size:20px;letter-spacing:5px;font-weight:400;font-family:${FONT_DISPLAY};">BOGA LEGABA</p>
    <p style="color:${c.muted};margin:5px 0 0;font-size:9px;letter-spacing:3px;text-transform:uppercase;">Guest House &amp; Conference Centre</p>
    ${eyebrow ? `<p style="color:${c.muted};margin:10px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;">${eyebrow}</p>` : ""}
  </td></tr>

  <!-- ACCENT BAR -->
  <tr><td style="background:${accentBarColor};height:4px;font-size:0;">&nbsp;</td></tr>

  <!-- BODY -->
  ${bodyHtml}

  <!-- FOOTER -->
  <tr><td style="background:${c.black};padding:28px 40px;text-align:center;">
    <p style="color:${c.gold};margin:0;font-size:13px;letter-spacing:4px;font-family:${FONT_DISPLAY};">BOGA LEGABA</p>
    <p style="color:${c.muted};margin:6px 0 0;font-size:10px;letter-spacing:1px;">${EMAIL_BRAND.address}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td align="center"><table cellpadding="0" cellspacing="0"><tr><td style="background:${c.gold};height:1px;width:40px;font-size:0;">&nbsp;</td></tr></table></td></tr></table>
    <p style="color:${c.muted};margin:0 0 4px;font-size:11px;">
      <a href="${EMAIL_BRAND.phoneHref}" style="color:${c.muted};text-decoration:none;">${EMAIL_BRAND.phone}</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:${EMAIL_BRAND.email}" style="color:${c.muted};text-decoration:none;">${EMAIL_BRAND.email}</a>
    </p>
    <p style="color:#5A5048;margin:10px 0 0;font-size:10px;line-height:1.7;">${footerNote ?? "This is an automated message — please do not reply directly to this email."}<br>
    <a href="${EMAIL_BRAND.websiteHref}" style="color:${c.gold};text-decoration:none;">${EMAIL_BRAND.website}</a></p>
  </td></tr>

</table></td></tr></table>
</body></html>`
}

/** A dark "hero" block for the main message under the header (used for success/thank-you states). */
export function emailHero(opts: { badgeSymbol?: string; eyebrow: string; heading: string; subtext?: string }) {
  const c = EMAIL_COLORS
  const { badgeSymbol = "&#10003;", eyebrow, heading, subtext } = opts
  return `<tr><td style="background:${c.black};padding:0 40px 40px;text-align:center;">
    <table align="center" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="width:64px;height:64px;border-radius:50%;background:${c.gold};text-align:center;vertical-align:middle;">
        <span style="color:${c.black};font-size:30px;line-height:64px;font-weight:700;">${badgeSymbol}</span>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:${c.gold};font-size:11px;letter-spacing:3px;text-transform:uppercase;">${eyebrow}</p>
    <p style="margin:0;color:#ffffff;font-size:28px;font-weight:400;font-family:${FONT_DISPLAY};line-height:1.3;">${heading}</p>
    ${subtext ? `<p style="margin:10px 0 0;color:${c.muted};font-size:12px;line-height:1.6;">${subtext}</p>` : ""}
  </td></tr>`
}

export type InfoRow = { label: string; value: string; emphasis?: boolean }

/** A zebra-striped info table — the workhorse for "Booking Reference / Room / Check-in" style blocks. */
export function emailInfoTable(rows: InfoRow[], opts: { title?: string } = {}) {
  const c = EMAIL_COLORS
  const cells = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? c.white : c.sand
      const valueColor = r.emphasis ? c.goldHover : c.bodyText
      const valueSize = r.emphasis ? "18px" : "14px"
      const valueWeight = r.emphasis ? "700" : "600"
      const isLast = i === rows.length - 1
      return `<tr><td style="background:${bg};padding:14px 20px;${isLast ? "" : `border-bottom:1px solid ${c.border};`}">
        <p style="margin:0;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">${r.label}</p>
        <p style="margin:4px 0 0;color:${valueColor};font-size:${valueSize};font-weight:${valueWeight};${r.emphasis ? `font-family:${FONT_DISPLAY};` : ""}">${r.value}</p>
      </td></tr>`
    })
    .join("")
  return `<tr><td style="padding:0 40px 24px;">
    ${opts.title ? `<p style="margin:0 0 16px;color:${c.muted};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">${opts.title}</p>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid ${c.border};">
      ${cells}
    </table>
  </td></tr>`
}

/** A plain text/paragraph block (greeting + message copy). */
export function emailParagraph(html: string, opts: { padded?: boolean } = {}) {
  const c = EMAIL_COLORS
  return `<tr><td style="padding:${opts.padded === false ? "0" : "28px"} 40px 8px;">
    <p style="margin:0;color:${c.bodyText};font-size:14px;line-height:1.8;">${html}</p>
  </td></tr>`
}

/** A gold call-to-action button, centered. */
export function emailButton(label: string, href: string) {
  const c = EMAIL_COLORS
  return `<tr><td style="padding:8px 40px 28px;text-align:center;">
    <a href="${href}" style="display:inline-block;background:${c.gold};color:${c.black};text-decoration:none;font-size:13px;font-weight:700;padding:13px 32px;border-radius:8px;letter-spacing:0.5px;">${label}</a>
  </td></tr>`
}

/** A muted callout box (for warnings, "action required", policy notes, etc). */
export function emailCallout(html: string, opts: { tone?: "neutral" | "warning" | "danger" } = {}) {
  const c = EMAIL_COLORS
  const tone = opts.tone ?? "neutral"
  const bg = tone === "danger" ? "#FEF2F2" : tone === "warning" ? "#FEF9EE" : c.sand
  const border = tone === "danger" ? "#FCA5A5" : tone === "warning" ? "#EDD9A3" : c.border
  return `<tr><td style="padding:0 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border-radius:12px;border:1px solid ${border};">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;color:${c.bodyText};font-size:12px;line-height:1.8;">${html}</p>
      </td></tr>
    </table>
  </td></tr>`
}
