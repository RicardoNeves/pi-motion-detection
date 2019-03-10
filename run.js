const path = require('path');
const MotionDetectionModule = require('./index.js');
const motionDetector = new MotionDetectionModule({
  captureDirectory: path.resolve(__dirname, 'captures'),
  keepMotionImages: false,
  timeout: 10000,
  triggerVideoRecordOnMotion: true,
});
 
motionDetector.on('motion', () => {
  console.log('--- Motion detected ---');
});
 
motionDetector.on('error', (error) => {
  console.log(error);
});
 
motionDetector.watch();

console.log('Ready to detect motion...');

