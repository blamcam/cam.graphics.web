function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }

        const timeout = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);

        function onAbort() {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
        }

        signal.addEventListener('abort', onAbort, { once: true });
    });
}

function typewriter() {
    const controller = new AbortController();
    const signal = controller.signal;

    async function run() {
        const parents = document.querySelectorAll('.typewriter');

        for (const pa of parents) {
            if (signal.aborted) return;

            const elements = Array.from(pa.querySelectorAll('p, h2')).map(el => {
                const speed = parseInt(el.getAttribute('data-speed'), 10) || 1;
                const chars = parseInt(el.getAttribute('data-chars'), 10) || 5;

                const original = el.cloneNode(true);

                el.innerHTML = '';

                return { el, original, speed, chars };
            });

            pa.classList.add('typewriter-started');

            for (const item of elements) {
                await typeElement(item, signal);
            }

            if (!signal.aborted) {
                pa.classList.add('typewriter-complete');
            }
        }
    }

    run().catch(error => {
        if (error.name !== 'AbortError') {
            console.error('Typewriter error:', error);
        }
    });

    return () => {
        console.log('Typewriter cleanup triggered');
        controller.abort();
    };
}

async function typeElement(item, signal) {
    for (const node of Array.from(item.original.childNodes)) {
        await typeNode(node, item.el, item.speed, item.chars, signal);
    }
}

async function typeNode(node, parent, speed, chars, signal) {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;

        for (let i = 0; i < text.length; i += chars) {
            if (signal.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }

            parent.appendChild(
                document.createTextNode(text.substring(i, i + chars))
            );

            await delay(speed, signal);
        }

    } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node.cloneNode(false);
        parent.appendChild(element);

        for (const child of node.childNodes) {
            await typeNode(child, element, speed, chars, signal);
        }
    }
}

export { typewriter };