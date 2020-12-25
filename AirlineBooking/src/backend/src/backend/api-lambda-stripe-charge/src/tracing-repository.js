"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AWSXRay = require('aws-xray-sdk-core');
AWSXRay.capturePromise();
// Makes sure that this function is not called again.
// It would wrap the promise prototype multiple times.
AWSXRay.capturePromise = function () { };
function captureAsyncFunc(name, func) {
    return new Promise(function (resolve, reject) {
        AWSXRay.captureAsyncFunc(name, (segment) => {
            func(segment).then((result) => {
                segment.close();
                resolve(result);
            }, (error) => {
                segment.close(error);
                reject(error);
            });
        });
    });
}
exports.captureAsyncFunc = captureAsyncFunc;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2luZy1yZXBvc2l0b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHJhY2luZy1yZXBvc2l0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFN0MsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBO0FBQ3hCLHFEQUFxRDtBQUNyRCxzREFBc0Q7QUFDdEQsT0FBTyxDQUFDLGNBQWMsR0FBRyxjQUFhLENBQUMsQ0FBQTtBQUV2QyxTQUFnQixnQkFBZ0IsQ0FBRSxJQUFZLEVBQUUsSUFBUztJQUN2RCxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsT0FBTyxFQUFFLE1BQU07UUFDMUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLE9BQVksRUFBRSxFQUFFO1lBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQ2hCLENBQUMsTUFBVyxFQUFFLEVBQUU7Z0JBQ2QsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNmLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNqQixDQUFDLEVBQ0QsQ0FBQyxLQUFVLEVBQUUsRUFBRTtnQkFDYixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNwQixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDZixDQUFDLENBQ0YsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDO0FBZkQsNENBZUM7QUFBQSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgQVdTWFJheSA9IHJlcXVpcmUoJ2F3cy14cmF5LXNkay1jb3JlJyk7XG5cbkFXU1hSYXkuY2FwdHVyZVByb21pc2UoKVxuLy8gTWFrZXMgc3VyZSB0aGF0IHRoaXMgZnVuY3Rpb24gaXMgbm90IGNhbGxlZCBhZ2Fpbi5cbi8vIEl0IHdvdWxkIHdyYXAgdGhlIHByb21pc2UgcHJvdG90eXBlIG11bHRpcGxlIHRpbWVzLlxuQVdTWFJheS5jYXB0dXJlUHJvbWlzZSA9IGZ1bmN0aW9uICgpIHt9XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXB0dXJlQXN5bmNGdW5jIChuYW1lOiBzdHJpbmcsIGZ1bmM6IGFueSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIEFXU1hSYXkuY2FwdHVyZUFzeW5jRnVuYyhuYW1lLCAoc2VnbWVudDogYW55KSA9PiB7XG4gICAgICBmdW5jKHNlZ21lbnQpLnRoZW4oXG4gICAgICAgIChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgIHNlZ21lbnQuY2xvc2UoKVxuICAgICAgICAgIHJlc29sdmUocmVzdWx0KVxuICAgICAgICB9LFxuICAgICAgICAoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgIHNlZ21lbnQuY2xvc2UoZXJyb3IpXG4gICAgICAgICAgcmVqZWN0KGVycm9yKVxuICAgICAgICB9XG4gICAgICApXG4gICAgfSlcbiAgfSlcbn07XG4iXX0=