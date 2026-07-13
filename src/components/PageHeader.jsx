import { Column, Grid } from '@carbon/react'

function PageHeader({ eyebrow, title, intro, actions, children, className = '' }) {
  const resolvedActions = actions ?? children

  return (
    <header className={`page-header ${className}`.trim()}>
      <Grid className="page-grid">
        <Column sm={4} md={8} lg={10} xlg={10} max={10}>
          {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          <p className="page-header__intro">{intro}</p>
          {resolvedActions ? <div className="page-header__actions">{resolvedActions}</div> : null}
        </Column>
      </Grid>
    </header>
  )
}

export default PageHeader