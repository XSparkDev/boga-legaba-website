import type { Metadata } from "next"
import { RegistrationForm } from "@/components/register/registration-form"

export const metadata: Metadata = {
  title: "Guest Registration | Boga Legaba",
  description: "Complete your digital check-in registration for your stay at Boga Legaba.",
  robots: { index: false, follow: false },
}

type PageProps = { searchParams: Promise<{ ref?: string }> }

export default async function RegisterPage({ searchParams }: PageProps) {
  const { ref } = await searchParams

  return (
    <main className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#996948]">Digital check-in</p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">Guest registration</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please complete your details before arrival. If your booking was made by a travel agent or
            department, this captures your own contact information for our register.
          </p>
        </div>
        <RegistrationForm bookingRef={ref} />
      </div>
    </main>
  )
}
