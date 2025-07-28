/**
 * Generic modal dialog component rendered via a portal.  It displays its
 * children inside a centered panel and an optional actions area.  Clicking the
 * backdrop or the Close button invokes the provided callback.
 */
import PropTypes from 'prop-types'
import Button from './Button.jsx'
import './modal.css'

/**
 * Render the modal when `open` is true.
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
