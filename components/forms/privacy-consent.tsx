import Link from "next/link"

/**
 * Shared privacy-consent bits for every form that collects personal data.
 * Used by the conference, corporate, contact and interest/mailing-list forms.
 * Theme-aware (inherits surrounding text colors) so it works in any card.
 */

const privacyLinkClass =
  "underline underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold focus-visible:rounded-sm"

export function PrivacyConsentText() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      By submitting this form you agree to our{" "}
      <Link href="/privacy" className={privacyLinkClass}>
        Privacy Notice
      </Link>
      .
    </p>
  )
}

/** Required privacy-notice agreement checkbox (validated by the parent form). */
export function PrivacyConsentCheckbox({
  checked,
  onChange,
  error,
  linkPrivacy = true,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  error?: string
  /** Set false to render "Privacy Notice" as plain text instead of a link. */
  linkPrivacy?: boolean
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-gold"
          aria-describedby={error ? "privacy-consent-error" : undefined}
        />
        <span>
          By submitting this form you agree to our{" "}
          {linkPrivacy ? (
            <Link href="/privacy" className={privacyLinkClass}>
              Privacy Notice
            </Link>
          ) : (
            "Privacy Notice"
          )}
          .
        </span>
      </label>
      {error ? (
        <p id="privacy-consent-error" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Optional, unticked-by-default mailing-list opt-in for enquiry/booking forms. */
export function MarketingOptIn({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-gold"
      />
      <span>
        Also email me launch announcements and specials (optional, unsubscribe anytime).
      </span>
    </label>
  )
}
