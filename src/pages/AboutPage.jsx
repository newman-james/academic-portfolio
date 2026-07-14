import { Tile } from '@carbon/react'
import MarkdownArticle from '../components/MarkdownArticle.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PageShell from '../components/PageShell.jsx'
import { aboutSections } from '../content/aboutSections.js'
import { siteDescription } from '../data/site.js'
import useDocumentMeta from '../hooks/useDocumentMeta.js'

function AboutPage() {
  useDocumentMeta('About', `About the portfolio, study interests and writing process. ${siteDescription}`)

  return (
    <PageShell>
      <PageHeader
        eyebrow="About"
        title="Ideas, evidence and independent enquiry"
        intro="This portfolio brings together my academic writing, reading and research interests. It shows how I develop questions, test arguments against evidence and refine my thinking across economics, politics, business and contemporary affairs."
      />
      <section className="page-section">
        <div className="about-page__grid">
          {aboutSections.map((section) => (
            <Tile key={section.id} className="about-tile">
              <MarkdownArticle className="about-tile__markdown" content={section.content} />
            </Tile>
          ))}
        </div>
      </section>
    </PageShell>
  )
}

export default AboutPage