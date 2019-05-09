// This module is responsible for capturing pictures

'use strict';

const config = require('config');
const fs = require('fs');
const PiCamera = require('pi-camera');
const myCamera = new PiCamera({
  mode: 'photo',
  output: process.argv[2],
  width: config.get('camera.photoWidth'),
  height: config.get('camera.photoHeight'),
  timestamp: true,
  nopreview: true,
});

process.on('message', (messageFromParent) => {
  const newName = `${process.argv[2].split('/').slice(0, -1).join('/')}/${messageFromParent.prefix}${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}.jpg`;
  myCamera.snap()
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
