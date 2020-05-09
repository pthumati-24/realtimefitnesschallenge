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

import {drawBoundingBox, drawKeypoints, drawSkeleton, isMobile, toggleLoadingUI, tryResNetButtonName, tryResNetButtonText, updateTryResNetButtonDatGuiCss} from './demo_util';

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

    var repcount = updateRepcount(poses[0].keypoints);
    sendMessage(repcount);
    document.getElementById("repcount").innerHTML = repcount;
    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores

    poses.forEach(({score, keypoints}) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
         
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


export {runmodel}
