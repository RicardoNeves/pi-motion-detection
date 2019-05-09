// This module is responsible for capturing videos

'use strict';

const config = require('config');
const fs = require('fs');
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
  const newName = `${process.argv[2].split('/').slice(0, -1).join('/')}/${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}.h264`;

  myCamera.record()
    .then((data) => {
      fs.rename(process.argv[2], newName, (error) => {
        if (error) {
          process.send({
            error,
            result: 'failure',
          });
        } else {
          process.send({
            data,
            error: null,
            filename: newName,
            result: 'success',
          });
        }
      });
    })
    .catch((error) => {
      process.send({
        error,
        message: null,
        result: 'failure',
      });
    });
});
