import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../ui/Modal.jsx'

describe('Modal', () => {
  test('renders when open', () => {
    render(<Modal open onClose={() => {}}>Content</Modal>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  test('calls onClose', () => {
    const fn = vi.fn()
    render(<Modal open onClose={fn}>Content</Modal>)
    fireEvent.click(screen.getByText('Close'))
    expect(fn).toHaveBeenCalled()
  })
})
