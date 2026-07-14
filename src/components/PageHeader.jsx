function PageHeader({ eyebrow, title, intro, actions, children, className = '' }) {
  const resolvedActions = actions ?? children

  return (
    <header className={`page-header ${className}`.trim()}>
      {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      <p className="page-header__intro">{intro}</p>
      {resolvedActions ? <div className="page-header__actions">{resolvedActions}</div> : null}
    </header>
  )
}

export default PageHeader