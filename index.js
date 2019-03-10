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
      timeout: 5000,
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
        // console.log('Picture Taken!');
        this.capturingPhoto = false;
        // console.log('Captured photo');
        // if (self.continueToCapture) {
        //   self.capturingPhoto = true;
        // }
      }
      // else {
      //   // console.log(`Message from imageCaptureChild: ${ message }`);
      // }
    });

    imageCompare.on('motion', () => {
      // self.capturingPhoto = false;
      // self.continueToCapture = false;
      if (this.config.triggerVideoRecordOnMotion) {
        this.recordQueue.push('video');
        checkInterval.bind(this)();
      }

      self.emit('motion');

      // if (self.config.captureVideoOnMotion) {
      //   if (self.capturingPhoto) {
      //     self.emit('error', 'Hit possible race condition, not capturing video at this time.');
      //   }
      //   else {
      //     // console.log('It should be safe to capture video');
      //     videoCaptureChild.send({});
      //   }
      // }
    });
    imageCompare.on('error', (error) => {
      self.emit('error', error);
    });

    videoCaptureChild.on('message', (message) => {
      if (message.result === 'failure') {
        self.emit('error', `Video capture failed: ${message.error}`);
      }
      else if (message.result === 'success') {
        console.log('Video record success!');

        if (this.runCheckWhenCameraReady) {
          this.checkInterval();
        }

        this.capturingPhoto = false;
      //   self.continueToCapture = true;
      //   imageCaptureChild.send({});
      // }
      // else {
      //   // console.log(`Message from videoCaptureChild: ${ message }`);
      }
    });

    videoRenameChild.on('message', (message) => {
      if (message.result === 'failure') {
        self.emit('error', message.error);
      }
      else if (message.result === 'success') {
        // I don't think this ever gets hit...
      }
      else {
        // console.log(`Message from videoCaptureChild: ${ message }`);
      }
    });

    // Start the magic
    
    // self.capturingPhoto = true;
    // imageCaptureChild.send({});
    setInterval(checkInterval.bind(this), this.config.timeout);
    // setTimeout(check.bind(this), 5000);
  }
}

function checkInterval() {
  console.log('Check underway...');
  if (!this.capturingPhoto && this.recordQueue.length) {
    const action = this.recordQueue.pop();

    if (this.action === 'video') {
      console.log(`Will run ${action} record...`);
      this.capturingPhoto = true;
      this.videoCaptureChild.send({})
    }

    return;
  }
  // Not capturing
  if (this.capturingPhoto || this.runCheckWhenCameraReady) {
    console.log('Camera in use. Will run when camera ready...');
    return;
  }

  // Nothing to do
  // Let's take a picture to trigger image comparison?
  //if (this.queue.length === 0) {
    // console.log('Requesting to take a picture');
    this.capturingPhoto = true;
    this.imageCaptureChild.send({});

    return;
  //}


  // setTimeout(this.check, 5000);
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
