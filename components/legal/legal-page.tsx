import type { ReactNode } from "react"
import { PageHeader } from "@/components/page-header"
import { Reveal } from "@/components/reveal"

/**
 * Shared layout for the legal/policy pages (/privacy, /terms,
 * /booking-terms, /cancellation-policy, /cookies). Single h1 via PageHeader,
 * readable prose width, "Last updated" line. Content sections are passed as
 * children (each page owns its copy).
 */
export function LegalPage({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string
  subtitle: string
  updated: string
  children: ReactNode
}) {
  return (
    <main>
      <PageHeader eyebrow="Legal" title={title} subtitle={subtitle} />
      <section className="section-padding bg-warm-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Last updated: {updated}. Items marked like <Todo>confirm with Boga Legaba</Todo>{" "}
              are placeholders awaiting client confirmation and will be finalised before they apply.
            </p>
          </Reveal>
          <div className="mt-10 space-y-10">{children}</div>
        </div>
      </section>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-body-text">{children}</div>
    </section>
  )
}

/**
 * Visible placeholder for business-specific details still to be confirmed
 * with the client. Greppable ([TODO:) and highlighted so it can't ship
 * unnoticed.
 */
export function Todo({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-amber-200/70 px-1 py-0.5 font-mono text-xs text-amber-950">
      [TODO: {children}]
    </mark>
  )
}
