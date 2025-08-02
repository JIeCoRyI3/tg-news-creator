import { render } from '@testing-library/react'
import Button from '../ui/Button'

describe('Button', () => {
  test('adds icon and danger variant for delete label', () => {
    const { container } = render(<Button>Delete item</Button>)
    const button = container.querySelector('button')
    expect(button.className).toContain('shadcn-btn-danger')
    expect(container.querySelector('.btn-icon')).toBeInTheDocument()
  })

  test('uses provided startIcon without changing variant', () => {
    const icon = '<svg data-testid="custom"></svg>'
    const { container } = render(<Button startIcon={icon}>Delete</Button>)
    const button = container.querySelector('button')
    expect(button.className).toContain('shadcn-btn-primary')
    expect(container.querySelector('[data-testid="custom"]')).toBeInTheDocument()
  })
})
