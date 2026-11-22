import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

function loadFBX(path, material, onLoaded) {

    const loader = new FBXLoader();

    loader.load(
        path,

        (fbx) => {

            fbx.traverse((child) => {

                if (child.isMesh) {

                    child.material = material;

                    child.castShadow = true;
                    child.receiveShadow = true;

                }

            });

            // Centre model
            const bounds = new THREE.Box3().setFromObject(fbx);
            const center = bounds.getCenter(new THREE.Vector3());

            fbx.position.sub(center);

            // Scale model
            const size = bounds.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);

            fbx.scale.setScalar(2 / maxDimension);

            onLoaded(fbx);

        },

        (progress) => {
            console.log('Loading FBX:', progress);
        },

        (error) => {
            console.error('FBX loading error:', error);
        }
    );
}

export { loadFBX };