/**
 * Lightweight inline SVG icon component used across the dashboard.
 */
import PropTypes from 'prop-types'
/**
 * Render an inline SVG icon.  The `iconDef` prop should be an object
 * containing `width`, `height` and `svgPathData` properties.  These
 * definitions are provided by our local `icons.js` module.  The SVG
 * markup is constructed on the fly and injected directly into the DOM
 * via `dangerouslySetInnerHTML`.  This avoids any external
 * dependencies for icon rendering.
 */
export default function Icon({ iconDef, className = '' }) {
  const { width, height, svgPathData } = iconDef
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="currentColor" d="${svgPathData}"></path></svg>`
  return (
    <span
      className={`fa-icon ${className}`.trim()}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  )
}

Icon.propTypes = {
  /** Icon definition object with width, height and svgPathData */
  iconDef: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    svgPathData: PropTypes.string.isRequired
  }).isRequired,
  /** Optional class names for the wrapper element */
  className: PropTypes.string
}