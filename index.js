'use strict';

const EventEmitter = require('events');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

let instance = null;

class MotionDetectionModule extends EventEmitter {
  constructor(options) {
    super();
    this.config = Object.assign({
      captureDirectory: null,
      motionCheckInterval: 30000,
    }, options);
    this.lastCheckTimestamp = +new Date();
    this.subscribed = false;
    
    this.imageCaptureChild = fork(path.resolve(__dirname, 'lib', 'ImageCapture.js'), [ path.resolve(this.config.captureDirectory, 'images', 'image.jpg') ]);
    this.videoCaptureChild = fork(path.resolve(__dirname, 'lib', 'VideoCapture.js'), [ path.resolve(this.config.captureDirectory, 'videos', 'video.h264') ]);
    this.imageCompareChild = fork(path.resolve(__dirname, 'lib', 'ImageCompare.js'), [ path.resolve(this.config.captureDirectory, 'images') ]);

    captureDirsCheck(this.config.captureDirectory);
    emptyImagesDir(path.resolve(this.config.captureDirectory, 'images'));
  }

  async check() {
    await this.takePicture(true);
    const motionDetected = await this.compare();
    
    if (motionDetected) {
      await this.takePicture(false);
      await this.recordVideo();
    }
    
    const timeSinceLastCheck = (+new Date()) - this.lastCheckTimestamp;
  
    if (timeSinceLastCheck > this.config.motionCheckInterval) {
      setTimeout(this.check.bind(this), 0);
    } else {
      setTimeout(this.check.bind(this), this.config.motionCheckInterval - timeSinceLastCheck);
    }
  }
  
  async compare() {
    return new Promise((resolve, reject) => {
      this.imageCompareChild.once('message', (message) => {
        console.log(message);
        if (message.result !== 'success') {
          resolve(false);

          return;
        }

        resolve(message.data.motion);
      });
      this.imageCompareChild.send({});
    });
  }

  async recordVideo() {
    return new Promise((resolve, reject) => {
      this.videoCaptureChild.once('message', (message) => {
        resolve(message);
      });
      this.videoCaptureChild.send({});
    });
  }
  
  async takePicture(isComparison) {
    return new Promise((resolve, reject) => {
      this.imageCaptureChild.once('message', (message) => {
        resolve(message);
      });
      this.imageCaptureChild.send({prefix: isComparison ? '_': ''});
    });
  }

  async subscribe() {
    if (this.subscribed) {
      throw new Error('MotionDetectionModule was already subscribed.');
    }
    
    this.lastCheckTimestamp = +new Date();
    this.subscribed = true;
    await this.takePicture(true);
    setTimeout(this.check.bind(this), this.config.motionCheckInterval);
  }
}

function emptyImagesDir(imagesDir) {
  const files = fs.readdirSync(imagesDir);

  files.forEach((file) => {
    fs.unlink(path.resolve(imagesDir, file), (error) => {
      if (error) {
        throw error;
      }
    });
  });
}

function captureDirsCheck(base) {
  if (!base) {
    throw new Error(`'captureDirectory' can't be null`);
  }
  
  const dirsToCheck = [ base, path.resolve(base, 'images'), path.resolve(base, 'videos') ];
  
  dirsToCheck.forEach((dir) => {
    try {
      fs.accessSync(dir);
    }
    catch (e) {
      // Doesn't exist, create it
      fs.mkdirSync(dir);
    }
  });
}

function getInstance(options) {
  if (instance) {
    throw new Error('Trying to get more than one instance of MotionDetectionModule.');
  }

  instance = new MotionDetectionModule(options);

  return instance;
}

module.exports = {getInstance};
