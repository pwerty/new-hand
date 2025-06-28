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

function convertLandmarksToWorld(landmarks) {
  return landmarks.map(lm => {
      // MediaPipe 좌표를 Three.js 월드 좌표로 변환
      return new THREE.Vector3(
          -(lm.x - 0.5) * 3,    // X축 중심 정렬 및 스케일링
          -(lm.y - 0.5) * 3,    // Y축 중심 정렬 및 스케일링  
          -lm.z * 2             // Z축 깊이 정보
      );
  });
}


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

  //leftHandModel = rightHandModel.clone(true); // true 옵션으로 깊은 복사
  //leftHandModel.scale.x = -1; // X축으로 뒤집어 완벽한 거울상(왼손)을 만듭니다.
 // scene.add(leftHandModel);

  console.log("오른손과 왼손 모델이 준비되었습니다.");

}

 */
function getBoneMapping() {
  // --- 중요 ---
  // 아래 axis 값은 Blender에서 직접 확인한 값으로 수정해야 합니다.
  // 예시: 뼈의 'Y축'이 뼈 길이를 따라 정렬되어 있다면 new THREE.Vector3(0, 1, 0)
  // 예시: 뼈의 'Z축'이 뼈 길이를 따라 정렬되어 있다면 new THREE.Vector3(0, 0, 1)

  // 일반 손가락(검지~새끼)의 기본 축 (Blender에서 확인한 값으로 변경)
  const fingerAxis = new THREE.Vector3(0, 1, 0); 

  // 엄지 손가락의 기본 축 (일반 손가락과 다를 수 있음. Blender에서 확인한 값으로 변경)
  const thumbAxis = new THREE.Vector3(1, 0, 1);

  return {
      // 손바닥에서 시작되는 가상 뼈들
      'palm_thumb':  { startIdx: 0, endIdx: 1, axis: thumbAxis.clone() },

      'palm_index':  { startIdx: 0, endIdx: 5, axis: fingerAxis.clone() },
      'palm_middle': { startIdx: 0, endIdx: 9, axis: fingerAxis.clone() },
      'palm_ring':   { startIdx: 0, endIdx: 13, axis: fingerAxis.clone() },
      'palm_pinky':  { startIdx: 0, endIdx: 17, axis: fingerAxis.clone() },
      
      // 엄지 (다른 축을 가질 수 있음)
      'thumb_cmc': { startIdx: 1, endIdx: 2, axis: thumbAxis.clone() },
      'thumb_mcp': { startIdx: 2, endIdx: 3, axis: thumbAxis.clone() },
      'thumb_ip':  { startIdx: 3, endIdx: 4, axis: thumbAxis.clone() },
      
      // 검지
      'index_mcp': { startIdx: 5, endIdx: 6, axis: fingerAxis.clone() },
      'index_pip': { startIdx: 6, endIdx: 7, axis: fingerAxis.clone() },
      'index_dip': { startIdx: 7, endIdx: 8, axis: fingerAxis.clone() },

      // 중지
      'middle_mcp': { startIdx: 9,  endIdx: 10, axis: fingerAxis.clone() },
      'middle_pip': { startIdx: 10, endIdx: 11, axis: fingerAxis.clone() },
      'middle_dip': { startIdx: 11, endIdx: 12, axis: fingerAxis.clone() },

      // 약지
      'ring_mcp': { startIdx: 13, endIdx: 14, axis: fingerAxis.clone() },
      'ring_pip': { startIdx: 14, endIdx: 15, axis: fingerAxis.clone() },
      'ring_dip': { startIdx: 15, endIdx: 16, axis: fingerAxis.clone() },

      // 새끼
      'pinky_mcp': { startIdx: 17, endIdx: 18, axis: fingerAxis.clone() },
      'pinky_pip': { startIdx: 18, endIdx: 19, axis: fingerAxis.clone() },
      'pinky_dip': { startIdx: 19, endIdx: 20, axis: fingerAxis.clone() },
  };
}




/**
 * [새로운 시도] Unity 프로젝트의 아이디어를 적용하여, 랜드마크로부터 직접 각도를 계산하여 뼈 회전 적용
 */
/**
 * 새끼손가락의 '벌어짐(abduction)' 문제를 해결하기 위해 보조 회전을 추가한 버전
 */
