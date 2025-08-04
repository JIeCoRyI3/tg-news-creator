import { render, screen, fireEvent } from '@testing-library/react'
import FilterSelect from '../FilterSelect/FilterSelect.jsx'

describe('FilterSelect', () => {
  const filters = [{ id: 'f1', title: 'Filter One' }]

  test('renders options', () => {
    render(<FilterSelect filters={filters} selected="none" setSelected={() => {}} />)
    expect(screen.getByText('No Filter')).toBeInTheDocument()
    expect(screen.getByText('Filter One')).toBeInTheDocument()
  })

  test('calls setSelected on change', () => {
    const fn = vi.fn()
    render(<FilterSelect filters={filters} selected="none" setSelected={fn} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'f1' } })
    expect(fn).toHaveBeenCalledWith('f1')
  })
})
