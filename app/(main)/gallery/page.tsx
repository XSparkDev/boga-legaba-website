import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { GalleryGrid } from "@/components/gallery/gallery-grid"
import { buildGalleryBrowserItems } from "@/data/gallery-browser"
import { getSiteImageOverrides, resolveSiteImageFrom } from "@/lib/site-images-live"

export const metadata: Metadata = {
  title: "Gallery | Boga Legaba Guest House & Conference Centre",
  description:
    "See Boga Legaba: photo gallery of our Chababa, Interlaken A and Lantana properties, conference facilities and dining spaces in Mahikeng.",
}

export const dynamic = "force-dynamic"

export default async function GalleryPage() {
  const overrides = await getSiteImageOverrides()
  const items = buildGalleryBrowserItems((key) => resolveSiteImageFrom(overrides, key))

  return (
    <main>
      <PageHeader eyebrow="Gallery" title="See Boga Legaba" subtitle="A closer look at our rooms, properties, conference venue and spaces." />

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GalleryGrid initialItems={items} />

          <div className="mt-14 flex justify-center">
            <Link
              href="/stay"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-[#000000] transition-colors hover:bg-[#b8943c]"
            >
              Book a Room You Love <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
