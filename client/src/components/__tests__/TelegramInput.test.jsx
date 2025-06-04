import { render, screen, fireEvent } from '@testing-library/react'
import TelegramInput from '../TelegramInput.jsx'

describe('TelegramInput', () => {
  test('renders input and button', () => {
    render(<TelegramInput channelUrl="" setChannelUrl={() => {}} addChannel={() => {}} />)
    expect(screen.getByPlaceholderText('Telegram channel link')).toBeInTheDocument()
    expect(screen.getByText('Add')).toBeInTheDocument()
  })

  test('calls setter on change', () => {
    const fn = vi.fn()
    render(<TelegramInput channelUrl="" setChannelUrl={fn} addChannel={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Telegram channel link'), { target: { value: 'x' } })
    expect(fn).toHaveBeenCalledWith('x')
  })

  test('calls addChannel on button click', () => {
    const fn = vi.fn()
    render(<TelegramInput channelUrl="" setChannelUrl={() => {}} addChannel={fn} />)
    fireEvent.click(screen.getByText('Add'))
    expect(fn).toHaveBeenCalled()
  })

  test('uses provided value', () => {
    render(<TelegramInput channelUrl="abc" setChannelUrl={() => {}} addChannel={() => {}} />)
    expect(screen.getByDisplayValue('abc')).toBeInTheDocument()
  })

  test('button exists even with text', () => {
    render(<TelegramInput channelUrl="abc" setChannelUrl={() => {}} addChannel={() => {}} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
