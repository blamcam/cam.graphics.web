import { cleanupDraggers } from './draggers.js';

function navigation(initPage, cleanupPage) {
    const content = document.querySelector('.main');

    let isNavigating = false;

    function markActiveLinks(url) {
    	document.querySelectorAll('a').forEach(link => {
    	  if (link.href === window.location.href) {
    	    link.classList.add('active');
    	    link.setAttribute('aria-current', 'page'); // Recommended for accessibility
    	  }
    	});
    }

    function cleanupActiveLinks() {
    	document.querySelectorAll('a.active').forEach(link => {
    	    link.classList.remove('active');
    	    link.removeAttribute('aria-current');
    	});
    }

    async function navigate(url, addHistory = true) {
        if (isNavigating) return;

        isNavigating = true;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Navigation failed: ${response.status}`);
            }

            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const newContent = doc.querySelector('.main');

            if (!newContent) {
                throw new Error('Could not find .main');
            }

            // Resolve relative asset URLs against the destination page.
            newContent.querySelectorAll('[src], [href], [srcset]').forEach(element => {
                ['src', 'href', 'srcset'].forEach(attribute => {
                    const value = element.getAttribute(attribute);

                    if (!value) return;

                    if (attribute === 'srcset') {
                        const resolved = value.split(',').map(source => {
                            const parts = source.trim().split(/\s+/);
                            parts[0] = new URL(parts[0], url).href;
                            return parts.join(' ');
                        });

                        element.setAttribute(attribute, resolved.join(', '));
                    } else {
                        element.setAttribute(
                            attribute,
                            new URL(value, url).href
                        );
                    }
                });
            });

            cleanupPage();

            content.innerHTML = newContent.innerHTML;

            document.title = doc.title;
            document.querySelector('meta[name="description"]').content = doc.querySelector('meta[name="description"]').content;
            document.querySelector('meta[property="og:description"]').content = doc.querySelector('meta[property="og:description"]').content;
            document.body.classList = doc.body.classList;

            if (addHistory) {
                history.pushState({}, '', url);
            }

            cleanupActiveLinks();
            markActiveLinks(url);

            window.scrollTo(0, 0);

            initPage();

        } catch (error) {
            console.error(error);

            // Fall back to normal navigation if AJAX fails.
            window.location.href = url;

        } finally {
            isNavigating = false;
        }
    }

    // Intercept normal internal link clicks.
    document.addEventListener('click', e => {

        // Respect existing event handlers.
        if (e.defaultPrevented) return;

        // Only handle normal left clicks.
        if (e.button !== 0) return;

        // Don't interfere with modifier keys.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const link = e.target.closest('a[href]');

        if (!link) return;

        // Ignore links that explicitly opt out.
        if (link.hasAttribute('data-no-ajax')) return;

        // Ignore downloads and new tabs.
        if (link.hasAttribute('download')) return;
        if (link.target && link.target !== '_self') return;

        const url = new URL(link.href, window.location.href);

        // Ignore external links.
        if (url.origin !== window.location.origin) return;

        // Let normal hash navigation happen.
        if (
            url.pathname === window.location.pathname &&
            url.search === window.location.search &&
            url.hash
        ) return;

        e.preventDefault();

        navigate(url.href);

    });

    // Handle browser back and forward.
    window.addEventListener('popstate', () => {
        navigate(window.location.href, false);
    });
}

export { navigation };