import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { PageHeader } from "@/components/page-header"
import { Reveal } from "@/components/reveal"
import { UnsubscribeForm } from "./unsubscribe-form"

export const metadata: Metadata = {
  title: "Unsubscribe | Boga Legaba Guest House & Conference Centre, Mahikeng",
  description: "Remove yourself from the Boga Legaba mailing list in one click.",
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  return (
    <main>
      <PageHeader
        eyebrow="Mailing List"
        title="Unsubscribe"
        subtitle="One click removes you from our mailing list - no account, no login, no questions."
      />
      <section className="section-padding bg-warm-white">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
                <UnsubscribeForm prefill={email ?? ""} />
              </Suspense>
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Changed your mind? Rejoin anytime on our{" "}
              <Link href="/specials" className="underline underline-offset-2">
                Specials
              </Link>{" "}
              or <Link href="/dining" className="underline underline-offset-2">Dining</Link> pages.
            </p>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
