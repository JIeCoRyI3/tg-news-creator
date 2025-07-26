import PropTypes from 'prop-types'
import './button.css'
import { Children } from 'react'
import Icon from './Icon.jsx'
import {
  faPlus,
  faTrash,
  faFloppyDisk,
  faXmark,
  faCheck,
  faPlay,
  faStop,
  faImage
} from '../../icons.js'

/**
 * Primary button component used throughout the application.  It simply
 * applies the `shadcn-btn` class to a native button element and forwards
 * all passed props.  The styling for `.shadcn-btn` is defined in
 * `ModernDashboard.css` and `button.css`.
 */
/**
 * Primary button component used throughout the application.  A `variant`
 * prop may be supplied to change the color scheme of the button.  The
 * default variant is `primary`, which uses the purple gradient.  A
 * `danger` variant renders the button in red tones for destructive
 * actions (e.g. deletes).  Additional classes can be passed via
 * `className` and will be appended to the computed variant class.
 */
export default function Button({ className = '', variant = 'primary', startIcon = null, children, ...props }) {
  // Flatten children to extract the button label text for keyword matching
  let label = ''
  Children.forEach(children, (child) => {
    if (typeof child === 'string') {
      label += child
    } else if (child && typeof child === 'object' && typeof child.props?.children === 'string') {
      label += child.props.children
    }
  })
  const labelLower = label.trim().toLowerCase()

  // Determine an appropriate icon based on the label if none is explicitly provided
  let iconElement = null
  let finalVariant = variant
  if (!startIcon) {
    const iconMap = {
      add: faPlus,
      delete: faTrash,
      remove: faTrash,
      save: faFloppyDisk,
      cancel: faXmark,
      approve: faCheck,
      start: faPlay,
      stop: faStop,
      post: faPlay,
      image: faImage
    }
    // Find first keyword contained in the label
    for (const [keyword, iconDef] of Object.entries(iconMap)) {
      if (labelLower.includes(keyword)) {
        iconElement = <Icon iconDef={iconDef} className="btn-icon" />
        if (keyword === 'delete' || keyword === 'remove') {
          finalVariant = 'danger'
        }
        break
      }
    }
  } else {
    // Use the provided HTML string as the icon
    iconElement = (
      <span
        className="btn-icon"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: startIcon }}
      />
    )
  }

  // Compute the CSS class for the chosen variant
  const variantClass = finalVariant === 'danger' ? 'shadcn-btn-danger' : 'shadcn-btn-primary'

  return (
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      {iconElement}
      {children}
    </button>
  )
}

Button.propTypes = {
  className: PropTypes.string,
  /** Controls the color scheme of the button */
  variant: PropTypes.oneOf(['primary', 'danger']),
  /** Optional HTML string representing an SVG icon to display before the label */
  startIcon: PropTypes.string,
  children: PropTypes.node
}