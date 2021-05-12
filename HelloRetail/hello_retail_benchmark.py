import base64
import logging
import os
import random
import re
import time

import requests

BENCHMARK_CONFIG = """
event_processing:
  description: Hello Retail Benchmark for AWS.
  provider: aws
  region: us-east-1
  stage: prod
  team: simont
  company: uniwue
"""


# API calls, ew=event-writer, pr=product-receive, pc=product-catalog

def registerPhotographer(ew_url, pg_id, phone_number):
  data = {
    'schema': 'com.nordstrom/user-info/update-phone/1-0-0',
    'id': pg_id,
    'phone': phone_number,  # random 10-digit number
    'origin': 'hello-retail/sb-register-photographer/dummy_id/dummy_name',
  }
  resp = requests.post(url=ew_url + "/event-writer", json=data)
  if resp.status_code == 200:
    return resp
  else:
    raise Exception(f"Error code {resp.status_code}: {resp.content}")


def newProduct(ew_url, prod_id, prod_category, prod_name, prod_brand, prod_desc):
  data = {
    'schema': 'com.nordstrom/product/create/1-0-0',
    'id': prod_id,  # (`0000000${Math.floor(Math.abs(Math.random() * 10000000))}`).substr(-7) --> random 7-digit number
    'origin': 'hello-retail/sb-create-product/dummy_id/dummy_name',
    'category': prod_category.strip(),
    'name': prod_name.strip(),
    'brand': prod_brand.strip(),
    'description': prod_desc.strip(),
  }
  resp = requests.post(url=ew_url + "/event-writer", json=data)
  if resp.status_code == 200:
    return resp
  else:
    raise Exception(f"Error code {resp.status_code}: {resp.content}")


def listCategories(pc_url):
  resp = requests.get(url=pc_url + "/categories")
  if resp.status_code == 200:
    return resp.json()
  else:
    raise Exception(f"Error code {resp.status_code}: {resp.content}")


def listProductsByCategory(pc_url, category):
  resp = requests.get(url=pc_url + f"/products?category={category}")  # category needs to be URI encoded!
  if resp.status_code == 200:
    return resp.json()
  else:
    raise Exception(f"Error code {resp.status_code}: {resp.content}")


def listProductsByID(pc_url, product_id):
  resp = requests.get(url=pc_url + f"/products?id={product_id}")
  if resp.status_code == 200:
    return resp.json()
  else:
    raise Exception(f"Error code {resp.status_code}: {resp.content}")


def commitPhoto(pr_url, pg_id, phone_number, item_id, image):
  data = {
    'photographer': {
      'id': pg_id,
      'phone': phone_number
    },
    'For': item_id,
    'Media': image  # base64 encoded file
  }
  resp = requests.post(url=pr_url + "/sms", json=data)
  if resp.status_code == 200:
    return resp
  else:
    raise Exception(f"Error code {resp.status_code}: {resp.content}")


# Util

def encodeImage(filepath):
  image = open(filepath, 'rb')  # open binary file in read mode
  image_64_encode = base64.b64encode(image.read())
  image.close()
  return image_64_encode.decode()


# SB calls

def prepare(spec):
  if not os.path.exists(os.path.dirname(__file__) + "/node_modules"):           # if no dependencies are installed, install dependencies
    spec.run(f"./install.sh {spec['region']} {spec['stage']} {spec['company']} {spec['team']}", image='serverless_cli')

  log = spec.run(f"./deploy.sh {spec['region']} {spec['stage']} {spec['company']} {spec['team']} 1024", image='serverless_cli')

  urls = re.findall(r" [-] https://[-\w.]+execute-api[-\w.]+/\w+/[\w-]+", log)
  for url in urls:
    m = re.match(r" - (https://[-\w.]+/\w+)/event-writer", url)
    if m:
      spec['endpoint_event_writer_api'] = m.group(1)
    else:
      m = re.match(r" - (https://[-\w.]+/\w+)/categories", url)
      if m:
        spec['endpoint_product_catalog_api'] = m.group(1)
      else:
        m = re.match(r" - (https://[-\w.]+/\w+)/sms", url)
        if m:
          spec['endpoint_photo_receive_api'] = m.group(1)

  logging.info(f"endpoint event writer={spec['endpoint_event_writer_api']}")
  logging.info(f"endpoint product catalog={spec['endpoint_product_catalog_api']}")
  logging.info(f"endpoint photo receive={spec['endpoint_photo_receive_api']}")


def invokeAPI(response):
  logging.info(f"{response}")
  time.sleep(1)


def invoke(spec):
  photo_id = f"{random.randint(1000000000, 9999999999)}"
  id = f"{random.randint(1000000, 9999999)}"
  cat = f"category-{random.randint(1, 6)}"
  invokeAPI(registerPhotographer(spec['endpoint_event_writer_api'], f"photographer-{photo_id}", photo_id))
  invokeAPI(newProduct(spec['endpoint_event_writer_api'], id, cat, f"name{id}", f"brand-{id}", f"description-{id}"))
  invokeAPI(listCategories(spec['endpoint_product_catalog_api']))
  invokeAPI(listProductsByCategory(spec['endpoint_product_catalog_api'], cat))
  invokeAPI(listProductsByID(spec['endpoint_product_catalog_api'], id))
  invokeAPI(commitPhoto(spec['endpoint_photo_receive_api'], f"photographer-{photo_id}", photo_id, id, encodeImage(f"{os.path.dirname(__file__)}/benchmark_images/snowdrop.jpg")))


def cleanup(spec):
  spec.run(f"./remove.sh {spec['region']} {spec['stage']} {spec['company']} {spec['team']}", image='serverless_cli')
