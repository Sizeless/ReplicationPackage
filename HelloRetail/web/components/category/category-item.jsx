import React, { Component, PropTypes } from 'react'
import { Link } from 'react-router'

class CategoryItem extends Component {
  static propTypes = {
    categoryName: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props)
    this.state = {}
  }

  render() {
    return (
      <div>
        <Link
          className="categoryLink"
          to={`/category/${encodeURIComponent(this.props.categoryName)}`}
        >
          {this.props.categoryName}
        </Link>
      </div>
    )
  }
}

export default CategoryItem
