import { render } from '@testing-library/react'
import Icon from '../ui/Icon'

describe('Icon', () => {
  const def = { width: 16, height: 16, svgPathData: 'M0 0h16v16H0z' }

  test('renders svg markup', () => {
    const { container } = render(<Icon iconDef={def} />)
    const span = container.querySelector('span.fa-icon')
    expect(span).toBeInTheDocument()
    expect(span.innerHTML).toContain(def.svgPathData)
  })

  test('applies custom class', () => {
    const { container } = render(<Icon iconDef={def} className="extra" />)
    const span = container.querySelector('span.fa-icon')
    expect(span.className).toContain('extra')
  })
})
