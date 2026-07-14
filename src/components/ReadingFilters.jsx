import { Column, Grid, Select, SelectItem } from '@carbon/react'

function ReadingFilters({
  sourceTypes,
  selectedSourceType,
  onSourceTypeChange,
  resultCount,
}) {
  return (
    <section className="filter-panel" aria-label="Reading filters">
      <Grid className="filter-panel__grid">
        <Column sm={4} md={4} lg={6}>
          <Select id="reading-source-filter" labelText="Source type" onChange={(event) => onSourceTypeChange(event.target.value)} value={selectedSourceType}>
            {sourceTypes.map((sourceType) => (
              <SelectItem key={sourceType} text={sourceType} value={sourceType} />
            ))}
          </Select>
        </Column>
      </Grid>
      <p className="filter-panel__count">{resultCount} entries found</p>
    </section>
  )
}

export default ReadingFilters