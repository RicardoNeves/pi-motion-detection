// This module is responsible for renaming captured video with a timestamp value

'use strict';

const fs = require('fs');
const path = require('path');
const videosDir = process.argv[2];
const DEFAULT_FILENAME = 'video.h264';
const pathToFile = path.resolve(videosDir, DEFAULT_FILENAME);

fs.watch(videosDir, (event, filename) => {
  if (filename.indexOf(DEFAULT_FILENAME) > -1 && filename.indexOf('~') === -1) {
    fs.access(pathToFile, fs.constants.R_OK, (error) => {
      const exists = error ? false : true;

      if (exists) {
        const today = new Date();
        const newFilename = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()} ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`
        const pathNewFile = path.resolve(videosDir, `${ newFilename }.h264`);

        fs.rename(pathToFile, pathNewFile, (error) => {
          if (error) {
            process.send({
              result: 'failure',
              message: null,
              error,
            });
          }
          else {
            process.send({
              result: 'success',
              message: 'File renamed',
              error: null,
            });
          }
        });
      }
    });
  }
});
