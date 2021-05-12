import {Component, PropTypes} from 'react'
import config from '../../config'
import * as util from '../util'

const https = require('https');

class ProductDataSource extends Component {
  static propTypes = {
    category: PropTypes.string,
    productId: PropTypes.string,
    productsLoaded: PropTypes.func.isRequired,
  }

  static defaultProps = {
    category: null,
    productId: null,
  }

  constructor(props) {
    super(props)
    this.state = {}
    this.getProductsByCategoryAsync.bind(this)
    this.getProductsByCategoryFromApiAsync.bind(this)
    this.componentDidMount = this.componentDidMount.bind(this)
  }

  componentDidMount() {
    if (this.props.category) {
      return this.getProductsByCategoryAsync(this.props.category)
        .then(this.props.productsLoaded)
    } else if (this.props.productId) {
      return this.getProductsByIdAsync(this.props.productId)
        .then(this.props.productsLoaded)
    } else {
      return Promise.reject(new Error('either category or productId required'))
    }
  }

  getProductByIdFromApiAsync(id) {
    return util.makeApiRequest(config.ProductCatalogApi, 'GET', `/products?id=${encodeURIComponent(id)}`, {})
  }

  getProductsByIdAsync(id) {
    return Promise.all([this.getProductByIdFromApiAsync(id), new Promise((resolve, reject) => {
      https.get(`https://${config.ImageBucket}.s3.amazonaws.com/i/p/${id}`, (res) => {
        var { statusCode } = res;
        let error;
        if (statusCode !== 200) {
          error = new Error('Request Failed.\n' +
            `Status Code: ${statusCode}`);
        }
        if (error) {
          console.error(error.message);
          // consume response data to free up memory
          res.resume();
        }
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            resolve(rawData);
          } catch (e) {
            resolve(null);
          }
        });
      }).on('error', (e) => {
        resolve(null)
      })})])
      .then((results) => {
        const image = results[1]
        const data = results[0]
        const productList = []
        const pdata = JSON.parse(data)
        productList.push({
          brand: pdata[0].brand,
          description: pdata[0].description,
          name: pdata[0].name,
          id: pdata[0].id,
          image: image ? `data:image/jpeg;base64,${image}` : null,
        })
        return productList
      })
  }

  getProductsByCategoryFromApiAsync(category) {
    return util.makeApiRequest(config.ProductCatalogApi, 'GET', `/products?category=${encodeURIComponent(category)}`, {})
  }

  getProductsByCategoryAsync(category) {
    return this.getProductsByCategoryFromApiAsync(category)
      .then((data) => {
        const productList = []
        JSON.parse(data).forEach((item) => {
          productList.push({
            brand: item.brand,
            description: item.description,
            name: item.name,
            id: item.id,
          })
        })
        return productList
      })
  }

  render() {
    return null
  }
}

export default ProductDataSource
