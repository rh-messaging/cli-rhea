# CLI-RHEA

Rhea testing client is javascript client built on [RHEA](https://www.npmjs.com/package/rhea) amqp library.

[![Build Status](https://travis-ci.org/rh-messaging/cli-rhea.svg?branch=master)](https://travis-ci.org/rh-messaging/cli-rhea)
[![Code Coverage](https://codecov.io/gh/rh-messaging/cli-rhea/branch/master/graph/badge.svg)](https://codecov.io/gh/rh-messaging/cli-rhea)

## Installation

cli-rhea requires [Node.js](https://nodejs.org/) v0.10+ to run. (For using web-executor requires version >=6.4)

Install to global env, if you would like use client as cmd program.

```sh
npm install cli-rhea -g
```

For standart using install to local env.

```sh
npm install cli-rhea
```

## Using

### Using cmd client part

```sh
cli-rhea-sender --broker "username:password@localhost:5672" --address "queue_test" --count 2 --msg-content "text message" --log-msgs dict
cli-rhea-receiver --broker "username:password@localhost:5672" --address "queue_test" --count 2 --log-msgs dict
```

### Using in script or node

```js
var rhea_client = require('cli-rhea');
var opts = rhea_client.Options;
var sender = rhea_client.SenderClient;

opts.broker('username:password@localhost:5672');
opts.address = 'queue_test';
opts.count = 2;
opts.msgContent = 'text message';

sender.Run(opts);
```

### Using in html

1. Install dependencies

    ```sh
    cd <path-of-cli-rhea-npm-package>
    npm install
    npm run-script browserify
    ```

1. Using in html
    ```html
    <!DOCTYPE html>
    <html>
      <head>
        <title>AMQP websockets example</title>
        <meta http-equiv="content-type" content="text/html;charset=utf-8" />
        <script type="text/javascript" src="<path-to-js-generated-by-browserify>/cli-rhea.js"></script>
      </head>

      <body>
        <script type="text/javascript">
          var clients = require('cli-rhea');
          var opts = clients.Options;
          opts.logMsgs = 'interop';
          opts.msgDurable = true;
          opts.msgPriority = 2;
          opts.msgContent = 'Simple test message';
          clients.SenderClient.Run(opts);
        </script>
      </body>
    </html>
    ```

### Using web browser executor

1. Install google chrome
1. Install dependencies

    ```sh
    cd <path-of-cli-rhea-npm-package>
    npm install
    npm run-script browserify
    ```
1. Run web browser executor

    ```sh
    cli-rhea-browser-runner --client-type sender --broker "username:password@localhost:5672" --address "queue_test" --count 2 --msg-content "text message" --log-msgs dict
    cli-rhea-browser-runner --client-type receiver --broker "username:password@localhost:5672" --address "queue_test" --count 2 --log-msgs dict
    ```

## Docker

To build image with CENTOS7 and rhea-nodejs-client use Dockerfile in project lib:

```sh
cd <path-of-cli-rhea-npm-package>
docker build -t cli-rhea-image .
```

Or you can use [image from dockerhub](https://hub.docker.com/r/kornysd/cli-rhea/)

```sh
docker pull kornysd/cli-rhea
```

## License

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
