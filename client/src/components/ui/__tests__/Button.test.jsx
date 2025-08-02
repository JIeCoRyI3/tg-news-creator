import { render, screen } from '@testing-library/react'
import Button from '../Button.jsx'

describe('Button', () => {
  test('renders children with default primary style', () => {
    render(<Button>Click me</Button>)
    const btn = screen.getByRole('button', { name: /click me/i })
    expect(btn).toHaveClass('shadcn-btn-primary')
  })

  test('detects delete keyword and shows danger style with icon', () => {
    render(<Button>Delete item</Button>)
    const btn = screen.getByRole('button', { name: /delete item/i })
    expect(btn).toHaveClass('shadcn-btn-danger')
    expect(btn.querySelector('.btn-icon')).toBeInTheDocument()
  })

  test('renders provided startIcon HTML', () => {
    render(<Button startIcon='<svg data-testid="start-icon"></svg>'>Save</Button>)
    expect(screen.getByTestId('start-icon')).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: /save/i })
    expect(btn).toHaveClass('shadcn-btn-primary')
  })
})
