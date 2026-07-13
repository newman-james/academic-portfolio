import { useState } from 'react'
import {
  Content,
  Header,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
} from '@carbon/react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import Footer from './Footer.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { navigationItems, studentName } from '../data/site.js'

function matchesPath(currentPath, targetPath) {
  if (targetPath === '/') {
    return currentPath === '/'
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}

function AppShell({ children }) {
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false)
  const location = useLocation()

  const toggleSideNav = () => {
    setIsSideNavExpanded((currentValue) => !currentValue)
  }

  const closeSideNav = () => {
    setIsSideNavExpanded(false)
  }

  return (
    <div className="app-shell">
      <SkipToContent href="#main-content" />
      <Header aria-label={`${studentName} academic writing portfolio`} className="app-shell__header">
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close navigation menu' : 'Open navigation menu'}
          className="app-shell__menu-button"
          isActive={isSideNavExpanded}
          onClick={toggleSideNav}
        />
        <HeaderName as={RouterLink} prefix={studentName} to="/">
          academic writing
        </HeaderName>
        <HeaderNavigation aria-label="Primary navigation" className="app-shell__primary-nav">
          {navigationItems.map((item) => (
            <HeaderMenuItem
              key={item.to}
              as={RouterLink}
              onClick={closeSideNav}
              to={item.to}
              isCurrentPage={matchesPath(location.pathname, item.to)}
            >
              {item.label}
            </HeaderMenuItem>
          ))}
        </HeaderNavigation>
        <HeaderGlobalBar>
          <ThemeToggle />
        </HeaderGlobalBar>
      </Header>

      <SideNav
        aria-label="Mobile navigation"
        className="app-shell__mobile-nav"
        expanded={isSideNavExpanded}
        isPersistent={false}
        onOverlayClick={() => setIsSideNavExpanded(false)}
      >
        <SideNavItems>
          {navigationItems.map((item) => (
            <SideNavLink
              key={item.to}
              as={RouterLink}
              onClick={closeSideNav}
              to={item.to}
              isActive={matchesPath(location.pathname, item.to)}
            >
              {item.label}
            </SideNavLink>
          ))}
        </SideNavItems>
      </SideNav>

      <Content id="main-content" className="app-shell__content">
        {children}
      </Content>
      <Footer />
    </div>
  )
}

export default AppShell