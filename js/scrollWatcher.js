const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    // True if currently in view OR already scrolled past above the viewport
    const isAboveViewport = entry.boundingClientRect.top < 0;

    if (entry.isIntersecting || isAboveViewport) {
      $(entry.target).addClass('in-view');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.5
});

function watchScroll(selector) {
// Attach the observer to every element with the class
  $(selector).each(function() {
    observer.observe(this);
  });
}

export { watchScroll };