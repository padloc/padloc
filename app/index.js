import './src/ui/app/app.js';
import '../@webcomponents/webcomponentsjs/webcomponents-bundle.js';
const $_documentContainer = document.createElement('template');
$_documentContainer.setAttribute('style', 'display: none;');

$_documentContainer.innerHTML = `<title>Padlock</title><style> html, body {
            background: #59c6ff;
            margin: 0;
        } </style><pl-app></pl-app>`;

document.head.appendChild($_documentContainer.content);
