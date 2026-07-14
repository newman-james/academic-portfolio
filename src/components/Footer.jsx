import { studentName } from '../data/site.js'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-grid site-footer__inner">
        <div>
          <p className="site-footer__name">&copy; {studentName}</p>
          <p>Academic writing portfolio</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer