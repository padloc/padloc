import { css } from "lit-element";

export const animation = css`
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes slideIn {
        from {
            transform: translate(0, 50px);
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes rumble {
        25% {
            transform: translate(5px, 0);
        }
        50% {
            transform: translate(-5px, -3px);
        }
        75% {
            transform: translate(5px, 2px);
        }
    }

    @keyframes bounce {
        from,
        20%,
        40%,
        to {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }

        0% {
            transform: scale3d(0.5, 0.5, 0.5);
        }

        33% {
            transform: scale3d(1.05, 1.05, 1.05);
        }

        66% {
            transform: scale3d(0.98, 0.98, 0.98);
        }

        to {
            transform: scale3d(1, 1, 1);
        }
    }
`;
