var gulp = require("gulp"),
    stylus = require("gulp-stylus"),
    nib = require("nib"),
    watch = require("gulp-watch"),
    argv = require("yargs").argv,
    qunit = require("gulp-qunit");

gulp.task("stylus", function () {
    if (argv.watch) {
        watch({glob: "src/**/*.less"}, function(files) {
            return files
                .pipe(stylus({use: [nib()]}))
                .pipe(gulp.dest("./src"));
        });
    } else {
        gulp.src("./src/**/*.styl")
            .pipe(stylus({use: [nib()]}))
            .pipe(gulp.dest("./src"));
    }
});

gulp.task("test", function() {
    return gulp.src("./test/runner.html")
        .pipe(qunit());
});