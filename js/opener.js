function openers() {
  document.querySelectorAll('[data-open]').forEach(trigger => {
      trigger.addEventListener('click', e => {
          e.preventDefault();

          const target = document.querySelector(trigger.dataset.open);

          if (target) {
              target.classList.toggle('open');

          }
      });
  });

}

export { openers };