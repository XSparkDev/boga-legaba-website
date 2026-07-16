import type { Metadata } from 'next'
import { PageHeader } from '@v2/components/page-header'
import { GalleryBrowser } from '@v2/components/gallery/gallery-browser'

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Photo gallery of Boga Legaba Guest House Mahikeng: rooms, properties, conference and dining.',
}

export default function GalleryPage() {
  return (
    <main>
      <PageHeader
        label="Gallery"
        title="A glimpse of Boga Legaba."
        subtitle="Rooms, properties and spaces across our Mahikeng portfolio."
      />

      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <GalleryBrowser />
        </div>
      </section>
    </main>
  )
}
