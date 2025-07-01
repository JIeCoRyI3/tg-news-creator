import PropTypes from 'prop-types'
import './button.css'

export default function Button({ className = '', ...props }) {
  return <button className={`shadcn-btn ${className}`.trim()} {...props} />
}

Button.propTypes = {
  className: PropTypes.string
}
