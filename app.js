const coworkers = require('coworkers')
const app = coworkers();
var filepreview = require('filepreview');
var findRemoveSync = require('find-remove');
const uuidv4 = require('uuid/v4');
var ExifImage = require('exif').ExifImage;
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var os = require('os');
var child_process = require('child_process');
var mime = require('mime');


function checkOldFiles() {
    findRemoveSync('./tmp', {age: {seconds: 60*60*24*7 /* 7 days */}, extensions: ['.jpg']});
}

function sendMsgBack(msgContent,backQueue, correlationId)
{
    app.connection.createChannel().then(function(ch){
        ch.assertQueue(backQueue);
        var content = new Buffer(JSON.stringify(msgContent));
        const replyMsg = ch.sendToQueue(backQueue, content, {'correlationId': correlationId})
    });
}

// shared middlewares
app.use(function * (next) {
    // all consumers will run this logic...
    console.log('waiting');
    yield next
})
// queue consumers w/ middlewares
app.queue('imagepreview-queue', function * () {
    //console.log(this.message);
    // consumer specific logic
    var messageBody = this.message.content.toString();
    var correlationId = this.properties.correlationId;
    var messageJson = JSON.parse(messageBody);
    var input_original = messageJson.url;
    delete messageJson.url;
    var input = input_original;
    var back = false;
    var backQueue = null;
    var hostName = null;
    if(messageJson.sendMsgBack)
    {
        back = true;
        backQueue = messageJson.backQueue;
        if(messageJson.hostName)
        {
            hostName = messageJson.hostName;
            if(hostName.substr(hostName.length - 1) !== '/')
            {
                hostName += '/';
            }
            delete messageJson.hostName;
        }
        delete messageJson.sendMsgBack;
        delete messageJson.backQueue
    }

    if (input_original.indexOf("http://") == 0 || input_original.indexOf("https://") == 0) {
        var url = input_original.split("/");
        var url_filename = url[url.length - 1];
        var hash = crypto.createHash('sha512');
        hash.update(Math.random().toString());
        hash = hash.digest('hex');
        var temp_input = path.join(os.tmpdir(), hash + url_filename);
        curlArgs = ['--silent', '-L', input, '-o', temp_input];
        child_process.execFileSync("curl", curlArgs);
        input = temp_input;
    }

    var options = {
        background: 'white',
        alpha: 'remove',
        colorspace: 'sRGB'
    };

    for(var key in messageJson)
    {
        options[key] = messageJson[key];
    }


    var mimeType = mime.lookup(input);
    var exif = {}
    if(mimeType === 'image/jpeg')
    {
        try {
            new ExifImage({ image : input}, function (error, exifData) {
                if (error)
                    console.log('Error: '+error.message);
                else {
                    console.log(exifData); // Do something with your data!
                    exif = exifData;
                }
            });
        } catch (error) {
            console.log('Error: ' + error.message);
        }
    }

    var destName = './tmp/'+uuidv4()+'.jpg';


    filepreview.generate(input, destName, options, function(error) {
        if (error) {
            console.log('error', error);

            if(back)
            {
                sendMsgBack({success: false}, backQueue, correlationId)
            }
        }
        else {
            console.log('['+correlationId+'] File preview is '+destName);
            if(back)
            {
                sendMsgBack({success: true, 'file': destName.replace('./',hostName),'exif':exif}, backQueue, correlationId)
            }
        }
        app.context.ack = true;
    });


    /*
    var previewCreated = filepreview.generateSync(input, destName, options);
    console.log('previewCreated', previewCreated);
    if(previewCreated === true)
    {
        console.log('File preview is '+destName);
        if(back)
        {
            sendMsgBack({success: true, 'file': destName.replace('./',hostName)}, backQueue, correlationId)
        }
    }
    else {
        console.log('error');

        if(back)
        {
            sendMsgBack({success: false}, backQueue, correlationId)
        }
    }
    */

    checkOldFiles();

    this.ack = true; // acknowledge message later, see `Context` documentation below
});
// middleware error handler
app.on('error', function (err) {
    console.error(err.stack)
})
// connect to rabbitmq and begin consuming
app.connect()
.then(function(){
    console.log('connection established');
})
.catch(function(error){
    console.log('error', error);
});
