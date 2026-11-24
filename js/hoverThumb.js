function hoverThumbs() {
    const thumbnail = document.querySelector('.hover-thumbnail');
    const thumbnailImage = thumbnail.querySelector('img');

    const links = document.querySelectorAll('[data-thumbnail]');

    let mouseX = 0;
    let mouseY = 0;
    let frameRequested = false;

    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            if (e.originalEvent.pointerType === 'mouse') {
                const image = link.dataset.thumbnail;

                if (thumbnailImage.getAttribute('src') !== image) {
                    thumbnailImage.src = image;
                }

                thumbnail.classList.add('active');
            }
        });

        link.addEventListener('mouseleave', () => {
            thumbnail.classList.remove('active');
        });

        link.addEventListener('click', () => {
            thumbnail.classList.remove('active');
        });
    });

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!frameRequested) {
            frameRequested = true;

            requestAnimationFrame(() => {
                thumbnail.style.transform =
                    `translate3d(${mouseX}px, ${mouseY}px, 0)`;

                frameRequested = false;
            });
        }
    });
}

export { hoverThumbs };