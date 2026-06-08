/** Open generated HTML in a new tab (works across popup blockers when called from a click). */
export function openHtmlInNewTab(html: string) {
  const popup = window.open("about:blank", "_blank")
  if (popup) {
    try {
      popup.opener = null
      popup.document.open()
      popup.document.write(html)
      popup.document.close()
      popup.focus()
      return
    } catch {
      popup.close()
    }
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
}
