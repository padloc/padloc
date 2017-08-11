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
npm run app
```

You can also run the app in debug mode:

```sh
npm run app -- --debug
```

## Compiling TypeScript files

The core logic (everything under `app/src/core`) is implement in TypeScript, which needs to be compiled to
JavaScript before running the app. This happens automatically when you run `npm install`. You can also run the
compilation step individually in case you want to make any changes to the core:

```sh
npm run compile
```

To watch files and compile automatically:

```sh
npm run compile -- --watch
```

## Testing / Linting

To lint JavaScript files:

```
npm run lint
```

To run tests:

```sh
npm run test
```

**Note:** The `npm run test` command uses headless Chrome, which means need to have
Google Chrome 59 or higher installed.

Alternatively, you can also run the tests in "visual mode":

```sh
npm run app -- --test
```

**Another Note:** For synchronization-related tests to pass, you need to have a padlock-cloud server running
in test mode. E.g.:

```sh
padlock-cloud --test &! npm run test
```

Details on how to install Padlock Cloud can be found [here](https://github.com/maklesoft/padlock-cloud#how-to-installbuild).

## Building for Desktop

To create a production build of the app for OSX, Windows or Linux, run:

```sh
npm run build:[platform]
```

Where platform is one of `mac`, `win`, or `linux`. E.g: To build the app for OSX:

```sh
npm run build:mac
```

This will generate a set of distrution-ready files under the `dist` directory.

**Note:** In order to build the app for Linux, you'll need to install icnsutils and graphicsmagick.

```sh
sudo apt install graphicsmagick icnsutils
```

## Building for Mobile

Apache Cordova is used to distribute Padlock on iOS and Android. The `cordova` subdirectory contains a
Cordova project with all appropriate configuration files and resources. The Cordova cli can be used to
build and run the app on iOS and Android devices or emulators. All Cordova commands need to be run from
the `cordova` subdirectory. Before running any commands like `cordova build`, make sure to run
`cordova prepare` once (after the first time you can omit it). For example, to run the app on an iOS device
or emulator:

```sh
cd cordova
cordova prepare
cordova run ios
```

See the [Apache Cordova documentation](http://cordova.apache.org/docs/en/latest/) for details.

**Note:** In order to build the app for Android, you'll need to install and setup the Android SDK.
Building for iOS is only possible on OSX and requires XCode.

## Contributing
Contributions are more than welcome!

- If you want to report a bug or suggest a new feauture, you can do so in the [issues section](https://github.com/MaKleSoft/padlock/issues)
- If you want to contribute directly by committing changes, please follow the usual steps:
    1. Fork the repo
    2. Create your feature branch: git checkout -b my-feature-branch
    3. Make sure to lint and test your code before you commit! (`npm run lint && npm run test`)
    4. Commit your changes: `git commit -m 'Some meaningful commit message'`
    5. Push to the branch: `git push origin my-feature-branch`
    6. Submit a pull request!
