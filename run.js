const path = require('path');
const MotionDetectionModule = require('./index.js');

const motionDetector = MotionDetectionModule.getInstance({
  captureDirectory: path.resolve(__dirname, 'captures'),
  keepMotionImages: false,
  motionCheckInterval: 30000,
  triggerVideoRecordOnMotion: true,
  triggerPhotoRecordOnMotion: true,
});

motionDetector.subscribe();

