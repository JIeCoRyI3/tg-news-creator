import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../ui/Modal'

describe('Modal', () => {
  test('does not render when closed', () => {
    const { container } = render(<Modal open={false} onClose={() => {}}>content</Modal>)
    expect(container).toBeEmptyDOMElement()
  })

  test('renders content and close button when open', () => {
    render(<Modal open onClose={() => {}}>content</Modal>)
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  test('backdrop and close button trigger onClose, modal body does not', () => {
    const fn = vi.fn()
    const { container } = render(
      <Modal open onClose={fn}>
        <div>body</div>
      </Modal>
    )
    fireEvent.click(container.firstChild) // backdrop
    expect(fn).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(fn).toHaveBeenCalledTimes(2)
    fireEvent.click(container.querySelector('.modal'))
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
