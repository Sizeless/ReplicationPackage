import { Component, PropTypes } from 'react'
import config from '../../config'
import * as util from '../util'

class CategoryDataSource extends Component {
  static propTypes = {
    categoriesLoaded: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.getCategoriesAsync = this.getCategoriesAsync.bind(this)
    this.getCategoriesFromApiAsync = this.getCategoriesFromApiAsync.bind(this)
    this.componentDidMount = this.componentDidMount.bind(this)
  }

  componentDidMount() {
    this.getCategoriesAsync()
      .then(this.props.categoriesLoaded)
  }

  getCategoriesFromApiAsync() {
    return util.makeApiRequest(config.ProductCatalogApi, 'GET', '/categories', {})
  }

  getCategoriesAsync() {
    return this.getCategoriesFromApiAsync()
      .then((data) => {
        const categoriesList = []
        JSON.parse(data).forEach((item) => {  //TODO evtl rework
          categoriesList.push({
            name: item.category,
          })
        })
        return categoriesList
      })
  }

  render() {
    return null
  }
}

export default CategoryDataSource
