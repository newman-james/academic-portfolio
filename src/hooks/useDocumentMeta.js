import { useEffect } from 'react'
import { studentName } from '../data/site.js'

function updateMeta(selector, attribute, content) {
  const element = document.head.querySelector(selector)

  if (element && content) {
    element.setAttribute(attribute, content)
  }
}

export default function useDocumentMeta(title, description) {
  useEffect(() => {
    document.title = `${title} | ${studentName}`
    updateMeta('meta[name="description"]', 'content', description)
    updateMeta('meta[property="og:title"]', 'content', `${title} | ${studentName}`)
    updateMeta('meta[property="og:description"]', 'content', description)
  }, [description, title])
}