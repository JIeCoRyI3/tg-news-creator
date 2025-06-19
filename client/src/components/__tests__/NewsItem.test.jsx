import { render, screen } from '@testing-library/react'
import NewsItem from '../NewsItem.jsx'

describe('NewsItem', () => {
  const item = {
    title: 'Title',
    url: 'http://x',
    text: 'text',
    html: '<p>text</p>',
    image: 'img.jpg',
    media: ['img.jpg'],
    publishedAt: new Date('2024-01-01').toISOString()
  }

  test('renders json', () => {
    render(<NewsItem item={item} mode="json" />)
    expect(screen.getByText(/\"Title\"/)).toBeInTheDocument()
  })

  test('renders title', () => {
    render(<NewsItem item={item} mode="render" />)
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  test('renders image when present', () => {
    render(<NewsItem item={item} mode="render" />)
    const img = document.querySelector('img')
    expect(img).toHaveAttribute('src', 'img.jpg')
  })

  test('renders link', () => {
    render(<NewsItem item={item} mode="render" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', item.url)
  })

  test('shows formatted date', () => {
    render(<NewsItem item={item} mode="render" />)
    expect(screen.getByText('1/1/2024', { exact: false })).toBeInTheDocument()
  })
})
