import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TGSources from '../TGSources'
import apiFetch from '../../api.js'

vi.mock('../../api.js', () => ({
  default: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ title: 'Channel', image: 'img.jpg' }) }))
}))

describe('TGSources', () => {
  test('opens modal on title click', async () => {
    render(<TGSources urls={['https://t.me/test']} addUrl={() => {}} removeUrl={() => {}} />)
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    fireEvent.click(screen.getByText('Channel'))
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://t.me/test')
  })

  test('delete from modal', async () => {
    const del = vi.fn()
    render(<TGSources urls={['https://t.me/test']} addUrl={() => {}} removeUrl={del} />)
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    fireEvent.click(screen.getByText('Channel'))
    fireEvent.click(screen.getAllByText('Delete')[1])
    expect(del).toHaveBeenCalledWith('https://t.me/test')
  })
})
