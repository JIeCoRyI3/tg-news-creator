import { render } from '@testing-library/react'
import Icon from '../Icon.jsx'

describe('Icon', () => {
  const testIcon = { width: 10, height: 20, svgPathData: 'M0 0h10v20z' }

  test('renders span with svg markup', () => {
    const { container } = render(<Icon iconDef={testIcon} className="extra" />)
    const span = container.querySelector('span')
    expect(span).toHaveClass('fa-icon', 'extra')
    expect(span.innerHTML).toContain(testIcon.svgPathData)
  })
})
