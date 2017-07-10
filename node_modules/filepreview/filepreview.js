/*

 filepreview : A file preview generator for node.js

 */

var child_process = require('child_process');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var os = require('os');
var download = require('download-file')
var ffmpeg = require('ffmpeg');
var moment = require('moment');
var mime = require('mime');

module.exports = {
  generate: function(input_original, output, options, callback) {
    // Normalize arguments

    var input = input_original;

    if (typeof options === 'function') {
      callback = options;
      options = {};
    } else {
      options = options || {};
    }

    // Check for supported output format
    var extOutput = path.extname(output).toLowerCase().replace('.','');
    var extInput = path.extname(input).toLowerCase().replace('.','');

    if (
        extOutput != 'gif' &&
        extOutput != 'jpg' &&
        extOutput != 'png'
    ) {
      return callback(true);
    }

    if (input_original.indexOf("http://") == 0 || input_original.indexOf("https://") == 0) {
      var url = input.split("/");
      var url_filename = url[url.length - 1];
      var hash = crypto.createHash('sha512');
      hash.update(Math.random().toString());
      hash = hash.digest('hex');
      var temp_input = path.join(os.tmpdir(), hash + url_filename);
      curlArgs = ['--silent', '-L', input, '-o', temp_input];
      child_process.execFileSync("curl", curlArgs);
      input = temp_input;
    }

    var fileType = 'other';

    var mimeType = mime.lookup(input);
    if ( mimeType.split('/')[0] == 'image' ) {
      fileType = 'image';
    } else if ( mimeType.split('/')[0] == 'video' ) {
      fileType = 'video';
    } else {
      fileType = 'other';
    }

    var imageArr = ['pdf', 'raw', 'cr2', 'dng', 'arw'];

    if( imageArr.indexOf(extInput) !== -1)
    {
      fileType = 'image'
    }

    fs.lstat(input, function(error, stats) {
      if (error) return callback(error);
      if (!stats.isFile()) {
        return callback(true);
      } else {
        if ( fileType == 'video' ) {
          var seconds = 0;
          var fps = 0;
          try {
            var process = new ffmpeg(input);
            process.then(function (video) {
              // Video metadata
              seconds = video.metadata.duration.seconds;
              fps = video.metadata.video.fps;
              // FFmpeg configuration
              var frame = 100;
              if(options.frame)
              {
                frame = options.frame;
              }
              var second = frame/fps;
              if(second > seconds)
              {
                second = seconds/2;
              }
              var selection = moment().startOf('day')
                  .millisecond(second*1000)
                  .format('HH:mm:ss.SSS');
              var ffmpegArgs = ['-y', '-i', input, '-vf', 'thumbnail', '-frames:v', '1', '-ss', selection, output];
              if (options.width > 0 && options.height > 0) {
                ffmpegArgs.splice(4, 1, 'thumbnail,scale=' + options.width + ':' + options.height + ':force_original_aspect_ratio=decrease' );
              }
              child_process.execFile('ffmpeg', ffmpegArgs, function(error) {
                if(options.delete) {
                  fs.unlinkSync(input);
                }

                if (error) return callback(error);
                return callback();
              });
            }, function (err) {
              console.log('Error: ' + err);
            });
          } catch (e) {
            console.log(e.code);
            console.log(e.msg);
          }
        }

        if ( fileType == 'image' ) {
          var convertArgs = [input + '[0]', output];
          if (options.width > 0 && options.height > 0) {
            convertArgs.splice(0, 0, '-resize', options.width + 'x' + options.height);
          }
          if (options.quality) {
            convertArgs.splice(0, 0, '-quality', options.quality);
          }
          if (options.colorspace)
          {
            convertArgs.splice(0, 0, '-colorspace', options.colorspace)
          }
          if (options.background)
          {
            convertArgs.splice(0, 0, '-background', options.background);
          }
          if (options.alpha)
          {
            convertArgs.splice(0, 0, '-alpha', options.alpha);
          }
          child_process.execFile('convert', convertArgs, function(error) {
            if(options.delete) {
              fs.unlinkSync(input);
            }
            if (error) return callback(error);
            return callback();
          });
        }

        if ( fileType == 'other' ) {
          var hash = crypto.createHash('sha512');
          hash.update(Math.random().toString());
          hash = hash.digest('hex');

          var tempPDF = path.join(os.tmpdir(), hash + '.pdf');

          child_process.execFile('unoconv', ['-e', 'PageRange=1', '-o', tempPDF, input], function(error) {
            if (error) return callback(error);
            var convertArgs = [tempPDF + '[0]', output];
            if (options.width > 0 && options.height > 0) {
              convertArgs.splice(0, 0, '-resize', options.width + 'x' + options.height);
            }
            if (options.quality) {
              convertArgs.splice(0, 0, '-quality', options.quality);
            }
            if (options.colorspace)
            {
              convertArgs.splice(0, 0, '-colorspace', options.colorspace)
            }
            if (options.background)
            {
              convertArgs.splice(0, 0, '-background', options.background);
            }
            if (options.alpha)
            {
              convertArgs.splice(0, 0, '-alpha', options.alpha);
            }
            child_process.execFile('convert', convertArgs, function(error) {
              if (error) return callback(error);
              fs.unlink(tempPDF, function(error) {
                if(options.delete) {
                  fs.unlinkSync(input);
                }
                if (error) return callback(error);
                return callback();
              });
            });
          });
        }
      }
    });
  },

  generateSync: function(input_original, output, options) {

    options = options || {};

    var input = input_original;

    // Check for supported output format
    var extOutput = path.extname(output).toLowerCase().replace('.','');
    var extInput = path.extname(input).toLowerCase().replace('.','');

    if (
        extOutput != 'gif' &&
        extOutput != 'jpg' &&
        extOutput != 'png'
    ) {
      return false;
    }


    var fileType = 'other';

    var mimeType = mime.lookup(input);
    if ( mimeType.split('/')[0] == 'image' ) {
      fileType = 'image';
    } else if ( mimeType.split('/')[0] == 'video' ) {
      fileType = 'video';
    } else {
      fileType = 'other';
    }

    var imageArr = ['pdf', 'raw', 'cr2', 'dng', 'arw'];

    if( imageArr.indexOf(extInput) !== -1)
    {
      fileType = 'image'
    }

    if (input_original.indexOf("http://") == 0 || input_original.indexOf("https://") == 0) {
      var url = input.split("/");
      var url_filename = url[url.length - 1];
      var hash = crypto.createHash('sha512');
      hash.update(Math.random().toString());
      hash = hash.digest('hex');
      var temp_input = path.join(os.tmpdir(), hash + url_filename);
      curlArgs = ['--silent', '-L', input, '-o', temp_input];
      child_process.execFileSync("curl", curlArgs);
      input = temp_input;
    }

    try {
      stats = fs.lstatSync(input);

      if (!stats.isFile()) {
        return false;
      }
    } catch (e) {
      return false;
    }

    if ( fileType == 'video' ) {
      var seconds = 0;
      var fps = 0;
      try {
        var process = new ffmpeg(input);
        process.then(function (video) {
          // Video metadata
          seconds = video.metadata.duration.seconds;
          fps = video.metadata.video.fps;
          // FFmpeg configuration
          var frame = 100;
          if(options.frame)
          {
            frame = options.frame;
          }
          var second = frame/fps;
          if(second > seconds)
          {
            second = seconds/2;
          }
          var selection = moment().startOf('day')
              .millisecond(second*1000)
              .format('HH:mm:ss.SSS');
          var ffmpegArgs = ['-y', '-i', input, '-vf', 'thumbnail', '-frames:v', '1', '-ss', selection, output];
          if (options.width > 0 && options.height > 0) {
            ffmpegArgs.splice(4, 1, 'thumbnail,scale=' + options.width + ':' + options.height + ':force_original_aspect_ratio=decrease' );
          }
          child_process.execFile('ffmpeg', ffmpegArgs, function(error) {
            if(options.delete)
            {
              fs.unlinkSync(input);
            }
          });
          return true;
        }, function (err) {
          return false
        });
      } catch (e) {
        return false
      }
    }

    if ( fileType == 'image' ) {
      try {
        var convertArgs = [input + '[0]', output];
        if (options.width > 0 && options.height > 0) {
          convertArgs.splice(0, 0, '-resize', options.width + 'x' + options.height);
        }
        if (options.quality) {
          convertArgs.splice(0, 0, '-quality', options.quality);
        }
        if (options.colorspace)
        {
          convertArgs.splice(0, 0, '-colorspace', options.colorspace)
        }
        if (options.background)
        {
          convertArgs.splice(0, 0, '-background', options.background);
        }
        if (options.alpha)
        {
          convertArgs.splice(0, 0, '-alpha', options.alpha);
        }
        child_process.execFile('convert', convertArgs, function(error) {
          if(options.delete)
          {
            fs.unlinkSync(input);
          }
          return true;
        });
      } catch(e) {
        return false;
      }
    }

    if ( fileType == 'other' ) {
      try {
        var hash = crypto.createHash('sha512');
        hash.update(Math.random().toString());
        hash = hash.digest('hex');

        var tempPDF = path.join(os.tmpdir(), hash + '.pdf');

        child_process.execFileSync('unoconv', ['-e', 'PageRange=1', '-o', tempPDF, input]);

        var convertArgs = [tempPDF + '[0]', output];
        if (options.width > 0 && options.height > 0) {
          convertArgs.splice(0, 0, '-resize', options.width + 'x' + options.height);
        }
        if (options.quality) {
          convertArgs.splice(0, 0, '-quality', options.quality);
        }
        if (options.colorspace)
        {
          convertArgs.splice(0, 0, '-colorspace', options.colorspace)
        }
        if (options.background)
        {
          convertArgs.splice(0, 0, '-background', options.background);
        }
        if (options.alpha)
        {
          convertArgs.splice(0, 0, '-alpha', options.alpha);
        }
        child_process.execFileSync('convert', convertArgs);
        fs.unlinkSync(tempPDF);
        if (input_original.indexOf("http://") == 0 || input_original.indexOf("https://") == 0) {
          if(options.delete)
          {
            fs.unlinkSync(input);
          }
        }
        return true;
      } catch (e) {
        return false;
      }
    }
  }
};
