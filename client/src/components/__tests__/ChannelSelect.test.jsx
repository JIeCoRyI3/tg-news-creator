import { render, screen, fireEvent } from '@testing-library/react'
import ChannelSelect from '../ChannelSelect'

describe('ChannelSelect', () => {
  const channels = [
    { id: '1', title: 'Channel 1', username: '@c1' },
    { id: '2', title: 'Channel 2', username: '@c2' }
  ]

  test('renders checkboxes', () => {
    render(<ChannelSelect channels={channels} selected={[]} setSelected={() => {}} />)
    expect(screen.getByLabelText('@c1')).toBeInTheDocument()
    expect(screen.getByLabelText('@c2')).toBeInTheDocument()
  })

  test('toggle selection', () => {
    const fn = vi.fn()
    render(<ChannelSelect channels={channels} selected={[]} setSelected={fn} />)
    fireEvent.click(screen.getByLabelText('@c1'))
    expect(fn).toHaveBeenCalled()
  })
})
