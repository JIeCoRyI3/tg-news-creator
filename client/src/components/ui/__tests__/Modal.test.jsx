import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal.jsx'

describe('Modal', () => {
  test('renders content and default close button when open', () => {
    render(<Modal open onClose={() => {}}>Hello</Modal>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  test('does not render when closed', () => {
    const { queryByText } = render(<Modal open={false} onClose={() => {}}>Hi</Modal>)
    expect(queryByText('Hi')).toBeNull()
  })

  test('invokes onClose when clicking close button', () => {
    const fn = vi.fn()
    render(<Modal open onClose={fn}>Hi</Modal>)
    fireEvent.click(screen.getByText('Close'))
    expect(fn).toHaveBeenCalled()
  })

  test('renders custom actions and backdrop click closes', () => {
    const fn = vi.fn()
    const { container } = render(
      <Modal open onClose={fn} actions={<button>Action</button>}>
        Content
      </Modal>
    )
    expect(screen.getByText('Action')).toBeInTheDocument()
    fireEvent.click(container.firstChild) // click backdrop
    expect(fn).toHaveBeenCalled()
  })
})
