import { Column, Grid, Tile } from '@carbon/react'
import PageHeader from '../components/PageHeader.jsx'
import { siteDescription } from '../data/site.js'
import useDocumentMeta from '../hooks/useDocumentMeta.js'

function AboutPage() {
  useDocumentMeta('About', `About the portfolio, study interests and writing process. ${siteDescription}`)

  return (
    <>
      <PageHeader
        eyebrow="About"
        title="About the student and the purpose of the portfolio"
        intro="This page is intentionally written as a placeholder structure so that personal details can be added carefully later without changing the site architecture."
      />
      <section className="page-section">
        <Grid>
          <Column sm={4} md={4} lg={6}>
            <Tile className="about-tile">
              <h2>Academic biography</h2>
              <p>
                Placeholder for a short academic biography describing the student’s areas of study, approach to reading and reasons for maintaining the portfolio.
              </p>
            </Tile>
          </Column>
          <Column sm={4} md={4} lg={6}>
            <Tile className="about-tile">
              <h2>Academic interests</h2>
              <p>
                Placeholder for a brief account of the questions, fields and recurring themes that most often shape reading and writing choices.
              </p>
            </Tile>
          </Column>
          <Column sm={4} md={4} lg={6}>
            <Tile className="about-tile">
              <h2>Purpose of the portfolio</h2>
              <p>
                Placeholder for an explanation of how the site demonstrates subject engagement, independent study, revision habits and intellectual development for future applications.
              </p>
            </Tile>
          </Column>
          <Column sm={4} md={4} lg={6}>
            <Tile className="about-tile">
              <h2>Selecting and revising writing</h2>
              <p>
                Placeholder for notes on how work is chosen, revised, annotated and linked to reading so that progress is visible rather than implied.
              </p>
            </Tile>
          </Column>
          <Column sm={4} md={4} lg={6}>
            <Tile className="about-tile">
              <h2>Contact</h2>
              <p>
                Placeholder for a parent-managed or school-managed contact method. No direct personal contact details are included at this stage.
              </p>
            </Tile>
          </Column>
        </Grid>
      </section>
    </>
  )
}

export default AboutPage