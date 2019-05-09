'use strict';

const EventEmitter = require('events');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const ImageCompare = require('./lib/ImageCompare');

class MotionDetectionModule extends EventEmitter {
  constructor(options) {
    super();
    this.config = Object.assign({
      captureDirectory: null, // Directory to store tmp photos and video captures
      // continueAfterMotion: false, // Flag to control if motion detection will continue after detection
      triggerVideoRecordOnMotion: false, // Flag to control video capture on motion detection
      motionCheckInterval: 30000,
    }, options);

    // this.continueToCapture = true; // Flag to control internal state of photo capture
    this.capturingPhoto = false; // State of the module capturing photos
    this.runCheckWhenCameraReady = false;
    this.recordQueue = [];

    // Verify and create (if needed) capture directories
    captureDirsCheck(this.config.captureDirectory);
    emptyImagesDir(path.resolve(this.config.captureDirectory, 'images'));
  }

  watch() {
    const self = this;
    const imageCaptureChild = fork(path.resolve(__dirname, 'lib', 'ImageCapture.js'), [ path.resolve(self.config.captureDirectory, 'images', '%d.jpg') ]);
    const videoCaptureChild = fork(path.resolve(__dirname, 'lib', 'VideoCapture.js'), [ path.resolve(self.config.captureDirectory, 'videos', 'video.h264') ]);
    const videoRenameChild = fork(path.resolve(__dirname, 'lib', 'VideoRename.js'), [ path.resolve(self.config.captureDirectory, 'videos') ]);
    const imageCompare = new ImageCompare(path.resolve(self.config.captureDirectory, 'images'));

    this.imageCaptureChild = imageCaptureChild;
    this.videoCaptureChild = videoCaptureChild;

    imageCompare.start();

    imageCaptureChild.on('message', (message) => {
      if (message.result === 'failure') {
        self.emit('error', `Image capture failed: ${message.error}`);
      } else if (message.result === 'success') {
        console.log(`> Finished taking picture. Setting capture to false.`);
        this.capturingPhoto = false;

        if (this.runCheckWhenCameraReady) {
          checkInterval.bind(this)();
        }        
      }
    });

    imageCompare.on('motion', () => {
      if (this.config.triggerVideoRecordOnMotion && this.recordQueue.indexOf('video') === -1) {
        this.recordQueue.push('video');
      }

      // @todo: push image

      
      self.emit('motion');
      onMotionCheck.bind(this)();      
    });
    imageCompare.on('error', (error) => {
      self.emit('error', error);
    });

    videoCaptureChild.on('message', (message) => {
      if (message.result === 'failure') {
        self.emit('error', `Video capture failed: ${message.error}`);
      }
      else if (message.result === 'success') {
        console.log(`> Finished taking video. Setting capture to false.`);
        this.capturingPhoto = false;

        if (this.runCheckWhenCameraReady) {
          checkInterval.bind(this)();
        }
      }
    });

    videoRenameChild.on('message', (message) => {
      if (message.result === 'failure') {
        self.emit('error', message.error);
      }
    });

    // Start the magic
    checkInterval.bind(this)(false);
  }
}

function checkInterval(isCallbackCall = true) {
  // console.log(`Check underway at ${(new Date()).toLocaleTimeString()}...`);
  // if called during cam use then update callback otherwise clean it.
  // if cam in use ends
  if (this.capturingPhoto || this.recordQueue.length) {
    this.runCheckWhenCameraReady = true;
    return;
  } else {
    this.runCheckWhenCameraReady = false;
  }

  // Force picture to check motion only if no queue items
  if (this.recordQueue.length === 0) {  
    this.capturingPhoto = true;
    this.imageCaptureChild.send({});
  }
  // Make sure to call check with timeout
  setTimeout(checkInterval.bind(this, false), this.config.motionCheckInterval);

  return;
}

function onMotionCheck() {
  if (!this.capturingPhoto && this.recordQueue.length > 0) {
    const action = this.recordQueue.pop();

    if (action === 'video') {
      console.log(`> Running ${action} record ...`);
      this.capturingPhoto = true;
      this.videoCaptureChild.send({})
    }

    return;
  } else {
    console.log(`> Will not record because capturingPhoto=${this.capturingPhoto} && RecordQueue Length=${this.recordQueue.length}`);
  }
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

module.exports = MotionDetectionModule;
