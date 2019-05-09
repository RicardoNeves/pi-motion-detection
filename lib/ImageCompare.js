'use strict';

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

process.on('message', (messageFromParent) => {
  const files = getMostRecentFileNames(process.argv[2]);

  if (files.length !== 2) {
    process.send({
      error: new Error('Not enough files for comparison.'),
      result: 'failure',
    });

    return;
  }

  Jimp.read(path.resolve(process.argv[2], files[0]), (error, controlFile) => {
    if (error) {
      process.send({
        error: new Error('Failed to read file.'),
        result: 'failure',
      });

      return;
    }

    Jimp.read(path.resolve(process.argv[2], files[1]), (error, compareFile) => {
      if (error) {
        process.send({
          error: new Error('Failed to read file.'),
          result: 'failure',
        });
  
        return;
      }

      // const diff = Jimp.diff(controlFile, compareFile, self.COMPARE_THRESHOLD);
      // const motionDetected = diff.percent > self.COMPARE_PERCENT_DIFF;
      const diff = Jimp.diff(controlFile, compareFile, 0.1);
      const motionDetected = diff.percent > 0.001;

      process.send({
        data: {
          control: files[0],
          compare: files[1],
          diff: diff,
          motion: motionDetected,
        },
        result: 'success',
      });
    });
  }); 
});

// Return only base file name without dir
function getMostRecentFileNames(dir) {
  const files = fs.readdirSync(dir).filter((filename) => filename[0] === '_' && filename.length > 5 && filename.substr(filename.length - 3) === 'jpg');

  if (files.length < 2) {
    return [];
  }

  return files.slice(Math.max(files.length - 2, 1));
}

// class ImageCompare extends EventEmitter {
//   constructor(capturesDir) {
//     super();
//     this.capturesDir = capturesDir;
//     this.controlFileName = null;
//     this.compareFileName = null;
//     this.COMPARE_THRESHOLD = 0.1;
//     this.COMPARE_PERCENT_DIFF = 0.001;
//   }

//   compare() {
//     files = fs.readdirSync(dir);
//   }
// }

// module.exports = ImageCompare;
