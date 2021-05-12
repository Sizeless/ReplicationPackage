import React, { Component, PropTypes } from 'react'
import CategoryItem from './category-item'

class CategoryList extends Component {
  static propTypes = {
    categories: PropTypes.arrayOf(React.PropTypes.object),
  }

  static defaultProps = {
    categories: [],
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  render() {
    if (!this.props.categories) {
      return null
    }

    return (
      <div>
        {
          this.props.categories.map(cat => (
            <CategoryItem className="categoryItem" categoryName={cat.name} key={cat.name} />
          ))
        }
      </div>
    )
  }
}

export default CategoryList
