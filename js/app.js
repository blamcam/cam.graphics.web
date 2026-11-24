import * as THREE from 'three';
import { $ } from "jquery";
window.$ = window.jQuery = $;


import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { createDiffractionMaterial, updateDiffractionLight } from './diffraction.js';

import { loadFBX } from './modelLoader.js';

import { navigation } from './navigation.js';

import { typewriter } from './typewriter.js';

import { watchScroll } from './scrollWatcher.js';

import { draggers, cleanupDraggers } from './draggers.js';

import { hoverThumbs } from './hoverThumb.js';

import { initPaperPhysics } from './paper.js';

import { openers, closeOpener, openOpener } from './opener.js';

const Clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

let pageCleanups = [];

// Starting angle for disc
const baseAngle = new THREE.Vector3(0.7,0.5,0.3);

// Amount to wobble the disc around over time
const wobbleMagnitude = 0.1;
const wobbleSpeed = 0.001;

// Speed to spin the disc when scrolling
const scrollSpin = 0.001;

// Mouse tracking and movement speed
const mouse = new THREE.Vector3;
const mouseRotationX = -0.5;
const mouseRotationY = 0.5;

// Scroll animation settings
const discCompactSize = 200;
const startScroll = 200;
const endScroll = 500;
const shrinkScroll = 500;

let sitePadding = 0;

const updateSitePadding = () => {
    const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize
    );

    const remValue = parseFloat(
        getComputedStyle(document.documentElement)
            .getPropertyValue('--site-padding')
    );

    // console.log(sitePadding);
    sitePadding = remValue * rootFontSize;
};

// --------------------------------------------------
// SCENE
// --------------------------------------------------

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight,false);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0); 

// renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const bloomResolution = new THREE.Vector2( 1024, 1024 );
// const bloomPass = new UnrealBloomPass( bloomResolution, 1.5, 0.4, 0.85 );
// composer.addPass( bloomPass );

// 2. Set up the EffectComposer
const renderScene = new RenderPass(scene, camera);

const bloomIntensity = 0.1;

const bloomPass = new UnrealBloomPass(
    bloomResolution,
    // new THREE.Vector2(window.innerWidth, window.innerHeight),
    bloomIntensity,   // strength (intensity)
    // 0.00,   // strength (intensity)
    0.0001,   // radius
    2.2   // threshold (luminance threshold)
);

// Modern Three.js requires an OutputPass for proper sRGB and tone mapping conversion
const outputPass = new OutputPass();

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(outputPass);

const container = document.getElementById('three-container');
let scrollScale = document.getElementById('scroll-scale');

container.appendChild(renderer.domElement);


// Set up lighting

const ambientLight = new THREE.HemisphereLight(
    0xffffff,
    0x34384b,
    1.2
);

scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    3
);

directionalLight.position.set(3, 5, 4);

scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(
    0xffffff,
    3
);

directionalLight2.position.set(-3, -5, -3);

scene.add(directionalLight2);

const discGroup = new THREE.Group();

scene.add(discGroup);

// --------------------------------------------------
// STUFF IN THE SCENE
// --------------------------------------------------

const textureLoader = new THREE.TextureLoader();

const albedoTexture = textureLoader.load(
    '/assets/cd-tex.png'
);

albedoTexture.colorSpace = THREE.SRGBColorSpace;

albedoTexture.wrapS = THREE.RepeatWrapping;
albedoTexture.wrapT = THREE.RepeatWrapping;

albedoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// Create materials

const diffractionMat = createDiffractionMaterial({
    map: albedoTexture,

    color: 0xffffff,
    metallic: 0.92,
    smoothness: 0.85,

    distance: 2400,
    intensity: 1
});

const transparentMat = new THREE.MeshStandardMaterial({
    map: albedoTexture,

    transparent: true,
    alphaTest: 0.001,

    metalness: 0.92,
    roughness: 0.0,

    side: THREE.DoubleSide
});

// Load model

let model = null;

loadFBX('/assets/cd.fbx', [ transparentMat, diffractionMat ], (fbx) => {
    model = fbx;

    model.position.y = 0.2;

    scene.add(model);
    discGroup.add(model);
});


// --------------------------------------------------
// DEBUG STUFF
// --------------------------------------------------

globalThis.exportPNG = function exportSceneAsPNG() {
  // renderer.render(scene, camera);
    composer.render();

  // 2. Convert the canvas to a Blob and trigger download
  renderer.domElement.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "scene.png";
    link.click();

    // Clean up memory
    URL.revokeObjectURL(url);
  }, 'image/png');
}


// --------------------------------------------------
// RESPONSIVE STUFF
// --------------------------------------------------

window.addEventListener('mousemove', (event) => {
    if (window.matchMedia('(pointer: coarse)').matches) {
        mouse.x = 0;
        mouse.y = 0;
    } else {
        // Normalize X and Y to the range -1 to +1
        mouse.x = ((event.clientX / window.innerWidth) * 2 - 1) * mouseRotationX;
        mouse.y = ((event.clientY / window.innerHeight) * 2 - 1)  * mouseRotationY;
    }
});


