// This module is responsible for capturing videos

'use strict';

const config = require('config');
const PiCamera = require('pi-camera');
const myCamera = new PiCamera({
  mode: 'video',
  output: process.argv[2],
  width: config.get('camera.videoWidth'),
  height: config.get('camera.videoHeight'),
  timeout: config.get('camera.videoLength'),
  nopreview: true,
});

process.on('message', (messageFromParent) => {
  myCamera.record()
    .then((message) => {
      process.send('Video capture was successful');

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
