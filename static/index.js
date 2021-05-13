//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream;                      //stream from getUserMedia()
var rec;                            //Recorder.js object
var input;                          //MediaStreamAudioSourceNode we'll be recording
let context;

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var startButton = document.getElementById('startWithWatson')
//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
startButton.addEventListener('click', startConversation)
function startConversation(){
    var oReq = new XMLHttpRequest();
    oReq.open('GET','/api/session') 
    oReq.onload = function(){
        console.log('Se creo la sesion')
        var request = new XMLHttpRequest();
        request.open('POST', '/api/watson-assistant', true)
        request.onload = function(){
            addTextMessage(request.response, 'watson')
            textToSpeech(request.response)
        }
        request.send('')
    }
    oReq.send()
}


function startRecording() {
    console.log("recordButton click");
    var constraints = { audio: true, video:false }
    recordButton.disabled = true;
    stopButton.disabled = false;

    /*
        We're using the standard promise based getUserMedia() 
        https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    */

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

        /*
            create an audio context after getUserMedia is called
            sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
            the sampleRate defaults to the one set in your OS for your playback device

        */
        audioContext = new AudioContext();
        /*  assign to gumStream for later use  */
        gumStream = stream;

        /* use the stream */
        input = audioContext.createMediaStreamSource(stream);

        /* 
            Create the Recorder object and configure to record mono sound (1 channel)
            Recording 2 channels  will double the file size
        */
        rec = new Recorder(input)

        //start the recording process
        rec.record(10)

        console.log("Recording started");

    }).catch(function(err) {
        //enable the record button if getUserMedia() fails
        console.log(err)
        recordButton.disabled = false;
        stopButton.disabled = true;
    });
}


function stopRecording() {
    console.log("stopButton clicked");

    //disable the stop button, enable the record too allow for new recordings
    stopButton.disabled = true;
    recordButton.disabled = false;


    //tell the recorder to stop the recording
    rec.stop();

    //stop microphone access
    gumStream.getAudioTracks()[0].stop();

    //create the wav blob and pass it on to createDownloadLink
    rec.exportWAV(createDownloadLink);

    //send file

    rec && rec.exportWAV(function(blob){
        console.log(blob)
        const url = '/api/speech-to-text'
        const request= new XMLHttpRequest()
        request.open('POST', url, true);
        request.onload = function(){
            console.log('holaa')
            console.log(request.response)
            if( request.response == "Sorry, didn't get that. please try again!"){
                textToSpeech(request.response)
                addTextMessage(request.response, 'watson')
            }
            else{
                addTextMessage(request.response,'user')
                sendToWatsonAssistant(request.response)
            }
        }
        request.send(blob)
    })
    
}

function createDownloadLink(blob) {

    var url = URL.createObjectURL(blob);
    var au = document.createElement('audio');
    var li = document.createElement('li');
    var link = document.createElement('a');

    //name of .wav file to use during upload and download (without extendion)
    var filename = new Date().toISOString();

    //add controls to the <audio> element
    au.controls = true;
    au.src = url;

    //save to disk link
    link.href = url;
    link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
    link.innerHTML = "Save to disk";

    //add the new audio element to li
    li.appendChild(au);

    //add the filename to the li
    li.appendChild(document.createTextNode(filename+".wav "))

    //add the save to disk link to li
    li.appendChild(link);

    
    //upload link
    var upload = document.createElement('a');
    upload.href="#";
    upload.innerHTML = "Upload";
    upload.addEventListener("click", function(event){
          //var xhr=new XMLHttpRequest();
          //xhr.onload=function(e) {
            //  if(this.readyState === 4) {
              //    console.log("Server returned: ",e.target.responseText);
             // }
          //};
          //var fd=new FormData();
          //fd.append("audio_data",blob, filename);
          //xhr.open("POST","/",true);
          //xhr.send(fd);
          sendToWatsonAssistant("can i get an insurance")
          //sendToWatsonAssistant(request.response)
        
    })
    li.appendChild(document.createTextNode (" "))//add a space in between
    li.appendChild(upload)//add the upload link to li

    //add the li element to the ol
    //recordingsList.appendChild(li);
}

function addTextMessage(message, user){
    var messagesList = document.getElementById("cardContainer");
    var messageContainer;
    var messageText;
    if (user == 'user'){
        messageContainer = document.createElement('div')
        messageContainer.setAttribute('id', 'messageUserRow')
        messageText = document.createElement('div')
        messageText.setAttribute('id', 'messageUser')
        messageText.innerHTML = message
    }else if(user == 'watson'){
        messageContainer = document.createElement('div')
        messageContainer.setAttribute('id', 'messageAssistantRow')
        messageText = document.createElement('div')
        messageText.setAttribute('id', 'messageAssistant')
        messageText.innerHTML = message
    }
    messageContainer.appendChild(messageText)
    messagesList.appendChild(messageContainer)
}

function sendToWatsonAssistant(message){
    const url = '/api/watson-assistant'
    const request= new XMLHttpRequest()
    request.open('POST', url, true);
    request.onload = function(){
        console.log('YA SE HIZO LO DE WATSON')
        addTextMessage(request.response, 'watson')
        textToSpeech(request.response)
    }
    request.send(message)
}

function textToSpeech(message){
    let buf;
    source = audioCtx.createBufferSource();
    var req = new XMLHttpRequest();
    req.open('POST', '/api/text-to-speech')
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    req.responseType = 'arraybuffer';
    req.onload = function(){
        console.log(req.response)
        audioCtx.decodeAudioData(req.response, function(buffer){
            source.buffer = buffer;
            source.connect(audioCtx.destination)
            source.start(0)
        },
        function(e){
            console.log('ERROR', e.error)
        })
    }
    req.send(message)
}