// Runs mainly on scroll events but also gets called when the window is resized
// Sets the size of the renderer container
function processContainerSize() {
    if (scrollScale !== null) {

        // console.log(window.scrollY + " , " + window.innerHeight);

        if (window.scrollY > window.innerHeight) {
            if (!document.body.classList.contains("scrolled")) {
                document.body.classList.add("scrolled");
            }
            if (document.body.classList.contains("home") && document.body.classList.contains("dark")) {
                document.body.classList.remove("dark");
            }
        } else {
            if (document.body.classList.contains("scrolled")) {
                document.body.classList.remove("scrolled");
            }
            if (document.body.classList.contains("home") && !document.body.classList.contains("dark")) {
                document.body.classList.add("dark");
            }
        }

        const containerHeight = window.innerHeight - sitePadding * 2;

        const scaleHeight = (1 - Clamp(window.scrollY / (containerHeight)));

        // scrollScale.style = "height:" + scaleHeight * containerHeight + "px";
        scrollScale.style = "transform: scaley(" + scaleHeight * 100 + "%)";
    }

   
}


// Runs after processContainerSize and recalcs the actual render viewport stuff
function handleRenderResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0 ||
        (renderer.width === width && renderer.height === height)) return;

    renderer.setSize(width, height, false);

    composer.passes[1].enabled = document.body.classList.contains('dark');

    const aspect = width / height;

    camera.aspect = aspect;

    // Increase FOV on tall viewports to keep the object contained.
    const baseFov = 45;
    const baseAspect = 1; // Square viewport
    const aspectFactor = Math.max(1, baseAspect / aspect);

    camera.fov = baseFov * aspectFactor;
    camera.updateProjectionMatrix();

    composer.render();

    updateSitePadding();
}


// Check if container is resized at all
const resizeObserver = new ResizeObserver(handleRenderResize);
resizeObserver.observe(container);

window.addEventListener('resize', processContainerSize);
window.addEventListener('scroll', processContainerSize, { passive: true });


// --------------------------------------------------
// INTERACTIVE FEATURES
// --------------------------------------------------

$(document).ready(function() {
    document.body.classList.add("loaded");
    updateSitePadding();
    processContainerSize();
});


function cleanupPage() {
    // Run cleanup functions returned by page scripts.
    pageCleanups.forEach(cleanup => cleanup());
    pageCleanups = [];

    // Clean up draggers inside page content only.
    const content = document.querySelector('#page-content');

    if (content) {
        cleanupDraggers(content);
    }
}

function initPage() {
    // Protect against accidentally initialising a page twice.
    cleanupPage();

    // Store cleanup functions.
    pageCleanups.push(typewriter());
    pageCleanups.push(watchScroll('.watch-scroll'));

    // Draggers have their own element-based cleanup system.
    draggers('.draggable');

    $('.expandable').off('click').on('click', function() {
        $(this).toggleClass('expanded');
    });

    scrollScale = document.getElementById('scroll-scale');
    document.body.classList.add("loaded");
}

initPage();

navigation(initPage, cleanupPage);

hoverThumbs();

const paperPhysics = initPaperPhysics();

openers(paperPhysics);
// openers();




// --------------------------------------------------
// FORM
// --------------------------------------------------

const form = document.getElementById('form');
const result = document.getElementById('result');

form.addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(form);
  const object = Object.fromEntries(formData);
  const json = JSON.stringify(object);
  result.innerHTML = "Please wait..."

    fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: json
        })
        .then(async (response) => {
            let json = await response.json();
            if (response.status == 200) {
                result.innerHTML = json.message;
            } else {
                console.log(response);
                result.innerHTML = json.message;
            }
        })
        .catch(error => {
            console.log(error);
            result.innerHTML = "Something went wrong!";
        })
        .then(function() {
            form.reset();
            closeOpener('#contact-menu', paperPhysics);
            openOpener('#thanks-menu')
            // setTimeout(() => {
            //     result.style.display = "none";
            // }, 3000);
        });
});

// --------------------------------------------------
// MAIN UPDATE FUNCTION
// --------------------------------------------------

function animate() {

    requestAnimationFrame(animate);

    updateDiffractionLight(diffractionMat, directionalLight);

    if (model) {
        
        const finalRotation = new THREE.Vector3();
        const wobbleRotation = new THREE.Vector3(Math.sin(performance.now() * wobbleSpeed) * wobbleMagnitude, Math.cos(performance.now() * wobbleSpeed) * wobbleMagnitude, Math.sin(performance.now() * wobbleSpeed) * wobbleMagnitude);
        finalRotation.addVectors(baseAngle, mouse); 
        finalRotation.addVectors(finalRotation, wobbleRotation); 

        const resultEuler = new THREE.Euler(finalRotation.x, finalRotation.y, finalRotation.z, 'XYZ');
        const resultQuat = new THREE.Quaternion().setFromEuler(resultEuler);
        discGroup.quaternion.slerp(resultQuat, 0.1);

        const discRotation = new THREE.Euler(0, window.scrollY * scrollSpin, 0, 'XYZ');
        model.quaternion.slerp(new THREE.Quaternion().setFromEuler(discRotation), 0.1);
    }

    // renderer.render(scene, camera);
    composer.render();

}

// --------------------------------------------------
// DONE
// --------------------------------------------------

animate();
