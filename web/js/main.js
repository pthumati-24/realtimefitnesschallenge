'use strict';
const SIGNALING_SERVER_URL = 'http://192.168.0.170:9999';
const TURN_SERVER_URL = 'localhost:3478';
const TURN_SERVER_USERNAME = 'username';
const TURN_SERVER_CREDENTIAL = 'credential';
// Set up media stream constant and parameters.

// In this codelab, you will be streaming video only: "video: true".
// Audio will not be streamed because it is set to "audio: false" by default.
const mediaStreamConstraints = {
  video: true,
};

// Set up to exchange only video.
const offerOptions = {
  offerToReceiveVideo: 1,
};

// Define initial start time of the call (defined as connection between peers).
let startTime = null;

// Define peer connections, streams and video elements.
const localVideo = document.getElementById('localVideo');
// const remoteVideo = document.getElementById('remoteVideo');

let localStream;
// let remoteStream;

let localPeerConnection;
let remotePeerConnection;


// Define MediaStreams callbacks.

// Sets the MediaStream as the video element src.
function gotLocalMediaStream(mediaStream) {
  localVideo.srcObject = mediaStream;
  localStream = mediaStream;
  trace('Received local stream.');
  callButton.disabled = false;  // Enable call button.
}

// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error) {
  trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

// Handles remote MediaStream success by adding it as the remoteVideo src.
// function gotRemoteMediaStream(event) {
//   const mediaStream = event.stream;
//   remoteVideo.srcObject = mediaStream;
//   remoteStream = mediaStream;
//   trace('Remote peer connection received remote stream.');
// }


// Add behavior for video streams.

// Logs a message with the id and size of a video element.
function logVideoLoaded(event) {
  const video = event.target;
  trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
        `videoHeight: ${video.videoHeight}px.`);
}

// Logs a message with the id and size of a video element.
// This event is fired when video begins streaming.
function logResizedVideo(event) {
  logVideoLoaded(event);

  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    startTime = null;
    trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
  }
}

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
// remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
// remoteVideo.addEventListener('onresize', logResizedVideo);


// Define RTC peer connection behavior.

// Connects with new peer candidate.
function handleConnection(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    const otherPeer = getOtherPeer(peerConnection);

    otherPeer.addIceCandidate(newIceCandidate)
      .then(() => {
        handleConnectionSuccess(peerConnection);
      }).catch((error) => {
        handleConnectionFailure(peerConnection, error);
      });

    trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
          `${event.candidate.candidate}.`);
  }
}

// Logs that the connection succeeded.
function handleConnectionSuccess(peerConnection) {
  trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
};

// Logs that the connection failed.
function handleConnectionFailure(peerConnection, error) {
  trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n`+
        `${error.toString()}.`);
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
  trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
  const peerName = getPeerName(peerConnection);
  trace(`${peerName} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description) {
  trace(`Offer from localPeerConnection:\n${description.sdp}`);

  trace('localPeerConnection setLocalDescription start.');
  localPeerConnection.setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(localPeerConnection);
    }).catch(setSessionDescriptionError);

  // trace('remotePeerConnection setRemoteDescription start.');
  // remotePeerConnection.setRemoteDescription(description)
  //   .then(() => {
  //     setRemoteDescriptionSuccess(remotePeerConnection);
  //   }).catch(setSessionDescriptionError);

  // trace('remotePeerConnection createAnswer start.');
  // remotePeerConnection.createAnswer()
  //   .then(createdAnswer)
  //   .catch(setSessionDescriptionError);
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) {
  // trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

  // trace('remotePeerConnection setLocalDescription start.');
  // remotePeerConnection.setLocalDescription(description)
  //   .then(() => {
  //     setLocalDescriptionSuccess(remotePeerConnection);
  //   }).catch(setSessionDescriptionError);

  trace('localPeerConnection setRemoteDescription start.');
  localPeerConnection.setRemoteDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
    }).catch(setSessionDescriptionError);
}


// Define and add behavior to buttons.

// Define action buttons.
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;


// Handles start button action: creates local MediaStream.
function startAction() {
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
  trace('Requesting local stream.');
}

