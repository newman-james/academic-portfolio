import { Column, Grid } from '@carbon/react'

function PageShell({ children, className = '' }) {
  return (
    <div className={`page-shell ${className}`.trim()}>
      <Grid className="page-grid">
        <Column sm={4} md={8} lg={16}>
          {children}
        </Column>
      </Grid>
    </div>
  )
}

export default PageShell