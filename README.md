# Padlock
A minimal open source password manager.

**If you just want to use the app, we recommend downloading one of the [official releases](https://github.com/maklesoft/padlock/releases).**

However, if you want to get your hands dirty and contribute or build your own version from source, read on!

## Getting Started

1. First, you'll need [Node.js and npm](http://nodejs.org/). Install it if you haven't yet.
2. Clone or download the source code. E.g.:
    ```sh
    git clone git@github.com:MaKleSoft/padlock.git
    ```
3. Install the local dependencies.
    ```sh
    cd padlock
    npm install
    ```

## Start The App

```sh
npm run start
```

## Compiling TypeScript files

The core logic (everything under `app/src/core`) is implement in TypeScript, which needs to be compiled to
JavaScript before running the app. This happens automatically when you run `npm install`. You can also run the
compilation step individually in case you want to make any changes to the core:

```sh
npm run compile
```

## Debugging

The recommended way to debug is to serve the app on a local webserver since this does not require any
major build steps. To do this, run

```sh
npm run debug
```

This command will also automatically watch changes to any TypeScript files and automatically recompile the
core if necessary.

## Testing

To run tests:

```sh
npm run test
```

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
