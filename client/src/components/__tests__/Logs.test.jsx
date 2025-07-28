import { render, screen } from '@testing-library/react'
import Logs from '../Logs'

describe('Logs component', () => {
  test('renders container', () => {
    render(<Logs logs={[]} />)
    expect(screen.getByRole('log')).toBeInTheDocument()
  })

  test('renders messages', () => {
    render(<Logs logs={['a', 'b']} />)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  test('renders empty when no logs', () => {
    render(<Logs logs={[]} />)
    expect(screen.queryByText(/./)).toBeNull()
  })

  test('updates when logs change', () => {
    const { rerender } = render(<Logs logs={['one']} />)
    expect(screen.getByText('one')).toBeInTheDocument()
    rerender(<Logs logs={['two']} />)
    expect(screen.getByText('two')).toBeInTheDocument()
  })

  test('maintains order of logs', () => {
    const messages = ['first', 'second']
    render(<Logs logs={messages} />)
    const items = screen.getAllByText(/first|second/)
    expect(items[0]).toHaveTextContent('first')
    expect(items[1]).toHaveTextContent('second')
  })
})
