import { render, screen, fireEvent } from '@testing-library/react'
import AuthorSelect from '../AuthorSelect/AuthorSelect.jsx'

describe('AuthorSelect', () => {
  const authors = [{ id: 'a1', title: 'Author One' }, { id: 'a2', title: 'Author Two' }]

  test('renders options', () => {
    render(<AuthorSelect authors={authors} selected="none" setSelected={() => {}} />)
    expect(screen.getByText('No Author')).toBeInTheDocument()
    expect(screen.getByText('Author One')).toBeInTheDocument()
  })

  test('calls setSelected on change', () => {
    const fn = vi.fn()
    render(<AuthorSelect authors={authors} selected="none" setSelected={fn} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a2' } })
    expect(fn).toHaveBeenCalledWith('a2')
  })
})
