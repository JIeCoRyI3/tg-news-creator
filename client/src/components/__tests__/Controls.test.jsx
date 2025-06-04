import { render, screen, fireEvent } from '@testing-library/react'
import Controls from '../Controls.jsx'

describe('Controls', () => {
  test('renders buttons', () => {
    render(<Controls start={() => {}} stop={() => {}} />)
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText('Stop')).toBeInTheDocument()
  })

  test('calls start', () => {
    const fn = vi.fn()
    render(<Controls start={fn} stop={() => {}} />)
    fireEvent.click(screen.getByText('Start'))
    expect(fn).toHaveBeenCalled()
  })

  test('calls stop', () => {
    const fn = vi.fn()
    render(<Controls start={() => {}} stop={fn} />)
    fireEvent.click(screen.getByText('Stop'))
    expect(fn).toHaveBeenCalled()
  })

  test('buttons order', () => {
    render(<Controls start={() => {}} stop={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('Start')
    expect(buttons[1]).toHaveTextContent('Stop')
  })

  test('multiple clicks work', () => {
    const start = vi.fn()
    const stop = vi.fn()
    render(<Controls start={start} stop={stop} />)
    fireEvent.click(screen.getByText('Start'))
    fireEvent.click(screen.getByText('Start'))
    fireEvent.click(screen.getByText('Stop'))
    expect(start).toHaveBeenCalledTimes(2)
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
