import { studentName } from '../data/site.js'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-grid site-footer__inner">
        <div>
          <p className="site-footer__name">{studentName}</p>
          <p>Academic writing portfolio</p>
        </div>
        <div>
          <p>{new Date().getFullYear()}</p>
          <p>Built with React and IBM Carbon Design System</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer