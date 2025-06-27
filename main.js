import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js';
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
import CameraControls from 'https://cdn.jsdelivr.net/npm/camera-controls@2.8.2/dist/camera-controls.module.js';

CameraControls.install({ THREE: THREE });

let scene, camera, renderer, clock, cameraControls;
let handLandmarker, video, rightHandModel, leftHandModel;

async function init() {
  setupScene();
  await setupWebcam();
  await setupMediaPipe();
  await loadHandModel();
  animate();
}
init();

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 1.5);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  clock = new THREE.Clock();
  cameraControls = new CameraControls(camera, renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

async function setupWebcam() {
  video = document.getElementById('webcam');
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
  video.srcObject = stream;
  await new Promise(resolve => video.onloadedmetadata = resolve);
  video.play();
}

async function setupMediaPipe() {
    // 공식 웹 예제에서 사용하는 라이브러리 경로를 사용합니다.
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        // 가장 최신이자 안정적인 모델 경로를 명시적으로 지정합니다.
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO", // VIDEO 모드는 detectForVideo와 함께 사용됩니다.
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    console.log("Hand Landmarker가 공식 예제와 동일한 구성으로 초기화되었습니다.");
  }
  


async function loadHandModel() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('assets/models/modi.glb');
  rightHandModel = gltf.scene;
  scene.add(rightHandModel);

  leftHandModel = rightHandModel.clone(true); // true 옵션으로 깊은 복사
  leftHandModel.scale.x = -1; // X축으로 뒤집어 완벽한 거울상(왼손)을 만듭니다.
  scene.add(leftHandModel);

  console.log("오른손과 왼손 모델이 준비되었습니다.");

}

/**
 * 손가락 꺾임 방향과 엄지 축이 보정된 뼈 지도
 */
/**
 * 손가락의 '0도' 포즈를 반영하고, 엄지와의 일관성을 높인 뼈 지도
 */

/**
 * 리타겟팅을 위한 뼈의 연결 관계와 기본 축 정보를 정의합니다.
/**
 * 뼈의 기본 축(axis) 정보를 다시 포함한 최종 버전
 */
/**
 * Blender에서 분석한 '정확한' 축 정보를 반영한 최종 Bone Map
 */
/**
 * 뼈의 기본 축(axis) 정보를 다시 포함한 최종 버전
 */
function getBoneMapping() {
  // 손가락이 뒤로 꺾이는 문제를 해결했던 (0, -1, 0)을 다시 사용하거나,
  // (0, 1, 0)으로 시작하여 테스트합니다.
  const fingerAxis = new THREE.Vector3(0, 1, 0); 
  const thumbAxis = new THREE.Vector3(0, 0, -1); 

  return {
      // "블렌더 뼈 이름": { startIdx, endIdx, axis }
      'palm_thumb':  { startIdx: 0, endIdx: 1, axis: fingerAxis },
      'palm_index':  { startIdx: 0, endIdx: 5, axis: fingerAxis },
      'palm_middle': { startIdx: 0, endIdx: 9, axis: fingerAxis },
      'palm_ring':   { startIdx: 0, endIdx: 13, axis: fingerAxis },
      'palm_pinky':  { startIdx: 0, endIdx: 17, axis: fingerAxis },
      
      'thumb_cmc': { startIdx: 1, endIdx: 2, axis: thumbAxis },
      'thumb_mcp': { startIdx: 2, endIdx: 3, axis: thumbAxis },
      'thumb_ip':  { startIdx: 3, endIdx: 4, axis: thumbAxis },
      
      'index_mcp': { startIdx: 5, endIdx: 6, axis: fingerAxis },
      'index_pip': { startIdx: 6, endIdx: 7, axis: fingerAxis },
      'index_dip': { startIdx: 7, endIdx: 8, axis: fingerAxis },

      'middle_mcp': { startIdx: 9,  endIdx: 10, axis: fingerAxis },
      'middle_pip': { startIdx: 10, endIdx: 11, axis: fingerAxis },
      'middle_dip': { startIdx: 11, endIdx: 12, axis: fingerAxis },

      'ring_mcp': { startIdx: 13, endIdx: 14, axis: fingerAxis },
      'ring_pip': { startIdx: 14, endIdx: 15, axis: fingerAxis },
      'ring_dip': { startIdx: 15, endIdx: 16, axis: fingerAxis },

      'pinky_mcp': { startIdx: 17, endIdx: 18, axis: fingerAxis },
      'pinky_pip': { startIdx: 18, endIdx: 19, axis: fingerAxis },
      'pinky_dip': { startIdx: 19, endIdx: 20, axis: fingerAxis },
  };
}



/**
 * 기존 코드의 안정적인 손 전체 회전과 리타겟팅의 계층적 손가락 회전을 결합한 최종 버전
 */
function applyLandmarks(landmarks) {
  if (!rightHandModel || !landmarks || landmarks.length < 21) return;

  // 거울 모드 및 좌표계 보정
  const worldLandmarks = landmarks.map(lm => new THREE.Vector3(-lm.x, -lm.y, -lm.z).multiplyScalar(1.5));

  // --- A. 손 전체의 위치 및 방향 설정 (사용자님의 안정적인 기존 코드 로직 사용) ---
  rightHandModel.position.lerp(worldLandmarks[0], 0.6);

  const wrist = worldLandmarks[0];
  const middleMcp = worldLandmarks[9];
  const indexMcp = worldLandmarks[5];
  const pinkyMcp = worldLandmarks[17];

  const targetForward = new THREE.Vector3().subVectors(middleMcp, wrist).normalize();
  const targetRight = new THREE.Vector3().subVectors(indexMcp, pinkyMcp).normalize();
  const targetUp = new THREE.Vector3().crossVectors(targetForward, targetRight).normalize();

  const modelAxisZ = new THREE.Vector3(0, 0, 1);
  const modelAxisY = new THREE.Vector3(0, 1, 0);

  const forwardRotation = new THREE.Quaternion().setFromUnitVectors(modelAxisY, targetForward);
  const rotatedModelAxisZ = modelAxisZ.clone().applyQuaternion(forwardRotation);
  const twistRotation = new THREE.Quaternion().setFromUnitVectors(rotatedModelAxisZ, targetUp);

  const finalRotation = new THREE.Quaternion();
  finalRotation.multiply(twistRotation);
  finalRotation.multiply(forwardRotation);

  rightHandModel.quaternion.slerp(finalRotation, 0.4);

  // --- B. 개별 손가락의 계층적 회전 (안정성을 위해 axis 기반 로직으로 복귀) ---
  const boneMapping = getBoneMapping();
  rightHandModel.traverse(bone => {
      if (!bone.isBone) return;

      const mapping = boneMapping[bone.name];
      if (!mapping) return;

      const parent = bone.parent;
      if (!parent || !parent.isBone) return;

      const startLm = worldLandmarks[mapping.startIdx];
      const endLm = worldLandmarks[mapping.endIdx];
      if (!startLm || !endLm) return;

      // 월드 공간에서 뼈가 향해야 할 방향
      const worldDir = new THREE.Vector3().subVectors(endLm, startLm).normalize();

      // 부모 뼈의 월드 회전을 가져와 뒤집음
      const parentWorldQuat = parent.getWorldQuaternion(new THREE.Quaternion());
      const parentInv = parentWorldQuat.clone().invert();

      // 월드 방향을 부모 기준의 '로컬 방향'으로 변환
      const localDir = worldDir.clone().applyQuaternion(parentInv);

      // [핵심] '로컬 방향'으로 향하기 위해 뼈의 '기본 축(axis)'을 얼마나 회전해야 하는지 계산
      const quat = new THREE.Quaternion().setFromUnitVectors(mapping.axis, localDir);

      bone.quaternion.slerp(quat, 0.5);
  });
}





let lastVideoTime = -1;
/**
 * handedness 정보에 의존하지 않고, 랜드마크의 기하학적 구조로
 * 왼손/오른손을 직접 추정하는 가장 안정적인 최종 버전
 */
async function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  cameraControls.update(delta);

  if (handLandmarker && video.readyState >= 2) {
    const results = await handLandmarker.detectForVideo(video, performance.now());
    if (results && results.landmarks && results.landmarks.length > 0) {
      // 첫 번째로 감지된 손만 오른손 모델에 적용
      applyLandmarks(results.landmarks[0]);
    }
  }

  renderer.render(scene, camera);
}
  