import React, { Component, PropTypes } from 'react'
import { browserHistory } from 'react-router'
import ProductDataSource from './product-data-source'
import ValidationErrors from '../validation-errors'

class ProductDetailPage extends Component {
  static propTypes = {
    params: PropTypes.shape({
      id: PropTypes.string.isRequired,
    }).isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {}
    this.productsLoaded = this.productsLoaded.bind(this)
    this.state.errors = []
    this.state.buyMessage = null
    this.state.addMessage = null
  }

  productsLoaded(products) {
    const p = products[0]
    this.setState({
      name: p.name,
      brand: p.brand,
      description: p.description,
      id: p.id,
      image: p.image,
    })
  }

  render() {
    let blurb = null
    if (!this.state.addMessage) {
      blurb = <h4>No Add Message</h4>
    } else {
      blurb = <h4>{this.state.addMessage}</h4>
    }

    const backButtonStyle = {
      margin: '15px',
    }

    console.log(this.state)
    return (
      <div>
        <div>
          <h3>{this.state.brand}</h3>
          <h4>{this.state.name}</h4>
          <div>{this.state.description}</div>
          <div>
            { this.state.image ? (<img className="productImage" src={this.state.image} alt={this.state.name} />) : null }
          </div>
          <br />
          <ValidationErrors errors={this.state.errors} />
          {blurb}
          <ProductDataSource productId={this.props.params.id} productsLoaded={this.productsLoaded} />
          <button style={backButtonStyle} onClick={browserHistory.goBack}>Back to List</button>
        </div>
      </div>
    )
  }
}

export default ProductDetailPage
