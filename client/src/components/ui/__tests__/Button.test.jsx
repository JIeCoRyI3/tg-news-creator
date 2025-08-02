import { render, screen } from '@testing-library/react'
import Button from '../Button'

describe('Button', () => {
  test('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  test('auto adds icon and danger variant for delete label', () => {
    render(<Button>Delete item</Button>)
    const button = screen.getByRole('button', { name: /delete item/i })
    expect(button).toHaveClass('shadcn-btn-danger')
    expect(button.querySelector('.btn-icon')).toBeInTheDocument()
  })

  test('uses provided startIcon and keeps primary variant', () => {
    const icon = '<svg data-testid="custom-icon"></svg>'
    render(<Button startIcon={icon}>Delete</Button>)
    const button = screen.getByRole('button', { name: /delete/i })
    expect(button).toHaveClass('shadcn-btn-primary')
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})
