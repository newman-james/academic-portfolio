import { HeaderGlobalAction } from '@carbon/react'
import { Light, Moon } from '@carbon/icons-react'
import useTheme from '../theme/useTheme.js'

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  const label = isDark ? 'Switch to light appearance' : 'Switch to dark appearance'

  return (
    <HeaderGlobalAction aria-label={label} onClick={toggleTheme} tooltipAlignment="end">
      {isDark ? <Light size={20} /> : <Moon size={20} />}
    </HeaderGlobalAction>
  )
}

export default ThemeToggle