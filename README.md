# Padlock
A minimal open source password manager built with [Polymer](http://www.polymer-project.org/).

Check out the live demo [here](http://maklesoft.github.io/padlock).

**Note:** You'll need a modern browser. Chrome or Safari works best. IE is not supported at this time. *Make sure to try it on your iPhone or Chrome for Android!*

## Contributing
Contributions are more than welcome!

- If you want to report a bug or suggest a new feauture, you can do so in the [issues section](https://github.com/MaKleSoft/padlock/issues)
- If you want to contribute directly by committing changes, please follow the usual steps:
    1. Fork the repo
    2. Create your feature branch: git checkout -b my-feature-branch
    3. Commit your changes: git commit -m 'Some meaningful commit message'
    4. Push to the branch: git push origin my-feature-branch
    5. Submit a pull request!

## Dev Setup

Install these if you haven't yet:

- [Node.js and npm](http://nodejs.org/)
- [Grunt](http://gruntjs.com/)
- [Bower](http://bower.io/)
- [Compass](http://compass-style.org/)

Now from inside the project folder, install the local requirements:

    npm install
    bower install

Before you can run the app for the first time, you will have to compile the `.scss` files.

    grunt compass

For the [HTML Imports](http://www.polymer-project.org/platform/html-imports.html) polyfill of Polymer to work, the app has to be served on a local web server. To start one, simply type

    grunt connect

You should now be able to see a working version of the app at `0.0.0.0:8000` If you want the web server to listen on a different address or port, simply adjust the Gruntfile accordingly.

Finally, before you start coding you should start the 'watch' task, which will automatically compile `.scss` files and run unit tests whenever you make changes to relevant files:

    grunt watch

That's it! Happy coding!

## What's next

A couple of things that we are planning for the near future:

- A simple integrated password generator
- Creating backups
- Export to CSV (and possibly other open formats)
- Quick delete in list view
- Cloud synchronization
- End-to-end testing
