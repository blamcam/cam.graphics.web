function hoverThumbs() {
  const thumbnail = document.querySelector('.hover-thumbnail');
  const thumbnailImage = thumbnail.querySelector('img');

  const links = document.querySelectorAll('[data-thumbnail]');

  links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        console.log("mouse enter");
          const image = link.dataset.thumbnail;

          if (thumbnailImage.src !== image) {
              thumbnailImage.src = image;
          }

          thumbnail.classList.add('active');
      });
  });

  document.addEventListener('mousemove', e => {
      thumbnail.style.left = `${e.clientX}px`;
      thumbnail.style.top = `${e.clientY}px`;
  });

  links.forEach(link => {
      link.addEventListener('mouseleave', () => {
          thumbnail.classList.remove('active');
      });
  });

}

export { hoverThumbs };