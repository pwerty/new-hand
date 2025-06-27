
function getBoneMapping() {
    // [수정: fingerAxis 재조정]
    // 손가락이 힘을 잃고 뭉쳐 있다면, 뼈의 '기본 방향'이 랜드마크의 '직선' 방향과
    // 거의 반대이거나, 너무 '구부러진' 상태로 정의되었을 가능성이 큽니다.
    // Three.js 모델에서 뼈의 '정확한' 기본 축을 찾는 것이 중요합니다.
    // Rigify 기준 Y축은 뼈의 길이 방향을 가리키며, 휴식 자세에서 대부분의 관절이 0도를 향합니다.
    // 따라서 (0, 1, 0) 또는 (0, -1, 0) 둘 중 하나가 되어야 합니다.
    // '힘을 잃고 뭉쳐 있다'는 것은 아마 (0, -1, 0)이 너무 구부러진 포즈로 해석되었을 수 있습니다.
    // (0, 1, 0)으로 다시 시도하여 손가락이 펴지는지 확인합니다.
    const fingerAxis = new THREE.Vector3(0, 1, 0); 

    // 엄지는 다른 손가락처럼 위아래로만 접히는 것이 아니라, 손바닥을 가로지르며 회전합니다.
    // 이전에 (0,0,-1)로 설정하여 엄지가 잘 작동했다면 유지합니다.
    // 만약 엄지도 힘을 잃는다면 (0,1,0)으로 변경해볼 수 있습니다.
    const thumbAxis = new THREE.Vector3(0, 0, -1); 

    return {
        // "블렌더 뼈 이름": { startIdx, endIdx, axis }

        // 손바닥 (palm_x 뼈들은 손가락 뼈와 같은 축을 공유할 수 있습니다.)
        'palm_thumb':  { startIdx: 0, endIdx: 1, axis: fingerAxis },
        'palm_index':  { startIdx: 0, endIdx: 5, axis: fingerAxis },
        'palm_middle': { startIdx: 0, endIdx: 9, axis: fingerAxis }, // <-- fingerAxis로 변경 필요
        'palm_ring':   { startIdx: 0, endIdx: 13, axis: fingerAxis },
        'palm_pinky':  { startIdx: 0, endIdx: 17, axis: fingerAxis },
        
        // 엄지
        'thumb_cmc': { startIdx: 1, endIdx: 2, axis: thumbAxis },
        'thumb_mcp': { startIdx: 2, endIdx: 3, axis: thumbAxis },
        'thumb_ip':  { startIdx: 3, endIdx: 4, axis: thumbAxis },
        
        // 검지 (fingerAxis 적용)
        'index_mcp': { startIdx: 5, endIdx: 6, axis: fingerAxis },
        'index_pip': { startIdx: 6, endIdx: 7, axis: fingerAxis },
        'index_dip': { startIdx: 7, endIdx: 8, axis: fingerAxis },

        // 중지 (fingerAxis 적용)
        'middle_mcp': { startIdx: 9,  endIdx: 10, axis: fingerAxis },
        'middle_pip': { startIdx: 10, endIdx: 11, axis: fingerAxis },
        'middle_dip': { startIdx: 11, endIdx: 12, axis: fingerAxis },

        // 약지 (fingerAxis 적용)
        'ring_mcp': { startIdx: 13, endIdx: 14, axis: fingerAxis },
        'ring_pip': { startIdx: 14, endIdx: 15, axis: fingerAxis },
        'ring_dip': { startIdx: 15, endIdx: 16, axis: fingerAxis },

        // 새끼손가락 (fingerAxis 적용)
        'pinky_mcp': { startIdx: 17, endIdx: 18, axis: fingerAxis },
        'pinky_pip': { startIdx: 18, endIdx: 19, axis: fingerAxis },
        'pinky_dip': { startIdx: 19, endIdx: 20, axis: fingerAxis },
    };
}






/**
 * 손가락 뭉침, 엄지 각도, 클리핑 문제를 해결하기 위한 최종 버전
 */
/**
 * 거울 모드, 손가락 꺾임 방향, 손 전체 회전이 모두 보정된 최종 버전
 */
