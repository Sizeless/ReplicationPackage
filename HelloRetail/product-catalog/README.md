# Product Catalog

This project defines the product catalog builder and API.

## Builder

By listening to all events that describe new products and add that new information about products to the catalog table, it can create a catalog of all the products that have been offered and our latest best information about those products.

To begin, the product catalog lambda processes the create product event.  As it expands, we expect to handle events describing the addition of product images to the system.

Example product/create message:
```
{
  "schema" : "com.nordstrom/product/create/1-0-0",
  "id" : "4468125",
  "brand" : "1.STATE",
  "name" : "1.STATE Fringe Skirt",
  "description" : "PAGE:/s/1-state-fringe-skirt/4468125"
  "category": "A_CATEGORY"
}
```

Example image/create message:
```
{
  "schema" : "com.nordstrom/image/create/1-0-0",
  "subjectId" : "product/4468125",
  "image" : "s3://..."
}
```

## API

The API for the Product Catalog is a RESTful API offered via ApiGateway.  There are two resources upon which a GET can be performed:
```
/categories
/products?category=<a-category>
```
