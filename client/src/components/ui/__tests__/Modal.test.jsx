import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal'

describe('Modal', () => {
  test('does not render when closed', () => {
    const { container } = render(<Modal open={false} onClose={() => {}}>Body</Modal>)
    expect(container).toBeEmptyDOMElement()
  })

  test('renders children and actions when open', () => {
    render(
      <Modal open onClose={() => {}} actions={<button>Action</button>}>
        Content
      </Modal>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  test('calls onClose when close button clicked', () => {
    const fn = vi.fn()
    render(<Modal open onClose={fn}>Body</Modal>)
    fireEvent.click(screen.getByText('Close'))
    expect(fn).toHaveBeenCalled()
  })

  test('calls onClose when backdrop clicked', () => {
    const fn = vi.fn()
    const { container } = render(<Modal open onClose={fn}>Body</Modal>)
    fireEvent.click(container.querySelector('.modal-backdrop'))
    expect(fn).toHaveBeenCalled()
  })

  test('does not call onClose when modal content clicked', () => {
    const fn = vi.fn()
    const { container } = render(<Modal open onClose={fn}>Body</Modal>)
    fireEvent.click(container.querySelector('.modal'))
    expect(fn).not.toHaveBeenCalled()
  })
})