function applyLandmarks(landmarks) {

    if (!rightHandModel || !landmarks || landmarks.length < 21) return;

    const worldLandmarks = landmarks.map(lm => new THREE.Vector3(-lm.x, -lm.y, -lm.z).multiplyScalar(1.5));

    // --- A. 손 전체 위치 및 방향 설정 (안정성이 검증된 코드 유지) ---
    rightHandModel.position.lerp(worldLandmarks[0], 0.6);

    const wrist = worldLandmarks[0];
    const middleMcp = worldLandmarks[9];
    const indexMcp = worldLandmarks[5];
    const pinkyMcp = worldLandmarks[17];

    const targetForward = new THREE.Vector3().subVectors(middleMcp, wrist).normalize();
    const targetRight = new THREE.Vector3().subVectors(indexMcp, pinkyMcp).normalize();
    const palmUp = new THREE.Vector3().crossVectors(targetForward, targetRight).normalize(); // 손바닥의 '위'

    const modelAxisY = new THREE.Vector3(0, 1, 0); // 모델의 '앞'
    const finalRotation = new THREE.Quaternion().setFromUnitVectors(modelAxisY, targetForward);
    const rotatedModelUp = new THREE.Vector3(0, 0, 1).applyQuaternion(finalRotation); // 모델의 '위'
    const twistCorrect = new THREE.Quaternion().setFromUnitVectors(rotatedModelUp, palmUp);
    finalRotation.premultiply(twistCorrect);
    rightHandModel.quaternion.slerp(finalRotation, 0.4);

    // --- B. 개별 손가락 회전 (손가락 종류별로 로직 분리) ---
    const boneMapping = getBoneMapping(); // Blender 분석 결과가 담긴 맵

    rightHandModel.traverse(bone => {
        if (!bone.isBone || !bone.parent?.isBone) return;

        const mapping = boneMapping[bone.name];
        if (!mapping) return;
        
        const startLm = worldLandmarks[mapping.startIdx];
        const endLm = worldLandmarks[mapping.endIdx];
        if (!startLm || !endLm) return;

        const parentWorldQuat = new THREE.Quaternion();
        bone.parent.getWorldQuaternion(parentWorldQuat);
        const parentInv = parentWorldQuat.clone().invert();

        const worldDir = new THREE.Vector3().subVectors(endLm, startLm).normalize();
        const localDir = worldDir.clone().applyQuaternion(parentInv);

        let finalQuat;

        // --- 엄지손가락 로직 (스윙-트위스트) ---
        if (bone.name.includes('thumb')) {
            // 스윙: 길이축(mapping.length)을 목표 방향(localDir)으로 정렬
            const swingQuat = new THREE.Quaternion().setFromUnitVectors(mapping.length, localDir);

            // 트위스트: 엄지 고유의 '위' 방향을 사용
            // 엄지의 '위'는 손바닥의 '앞' 방향에 가까움 (모델의 로컬 공간으로 변환)
            const boneRestUp = new THREE.Vector3(0, 0, 1); // 엄지 모델의 기본 '위' 방향 (Blender에서 확인 필요!)
            const swungUp = boneRestUp.clone().applyQuaternion(swingQuat);

            // 엄지가 가져야 할 '위' 방향 (손바닥의 '앞' 방향을 부모 로컬로 변환)
            const targetUpLocal = targetForward.clone().applyQuaternion(parentInv);

            // 돌아간 '위'를 목표 '위'에 맞추는 트위스트 회전
            const twistQuat = new THREE.Quaternion().setFromUnitVectors(swungUp, targetUpLocal);
            
            finalQuat = swingQuat.premultiply(twistQuat);

        } else { // --- 2,3,4,5번 손가락 로직 (90도 롤 해결) ---
            // 1단계: 길이 축 정렬 (Aiming)
            const swingQuat = new THREE.Quaternion().setFromUnitVectors(mapping.length, localDir);

            // 2단계: 굽힘 축 정렬 (Rolling)
            // '스윙'만 적용했을 때 뼈의 굽힘축(mapping.hinge)이 어디를 향하는지 계산
            const swungHinge = mapping.hinge.clone().applyQuaternion(swingQuat);
            
            // 뼈가 최종적으로 가져야 할 '굽힘 축'의 이상적인 방향을 계산합니다.
            // **[핵심 수정]** 이 굽힘 축은 '길이 방향'과 '손바닥의 오른쪽 방향'에 수직이어야 합니다.
            const targetHinge = new THREE.Vector3().crossVectors(localDir, targetRight.clone().applyQuaternion(parentInv)).normalize();

            // 돌아가 있는 굽힘축(swungHinge)을 이상적인 굽힘축(targetHinge)으로 맞추는 '롤' 회전
            const rollQuat = new THREE.Quaternion().setFromUnitVectors(swungHinge, targetHinge);
            
            // 최종 회전 = 롤 보정 후 스윙 적용
            finalQuat = swingQuat.premultiply(rollQuat);
        }

        bone.quaternion.slerp(finalQuat, 0.7);
    });
}