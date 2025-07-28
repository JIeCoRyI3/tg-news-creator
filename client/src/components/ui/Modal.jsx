/**
 * Generic modal dialog used for confirmations and forms.
 */
import PropTypes from 'prop-types'
import Button from './Button.jsx'
import './modal.css'

/**
 * Render a modal dialog when `open` is true.
 */
export default function Modal({ open, onClose, children, actions = null }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {children}
        <div className="modal-actions">
          {actions}
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

Modal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  children: PropTypes.node,
  actions: PropTypes.node
}
