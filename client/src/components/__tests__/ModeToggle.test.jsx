import { render, screen, fireEvent } from '@testing-library/react'
import ModeToggle from '../ModeToggle'

describe('ModeToggle', () => {
  test('initial selection', () => {
    render(<ModeToggle mode="json" setMode={() => {}} />)
    expect(screen.getByLabelText('JSON')).toBeChecked()
    expect(screen.getByLabelText('Render')).not.toBeChecked()
  })

  test('switch to render', () => {
    const fn = vi.fn()
    render(<ModeToggle mode="json" setMode={fn} />)
    fireEvent.click(screen.getByLabelText('Render'))
    expect(fn).toHaveBeenCalledWith('render')
  })

  test('switch to json', () => {
    const fn = vi.fn()
    render(<ModeToggle mode="render" setMode={fn} />)
    fireEvent.click(screen.getByLabelText('JSON'))
    expect(fn).toHaveBeenCalledWith('json')
  })

  test('shows render checked when prop is render', () => {
    render(<ModeToggle mode="render" setMode={() => {}} />)
    expect(screen.getByLabelText('Render')).toBeChecked()
  })

  test('radio buttons have proper labels', () => {
    render(<ModeToggle mode="json" setMode={() => {}} />)
    expect(screen.getByLabelText('JSON')).toBeInTheDocument()
    expect(screen.getByLabelText('Render')).toBeInTheDocument()
  })
})
