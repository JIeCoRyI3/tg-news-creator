import { render, screen } from '@testing-library/react'
import NewsList from '../NewsList'

const items = [
  { title: 't1', url: 'u1', text: 'text1', publishedAt: '2024-01-01' },
  { title: 't2', url: 'u2', text: 'text2', publishedAt: '2024-01-02' }
]

describe('NewsList', () => {
  test('renders all items', () => {
    render(<NewsList news={items} mode="json" />)
    expect(screen.getAllByText(/t[12]/).length).toBe(2)
  })

  test('renders in render mode', () => {
    render(<NewsList news={items} mode="render" />)
    expect(screen.getByText('t1')).toBeInTheDocument()
  })

  test('uses combined key to avoid duplicates', () => {
    const { container } = render(<NewsList news={[items[0], items[0]]} mode="json" />)
    const nodes = container.querySelectorAll('.news-item')
    expect(nodes.length).toBe(2)
  })

  test('renders empty list', () => {
    const { container } = render(<NewsList news={[]} mode="json" />)
    expect(container.querySelectorAll('.news-item').length).toBe(0)
  })

  test('handles missing properties gracefully', () => {
    render(<NewsList news={[{ url: 'u3', publishedAt: '2024-01-03' }]} mode="json" />)
    expect(screen.getByText(/u3/)).toBeInTheDocument()
  })
})
