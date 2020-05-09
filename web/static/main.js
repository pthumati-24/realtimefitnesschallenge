'use strict';
// import * as camrtc from './camera_webrtc.js';
/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as posenet from '@tensorflow-models/posenet';
import dat from 'dat.gui';
import Stats from 'stats.js';
import io from 'socket.io-client';

import {drawBoundingBox, drawKeypoints, drawSkeleton, isMobile, toggleLoadingUI, tryResNetButtonName, tryResNetButtonText, updateTryResNetButtonDatGuiCss} from './demo_util';

    let soc = io('https://messaging-dot-ccproject2-274303.wl.r.appspot.com');
    var connected=true;
  const sendMessage = (message) => {
    // var message = "Hi, I'm user " + username + ". This is a message from me.";
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      // tell server to execute 'new message' and send along one parameter
      dataChannelClient.value = message;
      soc.emit('new message', message);
    }

  }

const videoWidth = 600;
const videoHeight = 500;
const stats = new Stats();

const defaultQuantBytes = 2;

const defaultMobileNetMultiplier = isMobile() ? 0.50 : 0.75;
const defaultMobileNetStride = 16;
const defaultMobileNetInputResolution = 500;

const defaultResNetMultiplier = 1.0;
const defaultResNetStride = 32;
const defaultResNetInputResolution = 250;

const guiState = {
  algorithm: 'multi-pose',
  input: {
    architecture: 'MobileNetV1',
    outputStride: defaultMobileNetStride,
    inputResolution: defaultMobileNetInputResolution,
    multiplier: defaultMobileNetMultiplier,
    quantBytes: defaultQuantBytes
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  multiPoseDetection: {
    maxPoseDetections: 5,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0,
  },
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
  },
  net: null,
};


/**
 * Sets up dat.gui controller on the top-right of the window
 */


/**
 * Sets up a frames per second panel on the top-left of the window
 */


function updateRepcount(keypoints)
{
  
  var r_shoulder = keypoints[6].position;
  var r_elbow = keypoints[8].position;
  var r_wrist = keypoints[10].position;

  // console.log(r_shoulder);
  // console.log(r_elbow);
  // console.log(r_wrist);
  var elbow_wrist_slope = (r_elbow.y - r_wrist.y) / (r_elbow.x - r_wrist.x);
  var shoulder_elbow_slope = (r_shoulder.y - r_elbow.y) / (r_shoulder.x - r_elbow.x);
  var angle = Math.atan((shoulder_elbow_slope -elbow_wrist_slope)/(1 + (shoulder_elbow_slope*elbow_wrist_slope)));
  angle = angle * (180/Math.PI);

  // console.log(angle);
  if (updateRepcount.startrep == 0 && angle <=0 && angle >=-10)
  {
    updateRepcount.startrep=1;
    console.log("rep started");
  }
   else if (updateRepcount.startrep ==1 && angle <=-80 && angle >=-90)
  {
      updateRepcount.maxreach=1;
      console.log("max reached");
  }
  else if (updateRepcount.maxreach==1 && angle <=0 && angle >= -10)
  {
    console.log("rep end");
    updateRepcount.repcount+=1
    updateRepcount.maxreach=0
    updateRepcount.endrep == 1
  }

  return updateRepcount.repcount;
}

updateRepcount.repcount=0;
updateRepcount.startrep =0;
updateRepcount.maxreach =0;
updateRepcount.endrep =0;
/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');

  // since images are being fed from a webcam, we want to feed in the
  // original image and then just flip the keypoints' x coordinates. If instead
  // we flip the image, then correcting left-right keypoint pairs requires a
  // permutation on all the keypoints.
  const flipPoseHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {

    // Begin monitoring code for frames per second
    stats.begin();

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;

        const pose = await guiState.net.estimatePoses(video, {
          flipHorizontal: flipPoseHorizontal,
          decodingMethod: 'single-person'
        });
        poses = poses.concat(pose);
        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    //console.log(guiState.output.showVideo);
    if (guiState.output.showVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }
    // console.log()
    var repcount = updateRepcount(poses[0].keypoints);
    
      sendMessage(repcount);
    
    // document.getElementById("repcount").innerHTML = repcount;
    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores

    poses.forEach(({score, keypoints}) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
         
         // console.log(keypoints);
          drawKeypoints(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showSkeleton) {
          drawSkeleton(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showBoundingBox) {
          drawBoundingBox(keypoints, ctx);
        }
      }
    });

    // End monitoring code for frames per second
    stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
 async function runmodel(video) {
  //toggleLoadingUI(true);
  const net = await posenet.load({
    architecture: guiState.input.architecture,
    outputStride: guiState.input.outputStride,
    inputResolution: guiState.input.inputResolution,
    multiplier: guiState.input.multiplier,
    quantBytes: guiState.input.quantBytes
  });
  //toggleLoadingUI(false);

  
  guiState.net = net;
  console.log("running detectposeinrealtime");
  detectPoseInRealTime(video, net);
}


// export {runmodel}


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
  'video': {
      facingMode: 'user',
      width: videoWidth,
      height: videoHeight,
    },
};

// Set up to exchange only video.
const offerOptions = {
  offerToReceiveVideo: 1,
};

// Define initial start time of the call (defined as connection between peers).
let startTime = null;

// Define peer connections, streams and video elements.
const localVideo = document.getElementById('localVideo');
localVideo.width = videoWidth;
localVideo.height = videoHeight;
// const remoteVideo = document.getElementById('remoteVideo');

let localStream;
// let remoteStream;

let localPeerConnection;
let remotePeerConnection;

// WebRTC methods
let pc;
let someStream;
let remoteStreamElement = document.getElementById('remoteVideo');



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

  // runmodel(video);
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

  let socket = io(SIGNALING_SERVER_URL, { autoConnect: false });
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

    //start posenet
    runmodel(localVideo);
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
  var connected = false;
  
  // let soc = io();
  // Sets the client's username
  // const setUsername = () => {
  //   var array = new Uint32Array(1);
  //   window.crypto.getRandomValues(array);
  //   username = array;

  //   // If the username is valid
  //   if (username) {

  //     // Tell the server your username
  //     soc.emit('add user', username);
  //   }
  // }

  const sendButton1 = document.getElementById('sendButton1');
  var dataChannelSend = document.querySelector('textarea#dataChannelSend');
  var dataChannelClient = document.querySelector('textarea#dataChannelClient');
  var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
  var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
  // var counterElement = document.querySelector('p#counter');

  sendButton1.addEventListener('click', onSendButton1);

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

  // if (username) {
  //   sendMessage();
  //   soc.emit('stop typing');
  //   typing = false;
  // } else {
  //   setUsername();
  //   sendMessage();
  // }
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
    var message = "Welcome to ChallengeMe";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  soc.on('new message', (data) => {
    log(data);
    dataChannelReceive.value = data.message;
  })

  // // Whenever the server emits 'user joined', log it in the chat body
  soc.on('user joined', (data) => {
    log(data.username + ' joined');
  });

  // // Whenever the server emits 'user left', log it in the chat body
  soc.on('user left', (data) => {
    log(data.username + ' left');
    addParticipantsMessage(data);
  });

  // // Whenever the server emits 'typing', show the typing message
  soc.on('typing', (data) => {
    log(data);
  });

  // // Whenever the server emits 'stop typing', kill the typing message
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
