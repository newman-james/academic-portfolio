import { GroupedBarChart, LineChart, SimpleBarChart } from '@carbon/charts-react'
import useTheme from '../theme/useTheme.js'
import { carbonChartOptions, parseArticleChart, toCarbonChartData } from '../utils/articleCharts.js'

const datasets = import.meta.glob('../../public/datasets/*.csv', {
  eager: true,
  import: 'default',
  query: '?raw',
})

function ChartGraphic({ rows, config, label, theme, file }) {
  const Chart = config.type === 'line' ? LineChart : config.series ? GroupedBarChart : SimpleBarChart
  const data = toCarbonChartData(rows, config)
  const downloadSource = () => {
    const link = document.createElement('a')
    link.href = `${import.meta.env.BASE_URL}datasets/${file}`
    link.download = file
    document.body.append(link)
    link.click()
    link.remove()
  }
  const options = carbonChartOptions(config, label, theme, rows, downloadSource)
  options.fileDownload = { fileName: `${file.replace(/\.csv$/i, '')}-plotted` }

  return <Chart data={data} options={options} />
}

function ArticleChart({ dataset, number, title }) {
  const { theme } = useTheme()
  let rows
  try {
    const csv = datasets[`../../public/datasets/${dataset.file}`]
    if (csv === undefined) throw new Error(`Dataset ${dataset.file} was not found.`)
    rows = parseArticleChart(csv, dataset.chart)
  } catch (error) {
    return <p role="alert">Unable to render Figure {number}: {error.message}</p>
  }
  const config = dataset.chart
  const label = title

  return (
    <div className="article-chart">
      <div className="article-chart__scroll" role="region" aria-label={`Figure ${number} chart; scroll horizontally if needed`} tabIndex={0}>
        <div className="article-chart__graphic"><ChartGraphic rows={rows} config={config} label={label} theme={theme} file={dataset.file} /></div>
      </div>
      {config.note && <p className="article-chart__note">{config.note}</p>}
    </div>
  )
}

export default ArticleChart
