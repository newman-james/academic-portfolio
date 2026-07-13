import { Column, Grid, Select, SelectItem } from '@carbon/react'

function ReadingFilters({
  statuses,
  selectedStatus,
  onStatusChange,
  sourceTypes,
  selectedSourceType,
  onSourceTypeChange,
  resultCount,
}) {
  return (
    <section className="filter-panel" aria-label="Reading filters">
      <Grid className="page-grid filter-panel__grid">
        <Column sm={4} md={4} lg={6}>
          <Select id="reading-status-filter" labelText="Reading status" onChange={(event) => onStatusChange(event.target.value)} value={selectedStatus}>
            {statuses.map((status) => (
              <SelectItem key={status} text={status} value={status} />
            ))}
          </Select>
        </Column>
        <Column sm={4} md={4} lg={6}>
          <Select id="reading-source-filter" labelText="Source type" onChange={(event) => onSourceTypeChange(event.target.value)} value={selectedSourceType}>
            {sourceTypes.map((sourceType) => (
              <SelectItem key={sourceType} text={sourceType} value={sourceType} />
            ))}
          </Select>
        </Column>
      </Grid>
      <Grid className="page-grid">
        <Column sm={4} md={8} lg={12}>
          <p className="filter-panel__count">{resultCount} entries found</p>
        </Column>
      </Grid>
    </section>
  )
}

export default ReadingFilters