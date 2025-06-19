import { render, screen, fireEvent } from '@testing-library/react'
import Controls from '../Controls.jsx'

describe('Controls', () => {
  test('renders buttons', () => {
    render(<Controls startGet={() => {}} startPost={() => {}} stop={() => {}} />)
    expect(screen.getByText('Start Getting')).toBeInTheDocument()
    expect(screen.getByText('Start Posting')).toBeInTheDocument()
    expect(screen.getByText('Stop')).toBeInTheDocument()
  })

  test('calls start', () => {
    const fn = vi.fn()
    render(<Controls startGet={fn} startPost={() => {}} stop={() => {}} />)
    fireEvent.click(screen.getByText('Start Getting'))
    expect(fn).toHaveBeenCalled()
  })

  test('calls stop', () => {
    const fn = vi.fn()
    render(<Controls startGet={() => {}} startPost={() => {}} stop={fn} />)
    fireEvent.click(screen.getByText('Stop'))
    expect(fn).toHaveBeenCalled()
  })

  test('buttons order', () => {
    render(<Controls startGet={() => {}} startPost={() => {}} stop={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('Start Getting')
    expect(buttons[1]).toHaveTextContent('Start Posting')
    expect(buttons[2]).toHaveTextContent('Stop')
  })

  test('multiple clicks work', () => {
    const start = vi.fn()
    const stop = vi.fn()
    render(<Controls startGet={start} startPost={() => {}} stop={stop} />)
    fireEvent.click(screen.getByText('Start Getting'))
    fireEvent.click(screen.getByText('Start Getting'))
    fireEvent.click(screen.getByText('Stop'))
    expect(start).toHaveBeenCalledTimes(2)
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
