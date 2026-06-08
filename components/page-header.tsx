import { Reveal } from "@/components/reveal"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
}

export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] pb-14 pt-28 text-white lg:pb-20 lg:pt-36">
      <div className="grain-overlay relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          {eyebrow ? (
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">{eyebrow}</p>
          ) : null}
          <h1 className="mt-3 max-w-3xl break-words text-balance font-serif text-3xl font-bold leading-[1.05] sm:text-4xl lg:text-5xl xl:text-6xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/70 lg:text-lg">
              {subtitle}
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  )
}
