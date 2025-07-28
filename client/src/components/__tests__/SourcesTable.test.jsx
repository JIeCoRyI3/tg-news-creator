import { render, screen, fireEvent } from '@testing-library/react'
import SourcesTable from '../SourcesTable'

describe('SourcesTable', () => {
  const sources = { a: 'A', b: 'B' }
  const statuses = { a: { status: 'connected', lastPing: Date.now() } }

  test('renders sources', () => {
    render(<SourcesTable sources={sources} selected={[]} toggle={() => {}} statuses={{}} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  test('calls toggle on row click', () => {
    const fn = vi.fn()
    render(<SourcesTable sources={sources} selected={[]} toggle={fn} statuses={{}} />)
    fireEvent.click(screen.getByText('A'))
    expect(fn).toHaveBeenCalledWith('a')
  })

  test('row has selected class', () => {
    render(<SourcesTable sources={sources} selected={['a']} toggle={() => {}} statuses={{}} />)
    expect(screen.getByText('A').closest('tr')).toHaveClass('selected')
  })

  test('status connected shows text', () => {
    render(<SourcesTable sources={sources} selected={[]} toggle={() => {}} statuses={statuses} />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  test('ping displays number', () => {
    render(<SourcesTable sources={sources} selected={[]} toggle={() => {}} statuses={statuses} />)
    expect(screen.getByText(/\d+/)).toBeInTheDocument()
  })
})
