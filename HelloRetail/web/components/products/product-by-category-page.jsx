import React, { Component, PropTypes } from 'react'
import ProductList from './product-list'
import ProductDataSource from './product-data-source'

// TODO: Further decompose using HOC https://facebook.github.io/react/docs/higher-order-components.html

class ProductCategoryPage extends Component {
  static propTypes = {
    params: PropTypes.shape({
      category: PropTypes.string.isRequired,
    }).isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {
      category: decodeURIComponent(props.params.category),
    }
    this.productsLoaded = this.productsLoaded.bind(this)
  }

  productsLoaded(products) {
    this.setState({
      productsList: products,
    })
  }

  render() {
    return (
      <div>
        <h3>{this.state.category}</h3>
        <ProductList products={this.state.productsList} category={this.state.category} />
        <ProductDataSource category={this.state.category} productsLoaded={this.productsLoaded} />
      </div>
    )
  }
}

export default ProductCategoryPage
