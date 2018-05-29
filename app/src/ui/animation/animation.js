import '../base/base.js';

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

padlock.AnimationMixin = (superClass) => {

    return class AnimationMixin extends superClass {

        static get properties() { return {
            animationOptions: {
                type: Object,
                value: () => { return {}; }
            }
        }; }

        animateElement(el, opts = {}) {
            const { animation, duration, direction, easing, delay, fill, clear } =
                Object.assign({}, defaults, this.animationOptions, opts);
            clearTimeout(el.clearAnimation);
            el.style.animation = "";
            el.offsetLeft;
            el.style.animation = `${animation} ${direction} ${duration}ms ${easing} ${delay}ms ${fill}`;
            if (clear) {
                const clearDelay = typeof clear === "number" ? clear : 0;
                el.clearAnimation = setTimeout(() => el.style.animation = "", delay + duration + clearDelay);
            }

            return new Promise((resolve) => setTimeout(resolve, delay + duration));
        }

        animateCascade(els, opts = {}) {
            const { fullDuration, duration, initialDelay } =
                Object.assign({}, defaults, this.animationOptions, opts);
            const dt = Math.max(30, Math.floor((fullDuration - duration) / els.length));

            const promises = [];
            for (const [i, e] of els.entries()) {
                promises.push(this.animateElement(e, Object.assign(opts, { delay: initialDelay + i * dt })));
            }

            return Promise.all(promises);
        }

    };
};
