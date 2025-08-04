import { render } from '@testing-library/react'
import Icon from '../ui/Icon.jsx'
import { faPlus } from '../../icons.js'

describe('Icon', () => {
  test('renders svg from definition', () => {
    const { container } = render(<Icon iconDef={faPlus} />)
    const span = container.querySelector('span')
    expect(span.innerHTML).toContain('<svg')
  })
})