function applyLandmarks(landmarks) {
  if (!rightHandModel || !landmarks || landmarks.length < 21) return;

  const worldLandmarks = landmarks.map(lm => new THREE.Vector3(-lm.x, -lm.y, -lm.z).multiplyScalar(1.5));

  // --- A. 손 전체의 위치 및 방향 설정 (기존 안정적인 로직 유지) ---
  rightHandModel.position.lerp(worldLandmarks[0], 0.6);

  const wrist = worldLandmarks[0];
  const middleMcp = worldLandmarks[9];
  const indexMcp = worldLandmarks[5];
  const pinkyMcpLm = worldLandmarks[17]; // 랜드마크 17번을 명시적으로 사용

  const targetForward = new THREE.Vector3().subVectors(middleMcp, wrist).normalize();
  const targetRight = new THREE.Vector3().subVectors(indexMcp, pinkyMcpLm).normalize();
  const targetUp = new THREE.Vector3().crossVectors(targetForward, targetRight).normalize();

  // (이하 손 전체 회전 로직은 동일)
  const modelAxisZ = new THREE.Vector3(0, 0, 1);
  const modelAxisY = new THREE.Vector3(0, 1, 0);
  const forwardRotation = new THREE.Quaternion().setFromUnitVectors(modelAxisY, targetForward);
  const rotatedModelAxisZ = modelAxisZ.clone().applyQuaternion(forwardRotation);
  const twistRotation = new THREE.Quaternion().setFromUnitVectors(rotatedModelAxisZ, targetUp);
  const finalRotation = new THREE.Quaternion();
  finalRotation.multiply(twistRotation);
  finalRotation.multiply(forwardRotation);
  rightHandModel.quaternion.slerp(finalRotation, 0.4);

  // --- B. 개별 손가락의 계층적 회전 ---
  const boneMapping = getBoneMapping();
  rightHandModel.traverse(bone => {
      if (!bone.isBone || !bone.parent?.isBone) return;

      const mapping = boneMapping[bone.name];
      if (!mapping) return;

      const startLm = worldLandmarks[mapping.startIdx];
      const endLm = worldLandmarks[mapping.endIdx];

      const worldDir = new THREE.Vector3().subVectors(endLm, startLm).normalize();
      const parentInv = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      const localDir = worldDir.clone().applyQuaternion(parentInv);

      // [기본 회전] 뼈의 꼬임을 방지하고 기본적인 굽힘을 계산
      let quat = new THREE.Quaternion().setFromUnitVectors(mapping.axis, localDir);

      // --- [핵심] 새끼손가락 MCP 뼈에 대한 벌어짐(Abduction) 보정 ---
      if (bone.name === 'pinky_mcp') {
          // 1. 보조 벡터 계산:
          //    - '손바닥 측면 방향' 벡터: 약지(13)에서 새끼(17) 랜드마크로 향하는 벡터.
          //      이는 새끼손가락이 벌어지는 기준 방향이 됩니다.
          const ringMcpLm = worldLandmarks[13];
          const palmSideVector = new THREE.Vector3().subVectors(pinkyMcpLm, ringMcpLm).normalize();

          //    - '새끼손가락 방향' 벡터: 월드 공간에서의 `worldDir`
          //    - '보조 Up 벡터': 손등 방향인 `targetUp`을 그대로 사용

          // 2. lookAt을 이용한 보조 회전 계산:
          //    '손등'을 위로 한 채, '손바닥 측면 방향'을 바라보도록 하는 회전을 계산합니다.
          const lookAtMatrix = new THREE.Matrix4().lookAt(
              new THREE.Vector3(), // 원점
              palmSideVector,      // 바라볼 방향
              targetUp             // 상향 벡터
          );
          const abductionQuat = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);

          // 3. 월드 공간의 보조 회전을 로컬 공간으로 변환
          abductionQuat.premultiply(parentInv);

          // 4. 최종 회전값 결합:
          //    기존 회전(quat)을 보조 회전(abductionQuat)과 결합하여 최종 결과 도출
          //    slerp를 사용하여 두 회전을 부드럽게 섞습니다. 강도(0.5)를 조절하여 효과를 테스트할 수 있습니다.
          quat.slerp(abductionQuat, 1); // 강도(alpha)를 0.1 ~ 1.0 사이에서 조절해보세요.
      }

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
  