import { render, screen } from '@testing-library/react'
import Button from '../ui/Button.jsx'

describe('Button', () => {
  test('renders with auto icon', () => {
    render(<Button>Add Item</Button>)
    const icon = document.querySelector('.btn-icon')
    expect(icon).toBeInTheDocument()
    expect(icon.innerHTML).toContain('svg')
  })

  test('danger variant for delete label', () => {
    render(<Button>Delete</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('shadcn-btn-danger')
  })
})
