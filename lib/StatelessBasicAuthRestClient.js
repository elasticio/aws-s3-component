/* eslint-disable no-param-reassign,no-underscore-dangle */
// eslint-disable-next-line max-classes-per-file
const { promisify } = require('util');
const request = promisify(require('requestretry'));
const rawRequest = require('request');
const removeTrailingSlash = require('remove-trailing-slash');
const removeLeadingSlash = require('remove-leading-slash');

const NoAuthRestClient = class NoAuthRestClient {
  constructor(emitter, cfg) {
    this.emitter = emitter;
    this.cfg = cfg;
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  _addAuthenticationToRequestOptions(requestOptions) {}

  async makeRequest(options) {
    const {
      url, method, body, headers = {}, urlIsSegment = true, isJson = true,
    } = options;
    const urlToCall = urlIsSegment
      ? `${removeTrailingSlash(this.cfg.resourceServerUrl.trim())}/${removeLeadingSlash(url.trim())}`
      : url.trim();
    this.emitter.logger.info(`Making ${method} request...`);

    const requestOptions = {
      url: urlToCall,
      method,
      json: isJson,
      body,
      headers,
      maxAttempts: process.env.STEWARD_ATTEMPTS ? process.env.STEWARD_ATTEMPTS : 5,
      retryDelay: process.env.STEWARD_DELAY ? process.env.STEWARD_DELAY : 2500,
      // eslint-disable-next-line no-use-before-define
      retryStrategy: this.onAnyErrorRetryStrategy,
    };

    this._addAuthenticationToRequestOptions(requestOptions);

    const response = await request(requestOptions);

    if (response.statusCode >= 400) {
      throw new Error(`Error in making request to ${urlToCall} Status code: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
    }

    return response.body;
  }

  onAnyErrorRetryStrategy(err, response) {
    const checkResult = err || response.statusCode >= 404;
    this.emitter.logger.error('Client failed on making request!');
    return checkResult;
  }

  // eslint-disable-next-line class-methods-use-this
  getRequest() {
    const self = this;
    let counter = 0;
    return function retryRequest(options, retryCnt, inputStream) {
      if (counter === retryCnt) {
        inputStream.end();
        return;
      }
      self.emitter.logger.info('Client failed making request, attempt: %s', counter);
      const stream = rawRequest(options)
        .on('response', (response) => {
          if ((response.statusCode >= 404 || response.toString().trim()
            === 'File\'s metadata is not found')) {
            counter += 1;
            setTimeout(retryRequest.bind(this), 3000, options, retryCnt, inputStream);
          } else {
            stream.pipe(inputStream);
          }
        })
        // eslint-disable-next-line no-unused-vars
        .on('error', (err) => {
          self.emitter.logger.error('Error on making request');
          counter += 1;
          setTimeout(retryRequest.bind(this), 3000, options, retryCnt, inputStream);
        });
    };
  }
};
module.exports.NoAuthRestClient = NoAuthRestClient;

module.exports.BasicAuthRestClient = class BasicAuthRestClient extends NoAuthRestClient {
  constructor(emitter, cfg, username, password) {
    super(emitter, cfg);
    this.username = username;
    this.password = password;
  }

  _addAuthenticationToRequestOptions(requestOptions) {
    requestOptions.auth = {
      username: this.username,
      password: this.password,
    };
  }
};

module.exports.ApiKeyRestClient = class ApiKeyRestClient extends NoAuthRestClient {
  constructor(emitter, cfg, apiKeyHeaderName, apiKeyHeaderValue) {
    super(emitter, cfg);
    this.apiKeyHeaderName = apiKeyHeaderName;
    this.apiKeyHeaderValue = apiKeyHeaderValue;
  }

  _addAuthenticationToRequestOptions(requestOptions) {
    requestOptions.headers[this.apiKeyHeaderName] = this.apiKeyHeaderValue;
  }
};
