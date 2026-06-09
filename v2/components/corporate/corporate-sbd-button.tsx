'use client'

import { FileText } from 'lucide-react'
import { SBD_FORMS_ENABLED } from '@/lib/sbd-forms'
import { scrollToElement } from '@/lib/smooth-scroll'

export function CorporateSbdButton() {
  function scrollToForm() {
    window.dispatchEvent(new CustomEvent('corporate-select-per-diem'))
    scrollToElement('corporate-enquiry')
    window.setTimeout(() => {
      scrollToElement('sbd-form-generator', { block: 'nearest' })
    }, 350)
  }

  return (
    <button
      type="button"
      disabled={!SBD_FORMS_ENABLED}
      onClick={scrollToForm}
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-terracotta/35 bg-terracotta/10 px-4 py-2.5 font-sans text-xs font-medium text-deep-earth transition-colors hover:bg-terracotta/15 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
    >
      <FileText className="h-3.5 w-3.5 text-terracotta" />
      Auto-generate SBD Forms
    </button>
  )
}
