import { Button } from '@carbon/react'
import { Maximize, Minimize } from '@carbon/icons-react'
import { useId, useRef } from 'react'
import { chartXLabel, parseArticleChart } from '../utils/articleCharts.js'

const datasets = import.meta.glob('../../public/datasets/*.csv', {
  eager: true,
  import: 'default',
  query: '?raw',
})

const colours = [
  'var(--article-chart-color-1)',
  'var(--article-chart-color-2)',
  'var(--article-chart-color-3)',
  'var(--article-chart-color-4)',
  'var(--article-chart-color-5)',
]

function ChartGraphic({ rows, config, label }) {
  const width = 760
  const max = Math.max(...rows.map(row => row.y))
  const ceiling = max === 0 ? 1 : Math.ceil(max / (10 ** Math.floor(Math.log10(max)))) * (10 ** Math.floor(Math.log10(max)))
  const series = [...new Set(rows.map(row => row.series))]
  const categories = [...new Set(rows.map(row => row.x))]
  const isBar = config.type === 'bar'
  const height = isBar ? Math.max(220, categories.length * 34 + 70) : 360
  const left = isBar ? 125 : 60
  const right = 32
  const top = 25
  const bottom = isBar ? 40 : 55
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const x = (index) => left + (categories.length === 1 ? plotWidth / 2 : index * plotWidth / (categories.length - 1))
  const y = (value) => top + plotHeight - value / ceiling * plotHeight
  const tickValue = (index) => Number((ceiling * index / 4).toPrecision(4))

  return (
    <svg className="article-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}. ${config.yLabel}. Data values are available in the table below.`}>
      {!isBar && Array.from({ length: 5 }, (_, i) => (
        <g key={i}>
          <line className="article-chart__grid" x1={left} x2={width - right} y1={y(tickValue(i))} y2={y(tickValue(i))} />
          <text className="article-chart__axis" x={left - 10} y={y(tickValue(i)) + 4} textAnchor="end">{tickValue(i)}</text>
        </g>
      ))}
      {isBar ? (
        <>
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i}>
              <line className="article-chart__grid" x1={left + plotWidth * i / 4} x2={left + plotWidth * i / 4} y1={top} y2={height - bottom} />
              <text className="article-chart__axis" x={left + plotWidth * i / 4} y={height - 15} textAnchor="middle">{tickValue(i)}</text>
            </g>
          ))}
          {rows.map((row, index) => {
            const barY = top + index * plotHeight / rows.length
            return (
              <g key={row.x}>
                <text className="article-chart__axis" x={left - 10} y={barY + 18} textAnchor="end">{row.x}</text>
                <rect x={left} y={barY + 2} width={row.y / ceiling * plotWidth} height={22} fill={colours[0]}>
                  <title>{`${row.x}: ${row.y}`}</title>
                </rect>
                <text className="article-chart__value" x={Math.min(left + row.y / ceiling * plotWidth + 6, width - right)} y={barY + 18}>{row.y}</text>
              </g>
            )
          })}
        </>
      ) : (
        <>
          {categories.map((category, index) => (
            <text className="article-chart__axis" key={category} x={x(index)} y={height - bottom + 21} textAnchor="middle">{chartXLabel(category, config.xFormat)}</text>
          ))}
          {series.map((name, seriesIndex) => {
            const byCategory = new Map(rows.filter(row => row.series === name).map(row => [row.x, row]))
            const points = categories.map((category, index) => {
              const row = byCategory.get(category)
              return row ? { ...row, px: x(index), py: y(row.y) } : null
            })
            const path = points.reduce((result, point, index) => point
              ? `${result}${index > 0 && points[index - 1] ? ' L' : ' M'}${point.px},${point.py}`
              : result, '')
            return (
              <g key={name}>
                <path d={path} fill="none" stroke={colours[seriesIndex % colours.length]} strokeWidth="3" strokeDasharray={seriesIndex % 2 ? '8 4' : undefined} />
                {points.filter(Boolean).map(point => (
                  <circle key={point.x} cx={point.px} cy={point.py} r="4" fill={colours[seriesIndex % colours.length]}>
                    <title>{`${name}, ${chartXLabel(point.x, config.xFormat)}: ${point.y}${point.status ? ` (${point.status})` : ''}`}</title>
                  </circle>
                ))}
              </g>
            )
          })}
        </>
      )}
    </svg>
  )
}

