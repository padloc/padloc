const defaults = {
    animation: "slideIn",
    duration: 500,
    easing: "ease",
    delay: 0,
    fill: "backwards",
    initialDelay: 0,
    fullDuration: 1000,
    clear: false,
    direction: "normal"
};

const clearAnimation = new Map<HTMLElement, number>();

export function animateElement(el: HTMLElement, opts = {}) {
    const { animation, duration, direction, easing, delay, fill, clear } = Object.assign({}, defaults, opts);
    clearTimeout(clearAnimation.get(el));
    el.style.animation = "";
    el.offsetLeft;
    el.style.animation = `${animation} ${direction} ${duration}ms ${easing} ${delay}ms ${fill}`;
    if (clear) {
        const clearDelay = typeof clear === "number" ? clear : 0;
        clearAnimation.set(el, window.setTimeout(() => (el.style.animation = ""), delay + duration + clearDelay));
    }

    return new Promise(resolve => setTimeout(resolve, delay + duration));
}

export function animateCascade(nodes: Iterable<Node | Element>, opts = {}) {
    const els = Array.from(nodes);
    const { fullDuration, duration, initialDelay } = Object.assign({}, defaults, opts);
    const dt = Math.max(30, Math.floor((fullDuration - duration) / els.length));

    const promises = [];
    for (const [i, e] of els.entries()) {
        promises.push(animateElement(e as HTMLElement, Object.assign(opts, { delay: initialDelay + i * dt })));
    }

    return Promise.all(promises);
}
