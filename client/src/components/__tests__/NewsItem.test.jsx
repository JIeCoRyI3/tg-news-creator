import { render, screen } from '@testing-library/react'
import NewsItem from '../NewsItem'

describe('NewsItem', () => {
  const item = {
    title: 'Title',
    url: 'http://x',
    text: 'text',
    html: '<p>text</p>',
    image: 'img.jpg',
    media: ['img.jpg'],
    publishedAt: new Date('2024-01-01').toISOString(),
    channelTitle: 'Channel',
    channelImage: 'ch.jpg'
  }

  test('renders json', () => {
    render(<NewsItem item={item} mode="json" />)
    expect(screen.getByText(/"Title"/)).toBeInTheDocument()
  })

  test('renders title', () => {
    render(<NewsItem item={item} mode="render" />)
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  test('renders image when present', () => {
    render(<NewsItem item={item} mode="render" />)
    const imgs = document.querySelectorAll('img')
    expect(imgs[0]).toHaveAttribute('src', 'ch.jpg')
    expect(imgs[1]).toHaveAttribute('src', 'img.jpg')
  })

  test('shows channel title', () => {
    render(<NewsItem item={item} mode="render" />)
    expect(screen.getByText('Channel')).toBeInTheDocument()
  })

  test('renders link', () => {
    render(<NewsItem item={item} mode="render" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', item.url)
  })

  test('shows formatted date', () => {
    render(<NewsItem item={item} mode="render" />)
    expect(screen.getByText('1/1/2024', { exact: false })).toBeInTheDocument()
  })

  test('sanitizes html', () => {
    const unsafe = { ...item, html: '<p>ok</p><script>bad()</script>' }
    const { container } = render(<NewsItem item={unsafe} mode="render" />)
    expect(container.querySelectorAll('script').length).toBe(0)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})
