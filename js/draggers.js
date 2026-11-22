
function draggers(selector) {
    document.querySelectorAll(selector).forEach(element => {
        let isDragging = false;
        let hasDragged = false;
        let suppressClick = false;
        let wasOpen = false;

        let startX = 0;
        let startY = 0;
        let initialX = 0;
        let initialY = 0;
        let currentX = 0;
        let currentY = 0;

        let pointerId = null;

        const dragThreshold = 5;

        element.style.translate = '0px 0px';
        element.style.cursor = 'grab';

        element.setAttribute('draggable', 'false');

        element.querySelectorAll('*').forEach(child => {
            child.setAttribute('draggable', 'false');
        });

        element.addEventListener('dragstart', e => {
            e.preventDefault();
        });

        element.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            if (window.matchMedia('(pointer: coarse)').matches) return;

            isDragging = true;
            hasDragged = false;
            pointerId = e.pointerId;

            startX = e.clientX;
            startY = e.clientY;

            initialX = currentX;
            initialY = currentY;
        });

        document.addEventListener('pointermove', e => {
            if (!isDragging || e.pointerId !== pointerId) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Check total movement from initial pointer position
            if (
                !hasDragged &&
                (Math.abs(deltaX) > dragThreshold ||
                 Math.abs(deltaY) > dragThreshold)
            ) {
                hasDragged = true;

                element.classList.add('dragging');
                element.style.cursor = 'grabbing';

                // Capture only once an actual drag begins
                element.setPointerCapture(pointerId);
            }

            if (hasDragged) {
                currentX = initialX + deltaX;
                currentY = initialY + deltaY;

                element.style.translate = `${currentX}px ${currentY}px`;
            }
        });

        element.addEventListener('pointerup', e => {
            if (!isDragging || e.pointerId !== pointerId) return;

            isDragging = false;
            suppressClick = hasDragged;

            element.style.cursor = 'grab';
            element.classList.remove('dragging');

            pointerId = null;
        });

        element.addEventListener('pointercancel', () => {
            isDragging = false;
            hasDragged = false;
            suppressClick = false;
            pointerId = null;

            element.style.cursor = 'grab';
            element.classList.remove('dragging');
        });

        // Capture clicks before they reach child links
        document.addEventListener('click', e => {
            if (!suppressClick) return;

            // Only suppress clicks associated with this draggable
            if (element.contains(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                suppressClick = false;
            }
        }, true);

        const resetDragPosition = () => {
            currentX = 0;
            currentY = 0;

            initialX = 0;
            initialY = 0;

            element.style.translate = '0px 0px';
        };

        // Watch for the open class being added
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

    });
}

export { draggers };