// Handles call button action: creates peer connection.
function callAction() {
  callButton.disabled = true;
  hangupButton.disabled = false;

  trace('Starting call.');
  startTime = window.performance.now();

  // Get local media stream tracks.
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace(`Using video device: ${videoTracks[0].label}.`);
  }
  if (audioTracks.length > 0) {
    trace(`Using audio device: ${audioTracks[0].label}.`);
  }
  
  // WebRTC config: you don't have to change this for the example to work
  // If you are testing on localhost, you can just use PC_CONFIG = {}
  const servers = {                 // Allows for RTC server configuration.
    iceServers: [
      {
        urls: 'turn:' + TURN_SERVER_URL + '?transport=tcp',
        username: TURN_SERVER_USERNAME,
        credential: TURN_SERVER_CREDENTIAL
      },
      {
        urls: 'turn:' + TURN_SERVER_URL + '?transport=udp',
        username: TURN_SERVER_USERNAME,
        credential: TURN_SERVER_CREDENTIAL
      }
    ]
  };
 
  // Signaling methods
  let socket = io(SIGNALING_SERVER_URL, { autoConnect: false });

  // Create peer connections and add behavior.
  localPeerConnection = new RTCPeerConnection(null);
  trace('Created local peer connection object localPeerConnection.');

  localPeerConnection.addEventListener('icecandidate', handleConnection);
  localPeerConnection.addEventListener(
    'iceconnectionstatechange', handleConnectionChange);

  // remotePeerConnection = new RTCPeerConnection(servers);
  // trace('Created remote peer connection object remotePeerConnection.');

  // remotePeerConnection.addEventListener('icecandidate', handleConnection);
  // remotePeerConnection.addEventListener(
  //   'iceconnectionstatechange', handleConnectionChange);
  // remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

  // Add local stream to connection and create offer to connect.
  localPeerConnection.addStream(localStream);
  trace('Added local stream to localPeerConnection.');

  trace('localPeerConnection createOffer start.');
  localPeerConnection.createOffer(offerOptions)
    .then(createdOffer).catch(setSessionDescriptionError);

  // socket.on('data', (data) => {
  //   console.log('Data received: ',data);
  //   handleSignalingData(data);
  // });

  // let handleSignalingData = (data) => {
  //   switch (data.type) {
  //     case 'offer':
  //       // createPeerConnection();
  //       remotePeerConnection.addStream(remoteStream);
  //       trace('Added remote stream to remotePeerConnection.');
  //       remotePeerConnection.setRemoteDescription(new RTCSessionDescription(data));
  //       // sendAnswer();
  //       remotePeerConnection.createAnswer().then(()=>{
  //         remotePeerConnection.setLocalDescription(description)
  //         .then(() => {
  //           setLocalDescriptionSuccess(remotePeerConnection);
  //         }).catch(setSessionDescriptionError);})
  //       .catch(setSessionDescriptionError);
  //       break;
  //     case 'answer':
  //       remotePeerConnection.setRemoteDescription(new RTCSessionDescription(data));
  //       break;
  //     case 'candidate':
  //       remotePeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  //       break;
  //   }
  // };

  // socket.on('ready', () => {
  //   console.log('Ready');
  //   // Connection with signaling server is ready, and so is local stream
  //   // createPeerConnection();
  //   remotePeerConnection.addStream(remoteStream);
  //   trace('Added remote stream to remotePeerConnection.');
  //   // sendOffer();
  //   trace('remotePeerConnection createOffer start.');
  //   remotePeerConnection.createOffer(offerOptions)
  //   .then(createdOffer).catch(setSessionDescriptionError);
  // });

  // let sendData = (data) => {
  //   socket.emit('data', data);
  // };

  // socket.connect();

}

// Handles hangup action: ends up call, closes connections and resets peers.
function hangupAction() {
  localPeerConnection.close();
  // remotePeerConnection.close();
  localPeerConnection = null;
  // remotePeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  trace('Ending call.');
}

// Add click event handlers for buttons.
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);


// Define helper functions.

// Gets the "other" peer connection.
function getOtherPeer(peerConnection) {
  return (peerConnection === localPeerConnection) ?
      remotePeerConnection : localPeerConnection;
}

// Gets the name of a certain peer connection.
function getPeerName(peerConnection) {
  return (peerConnection === localPeerConnection) ?
      'localPeerConnection' : 'remotePeerConnection';
}

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);

  console.log(now, text);
}

let socket = io(SIGNALING_SERVER_URL, { autoConnect: false });

socket.on('data', (data) => {
  console.log('Data received: ',data);
  handleSignalingData(data);
});

socket.on('ready', () => {
  console.log('Ready');
  // Connection with signaling server is ready, and so is local stream
  createPeerConnection();
  sendOffer();
});

let sendData = (data) => {
  socket.emit('data', data);
};

// WebRTC methods
let pc;
let someStream;
let remoteStreamElement = document.getElementById('remoteVideo');

let getLocalStream = () => {
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then((stream) => {
      console.log('Stream found');
      someStream = stream;
      // Connect after making sure that local stream is availble
      socket.connect();
    })
    .catch(error => {
      console.error('Stream not found: ', error);
    });
}

let createPeerConnection = () => {
  try {
    pc = new RTCPeerConnection(PC_CONFIG);
    pc.onicecandidate = onIceCandidate;
    pc.onaddstream = onAddStream;
    pc.addStream(someStream);
    console.log('PeerConnection created');
  } catch (error) {
    console.error('PeerConnection failed: ', error);
  }
};

let sendOffer = () => {
  console.log('Send offer');
  pc.createOffer().then(
    setAndSendLocalDescription,
    (error) => { console.error('Send offer failed: ', error); }
  );
};

let sendAnswer = () => {
  console.log('Send answer');
  pc.createAnswer().then(
    setAndSendLocalDescription,
    (error) => { console.error('Send answer failed: ', error); }
  );
};

let setAndSendLocalDescription = (sessionDescription) => {
  pc.setLocalDescription(sessionDescription);
  console.log('Local description set');
  sendData(sessionDescription);
};

let onIceCandidate = (event) => {
  if (event.candidate) {
    console.log('ICE candidate');
    sendData({createdAnswer
      type: 'candidate',
      candidate: event.candidate
    });
  }
};

let onAddStream = (event) => {
  console.log('Add stream');
  remoteStreamElement.srcObject = event.stream;
};

let handleSignalingData = (data) => {
  switch (data.type) {
    case 'offer':
      createPeerConnection();
      pc.setRemoteDescription(new RTCSessionDescription(data));
      sendAnswer();
      break;
    case 'answer':
      pc.setRemoteDescription(new RTCSessionDescription(data));
      break;
    case 'candidate':
      pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      break;
  }
};

// Start connection
getLocalStream();