/**
 * Fun little confetti popper based on https://codepen.io/coopergoeke/pen/wvaYMbJ
 * Original idea and implementation by Cooper Goeke (http://coopergoeke.com/)
 */

import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { mixins } from "../styles";

// helper function to pick a random number within a range
function randomRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

// helper function to get initial velocities for confetti
// this weighted spread helps the confetti look more realistic
function initConfettoVelocity(xRange: [number, number], yRange: [number, number]) {
    const x = randomRange(xRange[0], xRange[1]);
    const range = yRange[1] - yRange[0] + 1;
    let y = yRange[1] - Math.abs(randomRange(0, range) + randomRange(0, range) - range);
    if (y >= yRange[1] - 1) {
        // Occasional confetto goes higher than the max
        y += Math.random() < 0.25 ? randomRange(1, 3) : 0;
    }
    return { x: x, y: -y };
}

type Vector = {
    x: number;
    y: number;
};

type Confetto = {
    color: { front: string; back: string };
    dimensions: Vector;
    position: Vector;
    rotation: number;
    scale: Vector;
    velocity: Vector;
    randomModifier: number;
};

type Sequin = {
    color: string;
    radius: number;
    position: Vector;
    velocity: Vector;
};

@customElement("pl-confetti")
export class Confetti extends LitElement {
    @property({ type: Number })
    confettiCount = 30;

    @property({ type: Number })
    sequinCount = 20;

    @property({ type: Number })
    gravityConfetti = 0.2;

    @property({ type: Number })
    gravitySequins = 0.4;

    @property({ type: Number })
    dragConfetti = 0.06;

    @property({ type: Number })
    dragSequins = 0.02;

    @property({ type: Number })
    terminalVelocity = 2;

    @property({ attribute: false })
    colors = [
        { front: "#2185d0", back: "#00b5ad" }, // Blueish
        { front: "#db2828", back: "#f2711c" }, // Reddish
        { front: "#6435c9", back: "#a333c8" }, // Purpleish
    ];

    private _confetti: Confetto[] = [];

    private _sequins: Sequin[] = [];

    @query("canvas")
    private _canvas: HTMLCanvasElement;

    private _nextTick: number | null = null;

    // add elements to arrays to be drawn
    async pop() {
        if (!this._canvas) {
            await this.updateComplete;
        }

        if (this._nextTick) {
            window.cancelAnimationFrame(this._nextTick);
        }

        this._canvas.width = this.offsetWidth;
        this._canvas.height = this.offsetHeight;

        this._confetti = [];
        this._sequins = [];

        for (let i = 0; i < this.confettiCount; i++) {
            this._confetti.push(this._initConfetto());
        }
        for (let i = 0; i < this.sequinCount; i++) {
            this._sequins.push(this._initSequin());
        }

        this._tick();
    }

    private _initConfetto(): Confetto {
        return {
            color: this.colors[Math.floor(randomRange(0, this.colors.length))],
            dimensions: {
                x: randomRange(5, 9),
                y: randomRange(8, 15),
            },
            position: {
                x: this._canvas.width / 2,
                y: this._canvas.height / 2,
            },
            rotation: randomRange(0, 2 * Math.PI),
            scale: {
                x: 1,
                y: 1,
            },
            velocity: initConfettoVelocity([-9, 9], [6, 11]),
            randomModifier: randomRange(0, 99),
        };
    }

    private _initSequin(): Sequin {
        return {
            color: this.colors[Math.floor(randomRange(0, this.colors.length))].back,
            radius: randomRange(1, 2),
            position: {
                x: this._canvas.width / 2,
                y: this._canvas.height / 2,
            },
            velocity: {
                x: randomRange(-6, 6),
                y: randomRange(-8, -12),
            },
        };
    }

    private _updateConfetto(confetto: Confetto) {
        // apply forces to velocity
        confetto.velocity.x -= confetto.velocity.x * this.dragConfetti;
        confetto.velocity.y = Math.min(confetto.velocity.y + this.gravityConfetti, this.terminalVelocity);
        confetto.velocity.x += Math.random() > 0.5 ? Math.random() : -Math.random();

        // set position
        confetto.position.x += confetto.velocity.x;
        confetto.position.y += confetto.velocity.y;

        // spin confetto by scaling y and set the color, .09 just slows cosine frequency
        confetto.scale.y = Math.cos((confetto.position.y + confetto.randomModifier) * 0.09);
    }

    private _updateSequin(sequin: Sequin) {
        // apply forces to velocity
        sequin.velocity.x -= sequin.velocity.x * this.dragSequins;
        sequin.velocity.y = sequin.velocity.y + this.gravitySequins;

        // set position
        sequin.position.x += sequin.velocity.x;
        sequin.position.y += sequin.velocity.y;
    }

    // draws the elements on the canvas
    private _tick() {
        const ctx = this._canvas.getContext("2d")!;
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        this._confetti.forEach((confetto) => {
            let width = confetto.dimensions.x * confetto.scale.x;
            let height = confetto.dimensions.y * confetto.scale.y;

            // move canvas to position and rotate
            ctx.translate(confetto.position.x, confetto.position.y);
            ctx.rotate(confetto.rotation);

            // update confetto "physics" values
            this._updateConfetto(confetto);

            // get front or back fill color
            ctx.fillStyle = confetto.scale.y > 0 ? confetto.color.front : confetto.color.back;

            // draw confetto
            ctx.fillRect(-width / 2, -height / 2, width, height);

            // reset transform matrix
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        });

        this._sequins.forEach((sequin) => {
            // move canvas to position
            ctx.translate(sequin.position.x, sequin.position.y);

            // update sequin "physics" values
            this._updateSequin(sequin);

            // set the color
            ctx.fillStyle = sequin.color;

            // draw sequin
            ctx.beginPath();
            ctx.arc(0, 0, sequin.radius, 0, 2 * Math.PI);
            ctx.fill();

            // reset transform matrix
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        });

        // remove confetti and sequins that fall off the screen
        // must be done in seperate loops to avoid noticeable flickering
        this._confetti.forEach((confetto, index) => {
            if (confetto.position.y >= this._canvas.height) {
                this._confetti.splice(index, 1);
            }
        });
        this._sequins.forEach((sequin, index) => {
            if (sequin.position.y >= this._canvas.height) {
                this._sequins.splice(index, 1);
            }
        });

        if (this._sequins.length || this._confetti.length) {
            this._nextTick = window.requestAnimationFrame(() => this._tick());
        } else {
            ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            this._nextTick = null;
        }
    }

    static styles = [
        css`
            :host {
                display: block;
                pointer-events: none;
                ${mixins.fullbleed()};
                z-index: 9999;
            }
        `,
    ];

    render() {
        return html` <canvas></canvas> `;
    }
}
