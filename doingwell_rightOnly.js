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
/**
 * [수정 제안] Blender에서 직접 확인한 '뼈의 기본 축(axis)'을 반영해야 하는 함수
 */
function getBoneMapping() {
  // --- 중요 ---
  // 아래 axis 값은 Blender에서 직접 확인한 값으로 수정해야 합니다.
  // 예시: 뼈의 'Y축'이 뼈 길이를 따라 정렬되어 있다면 new THREE.Vector3(0, 1, 0)
  // 예시: 뼈의 'Z축'이 뼈 길이를 따라 정렬되어 있다면 new THREE.Vector3(0, 0, 1)

  // 일반 손가락(검지~새끼)의 기본 축 (Blender에서 확인한 값으로 변경)
  const fingerAxis = new THREE.Vector3(0, 1, 0); 

  // 엄지 손가락의 기본 축 (일반 손가락과 다를 수 있음. Blender에서 확인한 값으로 변경)
  const thumbAxis = new THREE.Vector3(0, 1, 0).normalize(); // 엄지는 X축일 가능성도 있습니다.

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
function applyLandmarks(landmarks) {
  if (!rightHandModel || !landmarks || landmarks.length < 21) return;

  const worldLandmarks = landmarks.map(lm => new THREE.Vector3(-lm.x, -lm.y, -lm.z).multiplyScalar(1.5));

  // --- A. 손 전체의 위치 및 방향 설정 (기존 안정적인 로직 유지) ---
  rightHandModel.position.lerp(worldLandmarks[0], 0.6);

  const wrist = worldLandmarks[0];       // 0
  const indexMcp = worldLandmarks[5];    // 5
  const middleMcp = worldLandmarks[9];   // 9
  const pinkyMcp = worldLandmarks[17];   // 17

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

  // --- B. 개별 손가락의 계층적 회전 (각도 직접 계산 방식 도입) ---
  const boneMapping = getBoneMapping(); // getBoneMapping은 여전히 뼈의 기본 축을 제공

  rightHandModel.traverse(bone => {
      if (!bone.isBone) return;

      const mapping = boneMapping[bone.name];
      if (!mapping) return;

      const parent = bone.parent;
      if (!parent || !parent.isBone) return;

      const startLm = worldLandmarks[mapping.startIdx];
      const endLm = worldLandmarks[mapping.endIdx];
      if (!startLm || !endLm) return;

      // 1. 월드 공간에서 뼈의 '방향 벡터' 계산
      const worldBoneDir = new THREE.Vector3().subVectors(endLm, startLm);

      // 2. 부모 뼈의 월드 회전을 가져와 역(inverse)을 취함
      const parentWorldQuat = parent.getWorldQuaternion(new THREE.Quaternion());
      const parentInvQuat = parentWorldQuat.clone().invert();
      const parentWorldMatrix = parent.matrixWorld;

      // 3. 뼈의 로컬 방향 벡터를 부모 뼈의 로컬 공간으로 변환
      // 이 로컬 벡터를 기준으로 각도 계산
      const localBoneDir = worldBoneDir.clone().applyQuaternion(parentInvQuat).normalize();

      let quat = new THREE.Quaternion();
      let euler = new THREE.Euler(0, 0, 0, 'YXZ'); // YXZ 오더가 일반적, 모델에 따라 조정 필요

      // --- [핵심] 각 뼈의 종류에 따라 Yaw, Pitch, Roll 각도 계산 적용 ---
      if (bone.name.includes('thumb')) {
          // 엄지: CMC, MCP, IP 관절의 복잡한 움직임
          // Unity 예시의 Yaw/Pitch 개념 적용 시도 (조정 필요)
          // 엄지 CMC (1-2) 뼈: 손바닥 평면 내에서의 움직임이 중요
          if (bone.name.includes('thumb_cmc')) {
              // 손목(0), 엄지CMC(1), 엄지MCP(2) 랜드마크를 활용
              const lm0 = worldLandmarks[0];
              const lm1 = worldLandmarks[1];
              const lm2 = worldLandmarks[2];
              
              // 엄지 CMC 관절의 Pitch (굴곡/신전)
              // lm0-lm1 벡터와 lm1-lm2 벡터 간의 각도를 이용
              const vec1 = new THREE.Vector3().subVectors(lm1, lm0).normalize();
              const vec2 = new THREE.Vector3().subVectors(lm2, lm1).normalize();
              // 이 두 벡터가 이루는 각도 (라디안)
              const anglePitch = vec1.angleTo(vec2);
              euler.x = anglePitch - Math.PI / 2; // 90도를 0점으로 가정 (조정 필요)

              // 엄지 CMC 관절의 Yaw (외전/내전)
              // 엄지CMC(1)에서 손목(0)으로 향하는 벡터와
              // 엄지CMC(1)에서 엄지MCP(2)로 향하는 벡터를
              // 손바닥의 XZ 평면에 투영하여 Yaw 각도를 계산
              const wristToCMC = new THREE.Vector3().subVectors(lm1, lm0);
              const CMCToMCP = new THREE.Vector3().subVectors(lm2, lm1);

              // 손바닥 평면 법선 (targetUp)에 대한 투영을 이용한 Yaw 추정
              const projectedWristToCMC = wristToCMC.clone().projectOnPlane(targetUp);
              const projectedCMCToMCP = CMCToMCP.clone().projectOnPlane(targetUp);
              
              // 이 두 투영된 벡터 간의 각도를 계산 (손목을 기준으로 엄지가 얼마나 벌어졌는지)
              const yawAngle = projectedWristToCMC.angleTo(projectedCMCToMCP);
              
              // Unity 예시의 getYawAngle/getPitchAngle 로직을 직접 적용하는 방식
              // 랜드마크 0,1,2를 이용해 뼈 1-2 (thumb_cmc)의 로컬 회전을 결정
              // 이 부분은 모델의 로컬 축 방향과 매우 밀접하게 관련됩니다.
              // Unity 코드의 `direction` 벡터는 뼈의 '로컬' 방향 벡터에 해당합니다.
              // `localBoneDir`을 사용해야 합니다.

              // [재해석] localBoneDir을 기준으로 yaw/pitch 계산
              const yawRad = Math.atan2(localBoneDir.z, localBoneDir.x); // YZ plane (Unity의 x2,y2가 localBoneDir.y, localBoneDir.z에 해당한다고 가정)
              const pitchRad = Math.atan2(localBoneDir.y, localBoneDir.z); // XY plane (Unity의 x2,y2가 localBoneDir.x, localBoneDir.y에 해당한다고 가정)
              
              euler.y = yawRad; // Y축 회전 (Yaw)
              euler.x = pitchRad; // X축 회전 (Pitch)

              // 롤(Roll)은 뼈의 길이 방향을 중심으로 하는 회전
              // 롤은 `setFromUnitVectors`가 잘 처리하거나, 별도의 계산 필요
              // 여기서는 `setFromUnitVectors`를 최종적으로 다시 사용하는 방향으로.
          } else { // 엄지 MCP, IP (2-3, 3-4) 뼈
              // 엄지 MCP와 IP는 주로 굴곡/신전 (Pitch)과 약간의 벌림(Yaw)이 있음
              const lm_prev = worldLandmarks[mapping.startIdx - 1]; // 이전 랜드마크 (관절의 중심)
              const lm_curr = worldLandmarks[mapping.startIdx];     // 현재 뼈의 시작 랜드마크
              const lm_next = worldLandmarks[mapping.endIdx];       // 현재 뼈의 끝 랜드마크 (다음 관절의 중심)

              // 관절 굴곡 각도 계산
              const vec_prev_curr = new THREE.Vector3().subVectors(lm_curr, lm_prev).normalize();
              const vec_curr_next = new THREE.Vector3().subVectors(lm_next, lm_curr).normalize();
              
              const angle_flexion = vec_prev_curr.angleTo(vec_curr_next);
              euler.x = angle_flexion - Math.PI; // 180도를 0으로 (폈을 때)
              // 엄지 뼈의 로컬 축에 따라 euler.x가 아닌 다른 축에 적용될 수도 있습니다.
              // 예를 들어, 엄지뼈의 굴곡이 Z축 회전일 수도 있습니다.
              // `Blender`에서 `modi.glb` 모델의 엄지 뼈 회전 축을 확인해야 합니다.
          }
      } 
      // 일반 손가락 (검지, 중지, 약지, 새끼)
      else if (bone.name.includes('_mcp')) {
          // MCP 뼈: 굴곡/신전 (Pitch)과 외전/내전 (Yaw/Roll)
          const lm_prev = worldLandmarks[bone.name.includes('index') ? 0 : 
                                         bone.name.includes('middle') ? 0 : 
                                         bone.name.includes('ring') ? 0 : 0]; // 손목 랜드마크 또는 이전 MCP 랜드마크
          const lm_curr = worldLandmarks[mapping.startIdx];
          const lm_next = worldLandmarks[mapping.endIdx];

          // 관절 굴곡 각도 계산 (Pitch)
          const vec_prev_curr = new THREE.Vector3().subVectors(lm_curr, lm_prev).normalize(); // 손목->MCP
          const vec_curr_next = new THREE.Vector3().subVectors(lm_next, lm_curr).normalize(); // MCP->PIP
          const angle_flexion = vec_prev_curr.angleTo(vec_curr_next);
          euler.x = angle_flexion - Math.PI; // 180도를 0으로 (폈을 때)
          
          // 외전/내전 (Yaw/Roll) 계산: Unity의 getAngleX와 유사한 개념
          // 손바닥의 XZ 평면(또는 targetRight 벡터)을 기준으로 각 손가락이 얼마나 벌어졌는지 추정
          const mcpToWrist = new THREE.Vector3().subVectors(lm_curr, wrist); // MCP에서 손목으로
          const projectedMcpToWrist = mcpToWrist.clone().projectOnPlane(targetUp); // 손등 평면에 투영

          // 각 손가락의 이상적인 벌림 방향 (Blender에서 모델 기준)
          // 예를 들어, 검지는 바깥쪽, 새끼손가락은 안쪽
          let idealLocalAbductionAxis = new THREE.Vector3(); // Placeholder
          if (bone.name.includes('index')) idealLocalAbductionAxis.set(1,0,0); // 로컬 X축 (벌림)
          else if (bone.name.includes('pinky')) idealLocalAbductionAxis.set(-1,0,0); // 로컬 X축 (오므림)
          // 중지, 약지는 0 (모델에 따라 조정)

          // Unity의 getAngleX와 유사한 방식으로 2D 각도 계산 (로컬 공간에서)
          // localBoneDir을 이용하여 Yaw 또는 Roll 각도를 추론
          // 예를 들어, localBoneDir의 X, Z 값을 이용해 Yaw (Y축 회전)
          const currentYaw = Math.atan2(localBoneDir.x, localBoneDir.z); // local X, Z plane for Yaw
          euler.y = currentYaw; // Y축 회전 (Yaw)
          
          // `setFromUnitVectors`를 최종 적용하여 뼈의 '꼬임' 방지
          const unitQuat = new THREE.Quaternion().setFromUnitVectors(mapping.axis, localBoneDir);
          quat.multiply(unitQuat); // 기본 방향을 맞추는 회전
          
          // 여기에 벌림 각도에 따른 추가적인 회전 적용
          const abductionAngle = currentYaw; // 추정된 벌림 각도
          if (bone.name.includes('index_mcp') || bone.name.includes('pinky_mcp')) {
              // Yaw 회전은 이미 localBoneDir에서 계산되었으므로,
              // 이제 손가락 벌림을 위한 Z축(Roll) 회전 적용 (모델의 로컬 Z축이 벌림 축이라고 가정)
              // 이 각도는 모델에 따라 조정이 매우 중요합니다.
              const rollForAbduction = abductionAngle * (bone.name.includes('index') ? 1 : -1) * 0.5; // 계수 0.5 조정
              const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollForAbduction); // Z축 회전
              quat.multiply(rollQuat); // 최종 쿼터니언에 적용
          }
      }
      else if (bone.name.includes('_pip') || bone.name.includes('_dip') || bone.name.includes('_ip')) {
          // PIP, DIP 뼈: 주로 굴곡/신전 (Pitch)
          const lm_prev = worldLandmarks[mapping.startIdx - 1]; // 이전 랜드마크 (관절의 중심)
          const lm_curr = worldLandmarks[mapping.startIdx];     // 현재 뼈의 시작 랜드마크
          const lm_next = worldLandmarks[mapping.endIdx];       // 현재 뼈의 끝 랜드마크 (다음 관절의 중심)

          const vec_prev_curr = new THREE.Vector3().subVectors(lm_curr, lm_prev).normalize();
          const vec_curr_next = new THREE.Vector3().subVectors(lm_next, lm_curr).normalize();
          
          const angle_flexion = vec_prev_curr.angleTo(vec_curr_next);
          euler.x = angle_flexion - Math.PI; // 180도를 0으로 (폈을 때)

          // `setFromUnitVectors`를 최종 적용하여 뼈의 '꼬임' 방지
          const unitQuat = new THREE.Quaternion().setFromUnitVectors(mapping.axis, localBoneDir);
          quat.copy(unitQuat); // 기본 방향을 맞추는 회전

      } else {
          // 나머지 뼈는 기본 `setFromUnitVectors` 로직 유지
          quat = new THREE.Quaternion().setFromUnitVectors(mapping.axis, localBoneDir);
      }
      
      // 최종 쿼터니언 적용 (slerp로 부드럽게)
      bone.quaternion.slerp(quat, 0.5); // slerp 값 조정 가능 (0.5는 부드러움)
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
  