import * as THREE from 'three';

function createDiffractionMaterial(
{

    map = null,
    color = 0xffffff,
    metallic = 0,
    smoothness = 0.85,
    distance = 1600,
    intensity = 1

} = {}) {

    const material = new THREE.MeshStandardMaterial({

        color: color,
        map: map,

        metalness: metallic,
        roughness: 1 - smoothness

    });


    material.onBeforeCompile = (shader) => {

        // ------------------------------------------
        // UNIFORMS
        // ------------------------------------------

        shader.uniforms.uDiffractionDistance = {
            value: distance
        };

        shader.uniforms.uDiffractionIntensity = {
            value: intensity
        };

        shader.uniforms.uLightDirection = {
            value: new THREE.Vector3()
        };

        shader.uniforms.uLightColor = {
            value: new THREE.Color()
        };

        shader.uniforms.uLightIntensity = {
            value: 1
        };


        // ------------------------------------------
        // VERTEX SHADER
        // ------------------------------------------

        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `
            #include <common>

            varying vec2 vDiffractionUv;

            varying vec3 vDiffractionAxisX;
            varying vec3 vDiffractionAxisZ;

            varying vec3 vDiffractionWorldPosition;
            `
        );


        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>

            // Pass UV coordinates to fragment shader

            vDiffractionUv = uv;

            // Transform tangent axes into world space

            mat3 objectToWorld = mat3(modelMatrix);

            vDiffractionAxisX = objectToWorld *
                vec3(1.0, 0.0, 0.0);

            vDiffractionAxisZ = objectToWorld *
                vec3(0.0, 0.0, 1.0);

            // World position

            vDiffractionWorldPosition =
                (modelMatrix * vec4(transformed, 1.0)).xyz;
            `
        );


        // ------------------------------------------
        // FRAGMENT SHADER
        // ------------------------------------------

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>

            varying vec2 vDiffractionUv;

            varying vec3 vDiffractionAxisX;
            varying vec3 vDiffractionAxisZ;

            varying vec3 vDiffractionWorldPosition;

            uniform float uDiffractionDistance;
            uniform float uDiffractionIntensity;

            uniform vec3 uLightDirection;
            uniform vec3 uLightColor;
            uniform float uLightIntensity;


            // --------------------------------------
            // ZUCCONI SPECTRAL APPROXIMATION
            // --------------------------------------

            vec3 bump3y(vec3 x, vec3 yoffset) {

                vec3 y = 1.0 - x * x;

                return max(y - yoffset, 0.0);
            }


            vec3 spectral_zucconi6(float w) {

                // Wavelength range: 400 - 700 nm

                float x = clamp(
                    (w - 400.0) / 300.0,
                    0.0,
                    1.0
                );

                const vec3 c1 = vec3(
                    3.54585104,
                    2.93225262,
                    2.41593945
                );

                const vec3 x1 = vec3(
                    0.69549072,
                    0.49228336,
                    0.27699880
                );

                const vec3 y1 = vec3(
                    0.02312639,
                    0.15225084,
                    0.52607955
                );

                const vec3 c2 = vec3(
                    3.90307140,
                    3.21182957,
                    3.96587128
                );

                const vec3 x2 = vec3(
                    0.11748627,
                    0.86755042,
                    0.66077860
                );

                const vec3 y2 = vec3(
                    0.84897130,
                    0.88445281,
                    0.73949448
                );

                return
                    bump3y(c1 * (x - x1), y1) +
                    bump3y(c2 * (x - x2), y2);
            }


            // --------------------------------------
            // DIFFRACTION CALCULATION
            // --------------------------------------

            vec3 calculateDiffraction(
                vec3 L,
                vec3 V,
                vec3 T
            ) {

                float cosThetaL = dot(L, T);
                float cosThetaV = dot(V, T);

                float u = abs(
                    cosThetaL - cosThetaV
                );

                if (u < 0.00001) {
                    return vec3(0.0);
                }

                vec3 diffractionColor = vec3(0.0);

                for (int n = 1; n <= 8; n++) {

                    float wavelength =
                        u * uDiffractionDistance / float(n);

                    diffractionColor +=
                        spectral_zucconi6(wavelength);
                }

                return clamp(
                    diffractionColor,
                    0.0,
                    1.0
                );
            }
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <metalnessmap_fragment>',
            `
            #include <metalnessmap_fragment>

            metalnessFactor *= (1.0 - diffuseColor.a);
            `
        );


        // ------------------------------------------
        // ADD DIFFRACTION TO FINAL LIGHTING
        // ------------------------------------------

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            `
            // World-space viewing direction

            vec3 diffractionView = normalize(
                cameraPosition - vDiffractionWorldPosition
            );

            // Calculate tangent direction per fragment
            // rather than interpolating it from vertices

            vec2 uvCentered = vDiffractionUv * 2.0 - 1.0;

            vec2 uvDirection = normalize(
                uvCentered + vec2(0.000001)
            );

            vec3 diffractionTangent = normalize(
                -uvDirection.y * vDiffractionAxisX +
                 uvDirection.x * vDiffractionAxisZ
            );

            // Light direction

            vec3 diffractionLight = normalize(
                uLightDirection
            );

            // Calculate spectral diffraction

            vec3 diffraction = calculateDiffraction(
                diffractionLight,
                diffractionView,
                diffractionTangent
            );

            // Apply diffraction to the PBR material
            // diffuseColor.a contains the albedo texture alpha

            outgoingLight +=
                diffraction *
                uLightColor *
                uLightIntensity *
                uDiffractionIntensity *
                (1.0 - diffuseColor.a);

            #include <opaque_fragment>
            `
        );


        // Store uniforms for external updates

        material.userData.diffractionUniforms = shader.uniforms;

    };


    material.customProgramCacheKey = () =>
        'diffraction-material-v2';

    return material;
}

function updateDiffractionLight(diffractionMat, directionalLight) {
	const tempDirection = new THREE.Vector3();

    const uniforms = diffractionMat.userData.diffractionUniforms;

    if (!uniforms) return;

    // Direction from the surface towards the light

    tempDirection.subVectors(
        directionalLight.position,
        directionalLight.target.position
    ).normalize();

    uniforms.uLightDirection.value.copy(tempDirection);

    uniforms.uLightColor.value.copy(
        directionalLight.color
    );

    uniforms.uLightIntensity.value =
        directionalLight.intensity;
}


export { createDiffractionMaterial, updateDiffractionLight };