function ArticleChart({ dataset, number }) {
  const dialogRef = useRef(null)
  const expandRef = useRef(null)
  const dialogId = useId()
  let rows
  try {
    const csv = datasets[`../../public/datasets/${dataset.file}`]
    if (csv === undefined) throw new Error(`Dataset ${dataset.file} was not found.`)
    rows = parseArticleChart(csv, dataset.chart)
  } catch (error) {
    return <p role="alert">Unable to render Figure {number}: {error.message}</p>
  }
  const config = dataset.chart
  const series = [...new Set(rows.map(row => row.series))]
  const graphic = <ChartGraphic rows={rows} config={config} label={`Figure ${number}: ${dataset.caption}`} />

  return (
    <div className="article-chart">
      <p className="article-chart__unit">{config.yLabel}</p>
      {config.type === 'line' && (
        <ul className="article-chart__legend" aria-label="Chart series">
          {series.map((name, index) => (
            <li key={name}><span className={index % 2 ? 'article-chart__swatch article-chart__swatch--dashed' : 'article-chart__swatch'} style={{ borderColor: colours[index % colours.length] }} />{name}</li>
          ))}
        </ul>
      )}
      <div className="article-chart__scroll" role="region" aria-label={`Figure ${number} chart; scroll horizontally if needed`} tabIndex={0}>{graphic}</div>
      <Button ref={expandRef} className="article-image-expand no-print" kind="ghost" size="sm" renderIcon={Maximize} aria-haspopup="dialog" aria-controls={dialogId} onClick={() => dialogRef.current.showModal()}>
        View chart fullscreen
      </Button>
      {config.note && <p className="article-chart__note">{config.note}</p>}
      <details className="article-chart__data">
        <summary>View chart data</summary>
        <div className="article-table-scroll" tabIndex={0} role="region" aria-label={`Figure ${number} chart data; scroll horizontally if needed`}>
          <table>
            <thead><tr><th scope="col">{config.x}</th>{config.series && <th scope="col">{config.series}</th>}<th scope="col">{config.yLabel}</th>{config.status && <th scope="col">{config.status}</th>}</tr></thead>
            <tbody>{rows.map(row => <tr key={JSON.stringify([row.x, row.series])}><td>{chartXLabel(row.x, config.xFormat)}</td>{config.series && <td>{row.series}</td>}<td>{row.y}</td>{config.status && <td>{row.status}</td>}</tr>)}</tbody>
          </table>
        </div>
      </details>
      <dialog ref={dialogRef} id={dialogId} className="article-image-dialog no-print" aria-label={`Fullscreen Figure ${number}`} onClose={() => expandRef.current?.focus()}>
        <form method="dialog"><Button type="submit" kind="tertiary" size="sm" renderIcon={Minimize} autoFocus>Close fullscreen chart</Button></form>
        <p>{dataset.caption} — {config.yLabel}</p>
        {config.type === 'line' && <ul className="article-chart__legend">{series.map((name, index) => <li key={name}><span className={index % 2 ? 'article-chart__swatch article-chart__swatch--dashed' : 'article-chart__swatch'} style={{ borderColor: colours[index % colours.length] }} />{name}</li>)}</ul>}
        <div className="article-image-dialog-content article-chart__scroll" tabIndex={0}>{graphic}</div>
        {config.note && <p className="article-chart__note">{config.note}</p>}
      </dialog>
    </div>
  )
}

export default ArticleChart
