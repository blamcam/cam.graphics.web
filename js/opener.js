// function openers() {
//   document.querySelectorAll('[data-open]').forEach(trigger => {
//       trigger.addEventListener('click', e => {
//           e.preventDefault();

//           const target = document.querySelector(trigger.dataset.open);

//           if (target) {
//               target.classList.toggle('open');

//           }
//       });
//   });

// }

function openers(paperPhysics) {
    document.querySelectorAll('[data-open]').forEach(trigger => {
        trigger.addEventListener('click', e => {
            e.preventDefault();

            const target = document.querySelector(trigger.dataset.open);

            if (!target) return;

            const isClosing = target.classList.contains('open');

            if (isClosing) {
              console.log("closing....");
                paperPhysics.crumpleElement(target);
            }

            target.classList.toggle('open');
        });
    });

    document.addEventListener('click', e => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const opener = link.closest('.open');

        if (!opener) return;

        const shouldClose = link.closest('[data-close-on-link]');
        if (!shouldClose) return;

        closeOpener("#" + opener.id, paperPhysics);
    });
}

function closeOpener(element, paperPhysics) {
  const target = document.querySelector(element);

  if (!target) return;

  const isClosing = target.classList.contains('open');

  if (isClosing) {
    console.log("closing....");
      paperPhysics.crumpleElement(target);
      target.classList.toggle('open');
  }
}

function openOpener(element) {
  const target = document.querySelector(element);

  if (!target) return;

  const isClosing = target.classList.contains('open');

  if (!isClosing) {
    console.log("closing....");
      target.classList.toggle('open');
  }
}

export { openers, closeOpener, openOpener };