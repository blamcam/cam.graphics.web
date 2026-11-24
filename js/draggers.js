const instances = new WeakMap();

function isInteractive(target) {
    return target.closest(
        'input, textarea, select, [contenteditable="true"], [data-no-drag]'
    );
}

function draggers(selector) {
    document.querySelectorAll(selector).forEach(element => {

        // Don't initialise elements that are already being managed.
        if (instances.has(element)) return;

        let isDragging = false;
        let hasDragged = false;
        let suppressClick = false;
        let wasOpen = element.classList.contains('open');

        let startX = 0;
        let startY = 0;
        let initialX = 0;
        let initialY = 0;
        let currentX = 0;
        let currentY = 0;

        let pointerId = null;

        const dragThreshold = 5;
        const controller = new AbortController();
        const { signal } = controller;

        element.style.translate = '0px 0px';
        element.style.cursor = 'grab';

        element.setAttribute('draggable', 'false');

        element.querySelectorAll('*').forEach(child => {
            child.setAttribute('draggable', 'false');
        });

        element.addEventListener('dragstart', e => {
            e.preventDefault();
        }, { signal });

        element.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            if (window.matchMedia('(pointer: coarse)').matches) return;
            if (isInteractive(e.target)) return;

            isDragging = true;
            hasDragged = false;
            pointerId = e.pointerId;

            startX = e.clientX;
            startY = e.clientY;

            initialX = currentX;
            initialY = currentY;

        }, { signal });

        document.addEventListener('pointermove', e => {
            if (!isDragging || e.pointerId !== pointerId) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            if (
                !hasDragged &&
                (Math.abs(deltaX) > dragThreshold ||
                 Math.abs(deltaY) > dragThreshold)
            ) {
                hasDragged = true;

                element.classList.add('dragging');
                element.style.cursor = 'grabbing';

                element.setPointerCapture(pointerId);
            }

            if (hasDragged) {
                currentX = initialX + deltaX;
                currentY = initialY + deltaY;

                element.style.translate = `${currentX}px ${currentY}px`;
            }

        }, { signal });

        document.addEventListener('pointerup', e => {
            if (!isDragging || e.pointerId !== pointerId) return;

            isDragging = false;
            suppressClick = hasDragged;

            element.style.cursor = 'grab';
            element.classList.remove('dragging');

            pointerId = null;

        }, { signal });

        document.addEventListener('pointercancel', e => {
            if (e.pointerId !== pointerId) return;

            isDragging = false;
            hasDragged = false;
            suppressClick = false;
            pointerId = null;

            element.style.cursor = 'grab';
            element.classList.remove('dragging');

        }, { signal });

        // Suppress clicks after dragging.
        document.addEventListener('click', e => {
            if (!suppressClick) return;

            if (element.contains(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                suppressClick = false;
            }

        }, { capture: true, signal });

        const resetDragPosition = () => {
            currentX = 0;
            currentY = 0;

            initialX = 0;
            initialY = 0;

            element.style.translate = '0px 0px';
        };

        // Watch for the open class being added.
        const observer = new MutationObserver(() => {
            const isOpen = element.classList.contains('open');

            if (isOpen && !wasOpen) {
                resetDragPosition();
            }

            wasOpen = isOpen;
        });

        observer.observe(element, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Store cleanup function for this element.
        instances.set(element, () => {
            controller.abort();
            observer.disconnect();

            element.classList.remove('dragging');
            element.style.cursor = '';

            isDragging = false;
            hasDragged = false;
            suppressClick = false;
            pointerId = null;
        });

    });
}

// Clean up draggable elements within a particular container.
function cleanupDraggers(container) {
    container.querySelectorAll('.draggable').forEach(element => {
        const cleanup = instances.get(element);

        if (cleanup) {
            cleanup();
            instances.delete(element);
        }
    });

    // Also handle the container itself if it's draggable.
    if (container.matches('.draggable')) {
        const cleanup = instances.get(container);

        if (cleanup) {
            cleanup();
            instances.delete(container);
        }
    }
}

export { draggers, cleanupDraggers };