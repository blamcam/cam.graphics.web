function watchScroll(selector) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const isAboveViewport = entry.boundingClientRect.top < 0;

            if (entry.isIntersecting || isAboveViewport) {
                $(entry.target).addClass('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });

    $(selector).each(function() {
        observer.observe(this);
    });

    return () => observer.disconnect();
}

export { watchScroll };