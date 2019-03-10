'use strict';

const config = require('config');
const PiCamera = require('pi-camera');
const myCamera = new PiCamera({
  mode: 'photo',
  output: process.argv[2],
  width: config.get('camera.photoWidth'),
  height: config.get('camera.photoHeight'),
  timeout: config.get('camera.photoTimeout'),
  timestamp: true,
  nopreview: true,
});

process.on('message', (messageFromParent) => {
  console.log('About to take picture...');
  myCamera.snap()
    .then((message) => {
      // console.log('Picture taken successfully...')
      process.send({
        result: 'success',
        message,
        error: null,
      });
    })
    .catch((error) => {
      process.send({
        result: 'failure',
        message: null,
        error,
      });
    });
});
