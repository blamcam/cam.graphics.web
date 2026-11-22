// function typewriter() {

//     const parents = document.querySelectorAll(".typewriter");

//     parents.forEach(async (pa) => {

//         const elements = Array.from(pa.querySelectorAll("p, h1, h2")).map(el => {

//             const text = el.getAttribute("data-text") || el.textContent;
//             const speed = parseInt(el.getAttribute("data-speed"), 10) || 1;
//             const chars = parseInt(el.getAttribute("data-chars"), 10) || 5;

//             el.textContent = "";

//             return { el, text, speed, chars };

//         });

//         for (const item of elements) {

//             await new Promise(resolve => {

//                 let i = 0;

//                 const type = () => {

//                     if (i < item.text.length) {

//                         const chunk = item.text.substring(i, i + item.chars);

//                         item.el.textContent += chunk;
//                         i += item.chars;

//                         setTimeout(type, item.speed);

//                     } else {
//                         resolve();
//                     }

//                 };

//                 type();

//             });

//         }

//     });

// }

function typewriter() {

    const parents = document.querySelectorAll(".typewriter");

    parents.forEach(async (pa) => {

        const elements = Array.from(pa.querySelectorAll("p, h2")).map(el => {

            const speed = parseInt(el.getAttribute("data-speed"), 10) || 1;
            const chars = parseInt(el.getAttribute("data-chars"), 10) || 5;

            // Store original HTML
            const original = el.cloneNode(true);

            // Clear element
            el.innerHTML = "";

            return { el, original, speed, chars };

        });

        for (const item of elements) {

            await typeElement(item);

        }

        pa.classList.add("typewriter-complete");

    });

}


async function typeElement(item) {

    const nodes = Array.from(item.original.childNodes);

    for (const node of nodes) {
        await typeNode(node, item.el, item.speed, item.chars);
    }

}


async function typeNode(node, parent, speed, chars) {

    if (node.nodeType === Node.TEXT_NODE) {

        const text = node.textContent;

        for (let i = 0; i < text.length; i += chars) {

            parent.appendChild(
                document.createTextNode(text.substring(i, i + chars))
            );

            await new Promise(resolve => setTimeout(resolve, speed));

        }

    } else if (node.nodeType === Node.ELEMENT_NODE) {

        const element = node.cloneNode(false);

        parent.appendChild(element);

        for (const child of node.childNodes) {
            await typeNode(child, element, speed, chars);
        }

    }

}

export { typewriter };