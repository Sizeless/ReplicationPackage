import React, { Component, PropTypes } from 'react'

class ValidationErrors extends Component {
  static propTypes = {
    errors: PropTypes.arrayOf(PropTypes.string).isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {
      errors: props.errors,
    }
  }

  render() {
    return (
      <div>
        {this.state.errors.map(error => (
          <div className="errorMessage">Error: {error}</div>
        ))}
      </div>
    )
  }
}

export default ValidationErrors
