const path = require('path');
const MotionDetectionModule = require('./index.js');
const motionDetector = new MotionDetectionModule({
  captureDirectory: path.resolve(__dirname, 'captures'),
  keepMotionImages: false,
  motionCheckInterval: 30000,
  triggerVideoRecordOnMotion: true,
});
 
motionDetector.on('motion', () => {
  console.log(`--- Motion detected at ${(new Date()).toLocaleTimeString()} ---`);
});
 
motionDetector.on('error', (error) => {
  console.log(error);
});
 
motionDetector.watch();

