import React, { Component, PropTypes } from 'react'
import { Link } from 'react-router'
import config from '../../config'

class ProductCard extends Component {
  static propTypes = {
    brand: PropTypes.string,
    description: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
  }

  static defaultProps = {
    brand: '',
    description: '',
    id: 0,
    name: '',
  }

  constructor(props) {
    super(props)

    console.log(props)

    this.state = {}
  }

  // image ratio: 3:4
  render() {
    return (
      <div>
        <div className="productName">
          <Link
            className="categoryLink"
            to={`/product/${encodeURIComponent(this.props.id)}`}
          >
            {this.props.name}
          </Link>
        </div>
        <div className="productBrand">{this.props.brand}</div>
        <div className="productDesc">{this.props.description}</div>
        <br />
      </div>
    )
  }
}

export default ProductCard
