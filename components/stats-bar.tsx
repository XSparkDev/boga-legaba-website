const STATS = [
  { value: "27", label: "Rooms" },
  { value: "3", label: "Properties" },
  { value: "10+", label: "Years" },
  { value: "80+", label: "Conference Capacity" },
]

export function StatsBar() {
  return (
    <section className="grain relative overflow-hidden bg-[#0A0A0A] text-white py-20">
      <div className="relative z-[2] mx-auto flex max-w-7xl flex-col items-stretch px-4 sm:px-6 md:flex-row md:justify-center lg:px-8">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="flex flex-1 items-center justify-center">
            {i !== 0 ? <div className="w-[1px] h-12 bg-white/10 hidden md:block" /> : null}
            <div className="flex flex-col items-center justify-center px-8 py-4 md:py-0">
              <span className="font-display text-[clamp(32px,4vw,48px)] text-gold leading-none">
                {stat.value}
              </span>
              <span className="font-mono text-[11px] tracking-[0.15em] text-white/60 uppercase mt-2">
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
