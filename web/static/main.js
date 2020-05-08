'use strict';
const SIGNALING_SERVER_URL = 'https://signalling-dot-ccproject2-274303.wl.r.appspot.com';
const TURN_SERVER_URL = '34.69.75.114:3478';
const TURN_SERVER_USERNAME = 'user';
const TURN_SERVER_CREDENTIAL = 'test';
// Set up media stream constant and parameters.

const PC_CONFIG = {
  iceServers: [
    {
      urls: 'turn:' + TURN_SERVER_URL + '?transport=tcp',
      username: TURN_SERVER_USERNAME,
      credential: TURN_SERVER_CREDENTIAL
    }
  ]
};

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

// WebRTC methods
let pc;
let someStream;
let remoteStreamElement = document.getElementById('remoteVideo');

let socket = io(SIGNALING_SERVER_URL, { autoConnect: false });



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
  trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n` +
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
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) {

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


  // let socket = io(SIGNALING_SERVER_URL, { autoConnect: false });

  socket.on('data', (data) => {
    console.log('Data received: ', data);
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
      sendData({
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

  getLocalStream();

  // Create peer connections and add behavior.
  localPeerConnection = new RTCPeerConnection(null);

}

// Handles hangup action: ends up call, closes connections and resets peers.
function hangupAction() {

  someStream.getTracks().forEach(t => t.stop());
  hangupButton.disabled = true;
  callButton.disabled = false;
  // location.reload();
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



$(function () {
  var username;
  var connected = true;
  let soc = io('https://messaging-dot-ccproject2-274303.wl.r.appspot.com');
  // let soc = io();
  // Sets the client's username
  const setUsername = () => {
    var array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    username = array;

    // If the username is valid
    if (username) {

      // Tell the server your username
      soc.emit('add user', username);
    }
  }

  const sendButton1 = document.getElementById('sendButton1');
  var dataChannelSend = document.querySelector('textarea#dataChannelSend');
  var dataChannelClient = document.querySelector('textarea#dataChannelClient');
  var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
  var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
  // var counterElement = document.querySelector('p#counter');

  // sendButton1.addEventListener('click', onSendButton1);

  // counterElement.addEventListener("change", function() {
  //   var message = counterElement.value;
  //   sendMessage(message);
  // });

  // function sleep(ms) {
  //   return new Promise(resolve => setTimeout(resolve, ms));
  // }

  // async function demo() {
  //   // console.log('Taking a break...');
  //   // await sleep(2000);
  //   // console.log('Two seconds later, showing sleep in a loop...');

  //   // Sleep in loop
  //   for (let i = 0; i < 10; i++) {
  //     // if (i === 3)
  //     counterElement.innerHTML = i;
  //     await sleep(10000);
  //     // console.log(i);
  //   }
  // }

  // demo();

  // Handles start button action: creates local MediaStream.
  function onSendButton1() {
    trace('clicked msg start button');
    var message = dataChannelSend.value;
    sendMessage(message);
  }

  // Sends a chat message
  const sendMessage = (message) => {
    // var message = "Hi, I'm user " + username + ". This is a message from me.";
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      // tell server to execute 'new message' and send along one parameter
      dataChannelClient.value = message;
      soc.emit('new message', message);
    }
  }
  if (username) {
    sendMessage();
    soc.emit('stop typing');
    typing = false;
  } else {
    setUsername();
    sendMessage();
  }
  // Log a message
  const log = (message, options) => {
    console.log(message);
  }

  const addParticipantsMessage = (data) => {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Socket events

  // Whenever the server emits 'login', log the login message
  soc.on('login', (data) => {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Socket.IO Chat – ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  soc.on('new message', (data) => {
    log(data);
    dataChannelReceive.value = data.message;
  });

  // Whenever the server emits 'user joined', log it in the chat body
  soc.on('user joined', (data) => {
    log(data.username + ' joined');
  });

  // Whenever the server emits 'user left', log it in the chat body
  soc.on('user left', (data) => {
    log(data.username + ' left');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'typing', show the typing message
  soc.on('typing', (data) => {
    log(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  soc.on('stop typing', (data) => {
    log(data);
  });

  soc.on('disconnect', () => {
    log('you have been disconnected');
  });

  soc.on('reconnect', () => {
    log('you have been reconnected');
    if (username) {
      soc.emit('add user', username);
    }
  });

  soc.on('reconnect_error', () => {
    log('attempt to reconnect has failed');
  });
});
