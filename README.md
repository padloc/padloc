# Padlock
A minimal open source password manager built with [Polymer](http://www.polymer-project.org/).

## Dev Setup

Install these if you haven't yet:

- [Node.js and npm](http://nodejs.org/)
- [Gulp](http://gulpjs.com/)
- [Bower](http://bower.io/)

Now from inside the project folder, install the local requirements:

    npm install
    bower install

For the [HTML Imports](http://www.polymer-project.org/platform/html-imports.html) polyfill of Polymer to work, the app has to be served on a local web server. You can use whatever web server you prefer to serve the files. For example:

    python -m SimpleHTTPServer 8000

## Compling css files

Padlock uses the [Stylus](http://learnboost.github.io/stylus/) as a CSS preprocessor. Most style sheets are maintained as `.styl` files and compiled locally. To compile all `.styl` files to CSS, run the corresponding gulp task

    gulp stylus

You can also use the `--watch` flag to tell the gulp task to watch all `.styl` files and recompile them whenever any of them changes.

    gulp stylus --watch

## Linting

Any pull request need to pass our linting rules, which are defined in the `.jshintrc` file. To lint all JS files, run the corresponding gulp task

    gulp lint

Again, you can use the `--watch` flag to let the task watch all JS (and HTML) files and relint any JavaScript that might have changed.

## Testing

We maintain tests for the core modules in the `test` directory. Before you submit a pull request, make sure to run the tests first. Again, there is a gulp task for this.

    gulp test

## Contributing
Contributions are more than welcome!

- If you want to report a bug or suggest a new feauture, you can do so in the [issues section](https://github.com/MaKleSoft/padlock/issues)
- If you want to contribute directly by committing changes, please follow the usual steps:
    1. Fork the repo
    2. Create your feature branch: git checkout -b my-feature-branch
    3. Make sure to lint your code before you commit! (`gulp lint`)
    4. Commit your changes: git commit -m 'Some meaningful commit message'
    5. Push to the branch: git push origin my-feature-branch
    6. Submit a pull request!
