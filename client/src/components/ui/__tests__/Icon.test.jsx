import { render } from '@testing-library/react'
import Icon from '../Icon'

describe('Icon', () => {
  test('renders svg from iconDef', () => {
    const iconDef = { width: 10, height: 10, svgPathData: 'M0 0h10v10H0z' }
    const { container } = render(<Icon iconDef={iconDef} className="extra" />)
    const span = container.querySelector('span.fa-icon.extra')
    expect(span).toBeInTheDocument()
    expect(span.innerHTML).toContain('svg')
    expect(span.innerHTML).toContain('M0 0h10v10H0z')
  })
})
