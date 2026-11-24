import Matter from 'matterJs';

const {
    Engine,
    Bodies,
    Body,
    Composite,
    Query,
    Sleeping
} = Matter;


function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function initPaperPhysics() {




    const engine = Engine.create({
        gravity: {
            x: 0,
            y: 1,
            scale: 0.003
        }
    });
    Matter.Events.on(engine, 'beforeUpdate', applyScrollForce);

    engine.positionIterations = 8;
    engine.velocityIterations = 6;

    const overlay = document.createElement('div');
    overlay.className = 'paper-physics-layer';
    document.body.appendChild(overlay);

    const papers = new Map();

    let boundaries = [];
    let animationFrame;
    let activeDrag = null;
    let lastFrameTime = performance.now();

    const paperSize = 65;
    const paperRadius = 30;
    const wallThickness = 200;

    // Create invisible walls around the viewport.
    function updateBounds() {
        boundaries.forEach(body => Composite.remove(engine.world, body));
        boundaries = [];

        const width = window.innerWidth;
        const height = window.innerHeight;
        const wall = wallThickness;

        boundaries = [
            // Left
            Bodies.rectangle(
                -wall / 2, height / 2,
                wall, height + wall * 2,
                { isStatic: true }
            ),

            // Right
            Bodies.rectangle(
                width + wall / 2, height / 2,
                wall, height + wall * 2,
                { isStatic: true }
            ),

            // Top
            Bodies.rectangle(
                width / 2, -wall / 2,
                width + wall * 2, wall,
                { isStatic: true }
            ),

            // Bottom
            Bodies.rectangle(
                width / 2, height + wall / 2,
                width + wall * 2, wall,
                { isStatic: true }
            )
        ];

        Composite.add(engine.world, boundaries);

        // Keep existing paper inside the resized viewport.
        papers.forEach(({ body }) => {
            Body.setPosition(body, {
                x: clamp(body.position.x, paperRadius, width - paperRadius),
                y: clamp(body.position.y, paperRadius, height - paperRadius)
            });
        });
    }

    // Convert a physics body position into a DOM transform.
    function updatePaperElements() {
        papers.forEach(({ body, element }) => {
            element.style.transform =
                `translate3d(${body.position.x}px, ${body.position.y}px, 0) ` +
                `translate(-50%, -50%) rotate(${body.angle}rad)`;
        });
    }

    // Create the static crumpled paper physics object.
    function createPaperBall(x, y) {
        const body = Bodies.polygon(
            x,
            y,
            8,
            paperRadius,
            {
                restitution: 0.3,
                friction: 0.75,
                frictionStatic: 0.9,
                frictionAir: 0.025,
                density: 0.0015,
                chamfer: { radius: 4 }
            }
        );

        const element = document.createElement('img');
        element.className = 'paper-ball';
        element.src = `/assets/paper-ball-${randomInt(1,4)}.webp`;
        element.alt = '';
        element.draggable = false;

        element.style.width = `${paperSize}px`;
        element.style.height = `${paperSize}px`;

        overlay.appendChild(element);

        Composite.add(engine.world, body);

        papers.set(body.id, { body, element });

        // A little random movement so the balls don't all land identically.
        Body.setVelocity(body, {
            x: random(-6, 6),
            y: random(-3, 0)
        });

        Body.setAngularVelocity(body, random(-0.14, 0.14));

        return body;
    }

    // Play the crumpling sprite animation, then spawn the physics object.
    function playCrumple(x, y) {
        const animation = document.createElement('div');
        animation.className = 'paper-crumple';

        animation.style.left = `${x}px`;
        animation.style.top = `${y}px`;

        overlay.appendChild(animation);

        let finished = false;

        const finish = () => {
            if (finished) return;
            finished = true;

            animation.remove();
            createPaperBall(x, y);
        };

        animation.addEventListener('animationend', finish, { once: true });

        // Fallback in case the animation event doesn't fire.
        window.setTimeout(finish, 850);
    }

    // Capture the element's position BEFORE removing its open state.
    function crumpleElement(element) {
        const rect = element.getBoundingClientRect();

        if (!rect.width || !rect.height) return;

        playCrumple(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );
    }

    // Direct pointer interaction.
    function pointerDown(e) {
        if (e.button !== 0) return;

        const point = { x: e.clientX, y: e.clientY };
        const bodies = [...papers.values()].map(paper => paper.body);
        const hits = Query.point(bodies, point);

        if (!hits.length) return;

        // Query.point returns overlapping bodies; use the last one.
        const body = hits[hits.length - 1];

        e.preventDefault();
        e.stopPropagation();

        const offset = {
            x: body.position.x - point.x,
            y: body.position.y - point.y
        };

        activeDrag = {
            body,
            pointerId: e.pointerId,
            offset,
            previousX: e.clientX,
            previousY: e.clientY,
            previousTime: e.timeStamp,
            velocityX: 0,
            velocityY: 0
        };

        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        Sleeping.set(body, false);
    }

    function pointerMove(e) {
        if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;

        e.preventDefault();

        const drag = activeDrag;
        const now = e.timeStamp;
        const elapsed = Math.max(1, now - drag.previousTime);

        // Keep a recent velocity sample for the eventual throw.
        drag.velocityX = (e.clientX - drag.previousX) / elapsed * 16.667;
        drag.velocityY = (e.clientY - drag.previousY) / elapsed * 16.667;

        drag.previousX = e.clientX;
        drag.previousY = e.clientY;
        drag.previousTime = now;

        // Move the body directly with the pointer.
        Body.setPosition(drag.body, {
            x: e.clientX + drag.offset.x,
            y: e.clientY + drag.offset.y
        });

        Body.setVelocity(drag.body, { x: 0, y: 0 });
        Body.setAngularVelocity(drag.body, 0);
    }

    function pointerUp(e) {
        if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;

        const drag = activeDrag;
        activeDrag = null;

        // Clamp the throw so a fast mouse movement doesn't launch it miles away.
        Body.setVelocity(drag.body, {
            x: clamp(drag.velocityX * 1.2, -25, 25),
            y: clamp(drag.velocityY * 1.2, -25, 25)
        });

        // Add a little spin based on horizontal movement.
        Body.setAngularVelocity(
            drag.body,
            clamp(drag.velocityX * 0.003, -0.15, 0.15)
        );
    }

    let lastScrollY = window.scrollY;
    let pendingScrollForce = 0;

    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    const scrollForce = isMobile ? 0.0007 : 0.0015;

    function handleScroll() {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;

        lastScrollY = currentScrollY;

        // Accumulate downward scrolling.
        if (scrollDelta > 0) {
            pendingScrollForce += Math.min(scrollDelta, 20);
        }
    }

    function applyScrollForce() {
        if (pendingScrollForce <= 0) return;

        const force = Math.min(pendingScrollForce, 40) * scrollForce;
        pendingScrollForce = 0;

        papers.forEach(({ body }) => {
            if (!body || body.isStatic || body === activeDrag?.body) return;

            Body.applyForce(body, body.position, {
                x: (Math.random() - 0.5) * force * 0.8,
                y: -force
            });

            // Add a little random spin.
            Body.setAngularVelocity(
                body,
                body.angularVelocity + random(-0.05, 0.05)
            );
        });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Only intercept pointer events when a paper ball is actually grabbed.
    document.addEventListener('pointerdown', pointerDown, true);
    document.addEventListener('pointermove', pointerMove, true);
    document.addEventListener('pointerup', pointerUp, true);
    document.addEventListener('pointercancel', pointerUp, true);

    // Main physics/render loop.
    function update(time) {
        const delta = Math.min(time - lastFrameTime, 33.333);
        lastFrameTime = time;

        
        Engine.update(engine, delta);
        updatePaperElements();

        animationFrame = requestAnimationFrame(update);
    }

    updateBounds();
    animationFrame = requestAnimationFrame(update);

    window.addEventListener('resize', updateBounds);

    return {
        crumpleElement,

        destroy() {
            cancelAnimationFrame(animationFrame);

            window.removeEventListener('resize', updateBounds);
            window.removeEventListener('scroll', handleScroll);
            Matter.Events.off(engine, 'beforeUpdate', applyScrollForce);

            document.removeEventListener('pointerdown', pointerDown, true);
            document.removeEventListener('pointermove', pointerMove, true);
            document.removeEventListener('pointerup', pointerUp, true);
            document.removeEventListener('pointercancel', pointerUp, true);


            Engine.clear(engine);
            overlay.remove();
            papers.clear();
        }
    };
}

export { initPaperPhysics };