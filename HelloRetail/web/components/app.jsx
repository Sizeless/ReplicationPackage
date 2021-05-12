import React, { Component } from 'react'
import { Link } from 'react-router'
import config from '../config'

class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const app = this
    let children = null

    // Maps properties to child components dynamically, allowing those properties to be bound once available.
    children = React.Children.map(this.props.children, child => React.cloneElement(child, {}))

    return (
      <div>
        <Link className="homeLink glyphicon glyphicon-home" to={'/'} />
        <div className="app text-center container" >
          <h1>{config.WebAppName}</h1>
            <h4>Welcome</h4>
          <hr />
          <div className="content">
            {children}
          </div>
          {config.Stage !== 'prod' ? (<h6 className="stageLabel">{config.Stage}</h6>) : null }
        </div>
      </div>
    )
  }
}

export default App
