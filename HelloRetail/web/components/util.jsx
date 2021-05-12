import config from "../config";
import https from "https";
const AWS = require('aws-sdk');

//  makeApiRequest(config.EventWriterApi, 'POST', '/event-writer/', {
//       schema: 'com.nordstrom/user-info/update-phone/1-0-0',
//       id: id,
//       phone: phoneNumber,
//       origin: `hello-retail/web-client-create-product/dummy_id/dummy_name`,
//  })
exports.makeApiRequest = (api, verb, path, data) => {
  return new Promise((resolve, reject) => {
    // https://{restapi_id}.execute-api.{region}.amazonaws.com/{stage_name}/
    const apiPath = `/${config.Stage}${path}`
    const body = JSON.stringify(data)
    const hostname = `${api}.execute-api.${config.AWSRegion}.amazonaws.com`
    const endpoint = new AWS.Endpoint(hostname)
    const request = new AWS.HttpRequest(endpoint)

    request.method = verb
    request.path = apiPath
    request.region = config.AWSRegion
    request.host = endpoint.host
    request.body = body
    request.headers.Host = endpoint.host
    // request.headers['Access-Control-Allow-Origin'] = '*'

    const postRequest = https.request(request, (response) => {
      let result = ''
      response.on('data', (d) => {
        result += d
      })
      response.on('end', () => resolve(result))
      response.on('error', error => reject(error))
    })

    postRequest.write(body)
    postRequest.end()
  })
}
