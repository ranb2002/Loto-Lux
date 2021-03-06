'use strict';

var gulp = require('gulp'),
    del = require('del'),
    csslint = require('gulp-csslint'),
    tsc = require('gulp-typescript'),
    environments = require('gulp-environments'),
    concat = require('gulp-concat'),
    purify = require('gulp-purifycss'),
    sourcemaps = require('gulp-sourcemaps'),
    tslint = require('gulp-tslint'),
    uglify = require('gulp-uglify'),
    runSequence = require('run-sequence'),
    nodemon = require('gulp-nodemon'),
    gulpTypings = require('gulp-typings'),
    builder = require('systemjs-builder'),
    browserSync = require('browser-sync').create(),
    remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul'),
    Server = require('karma').Server,
    util = require('gulp-util'),
    exec = require('child_process').exec;

var development = environments.development;
var production = environments.production;
var ENV = production() ? 'production' : 'development';
console.log('gulpfile.js - ' + ENV);

var tscConfigServer = require('./server/tsconfig.json');
var tscConfigClient = require('./client/tsconfig.json');

//BEGIN - Typings **************************************************************
gulp.task('typings', ['typings:server', 'typings:client']);

gulp.task('typings:server', function (callback) {
  return gulp
    .src('server/typings.json')
    .pipe(gulpTypings());
});

gulp.task('typings:client', function (callback) {
  return gulp
    .src('client/typings.json')
    .pipe(gulpTypings());
});
//END - Typings ****************************************************************

//BEGIN - Clean ****************************************************************
gulp.task('clean', ['clean:coverage', 'clean:dist']);

gulp.task('clean:coverage', (cb) => { return del(['coverage'], cb); });
gulp.task('clean:dist', (cb) => { return del(['dist'], cb); });
gulp.task('clean:dist-server', (cb) => { return del(['dist/server'], cb); });
gulp.task('clean:dist-client', (cb) => { return del(['dist/client'], cb); });
//END - Clean ******************************************************************

//BEGIN - Lint *****************************************************************
gulp.task('tslint:server', () => {
  return gulp
    .src(['server/src/**/*.ts', '!server/src/**/*.spec.ts'])
    .pipe(tslint({ formatter: 'prose' }))
    .pipe(tslint.report());
});

gulp.task('tslint:client', () => {
  return gulp
    .src(['client/app/**/*.ts', '!client/app/**/*.spec.ts'])
    .pipe(tslint({ formatter: 'prose' }))
    .pipe(tslint.report());
});

gulp.task('tslint:specs', () => {
  return gulp
    .src(['server/src/**/*.spec.ts', 'client/app/**/*.spec.ts'])
    .pipe(tslint({ formatter: 'prose' }))
    .pipe(tslint.report());
});

gulp.task('tslint:css-composants', () => {
  return gulp
    .src('client/app/components/**/*.css')
    .pipe(csslint('.csslintrc'))
    .pipe(csslint.formatter());
});
//END - Lint *******************************************************************

//BEGIN - Compilation **********************************************************
function compile(tscConfig) {
  return gulp
    .src(tscConfig.filesGlob)
    .pipe(sourcemaps.init())
    .pipe(tsc(tscConfig.compilerOptions))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(tscConfig.compilerOptions.outDir));
}

gulp.task('compile', ['compile:server', 'compile:client']);

gulp.task('compile:server', ['tslint:server'], function () {
  return compile(tscConfigServer);
});

gulp.task('compile:client', ['tslint:client'], function(){
  return compile(tscConfigClient);
});

//END - Compilation ************************************************************

//BEGIN - Ressources ***********************************************************
gulp.task('ressources', function(callback) {
  runSequence(
    'ressources:fonts', 'ressources:html',
    'ressources:images', 'ressources:scripts',
    'ressources:css', callback);
});

//  CSS ************************************************************************
gulp.task('ressources:css', ['ressources:css-global', 'ressources:css-composants']);

var optionsPurify = {
  minify: true,
  info: false,
  rejected: false,
  whitelist: [
    '*numeros*'
  ]
};
gulp.task('ressources:css-global', function() {
  return gulp
    .src(['client/css/*.css', '!client/css/font-awesome.css'])
    .pipe(production(
      purify(['dist/client/app/**/*.js',
        'dist/client/scripts/**/*.js',
        'dist/client/**/*.html'], optionsPurify)
     ))
    .pipe(concat('global.min.css'))
    .pipe(gulp.dest('dist/client/css'));
});

gulp.task('ressources:css-composants', ['tslint:css-composants'], function() {
  return gulp
    .src('client/app/components/**/*.css')
    .pipe(production(
      purify(['dist/client/app/**/*.js',
        'dist/client/scripts/**/*.js',
        'dist/client/**/*.html'], optionsPurify)
     ))
    .pipe(gulp.dest('dist/client/app/components'));
});

//  Fonts **********************************************************************
gulp.task('ressources:fonts', function() {
  return gulp
    .src('client/fonts/**/*')
    .pipe(gulp.dest('dist/client/fonts'));
});

//  Html ***********************************************************************
gulp.task('ressources:html', function() {
  return gulp
    .src('client/**/*.html')
    .pipe(gulp.dest('dist/client'));
});

//  Images *********************************************************************
gulp.task('ressources:images', function() {
  return gulp
    .src('client/images/**/*')
    .pipe(gulp.dest('dist/client/images'));
});

//  scripts ********************************************************************
gulp.task('ressources:scripts', [
  'ressources:scripts-min',
  'ressources:scripts-systemjs',
  'ressources:scripts-ie9'
]);

gulp.task('ressources:scripts-systemjs', function() {
  return gulp
    .src([
      'client/scripts/systemjs.config.js'
    ])
    .pipe(gulp.dest('dist/client/scripts'));
});

gulp.task('ressources:scripts-min', function() {
  return gulp
    .src([
      'client/scripts/jquery.js',
      'client/scripts/bootstrap.min.js',
      'client/scripts/bootstrap-year-calendar.js',
      'client/scripts/bootstrap-year-calendar.fr.js',
      'client/scripts/jquery.isotope.min.js',
      'client/scripts/wow.min.js',
      '!client/scripts/systemjs.config.js',
      '!client/scripts/html5shiv.js',
      '!client/scripts/respond.min.js'
    ])
    .pipe(concat('scripts.min.js'))
    .pipe(production(uglify()))
    .pipe(gulp.dest('dist/client/scripts'));
});

gulp.task('ressources:scripts-ie9', function() {
  return gulp
    .src([
      'client/scripts/html5shiv.js',
      'client/scripts/respond.min.js'
    ])
    .pipe(concat('ie9.min.js'))
    .pipe(production(uglify()))
    .pipe(gulp.dest('dist/client/scripts'));
});
//END - Ressources *************************************************************

//BEGIN - Librairies ***********************************************************
gulp.task('libraries', ['libraries:js', 'libraries:map']);

gulp.task('libraries:js', () => {
  return gulp.src([
    'core-js/client/shim.+(js|min.js)',
    'zone.js/dist/zone.js',
    'reflect-metadata/Reflect.js',
    'systemjs/dist/system.src.js',

    '@angular/core/bundles/core.umd.js',
    '@angular/common/bundles/common.umd.js',
    '@angular/compiler/bundles/compiler.umd.js',
    '@angular/platform-browser/bundles/platform-browser.umd.js',
    '@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.js',
    '@angular/http/bundles/http.umd.js',
    '@angular/router/bundles/router.umd.js',
    '@angular/forms/bundles/forms.umd.js',

    'moment/min/moment-with-locales.min.js',
    'angular2-moment/*.js',

    'angular2-jwt/angular2-jwt.js'
  ], {cwd: 'node_modules/**'})
    .pipe(gulp.dest('dist/client/libs'));
});

gulp.task('libraries:map', () => {
  return gulp
    .src([
      'core-js/client/shim.min.js.map',
      'reflect-metadata/Reflect.js.map',
      'angular2-moment/*.js.map',
      'angular2-moment/src/*.ts',
      'angular2-jwt/angular2-jwt.js.map'
    ], {cwd: 'node_modules/**'})
    .pipe(gulp.dest('dist/client/libs'));
});
//END - Librairies *************************************************************

//BEGIN - Test *****************************************************************
gulp.task('test', ['clean:coverage', 'unit-test']);

gulp.task('unit-test', (done) => {
  util.log(__dirname + '/karma.conf.js');
  new Server({
    configFile: __dirname + '/karma.conf.js'
  }, karmaDone).start();

  function karmaDone (exitCode) {
    remapCoverage(done, exitCode);
  }

  function remapCoverage (done, exitCode) {
    gulp.src('coverage/coverage.json')
      .pipe(remapIstanbul({
        reports: {
          'lcovonly': 'coverage/lcov.info',
          'json': 'coverage/coverage.json',
          'html': 'coverage',
          'text-summary': 'coverage/text-summary.txt'
        }
      }))
      .on('finish', function () {
        exec('correct-coverage', () => done(exitCode));
      });
  }
});

//END - Test *******************************************************************

//BEGIN - Watch ****************************************************************
function watch(done) {
  browserSync.reload();
  done();
}

function reload(fichier) {
  util.log('[Client] Resource file ' + fichier.path + ' has been changed. Updating.');
  gulp.src(fichier.path, {base:'client'}).pipe(gulp.dest('dist/client'));
  browserSync.reload(fichier);
}

gulp.task('watch', function () {
  browserSync.init({
    proxy: 'http://localhost:3000',
    port: 7000
  });

  gulp.watch(['server/**/*.ts'], ['watch-compile:server']).on('change', function (e) {
    util.log('[Server] TypeScript file ' + e.path + ' has been changed. Compiling.');
  });

  gulp.watch(['client/**/*.ts'], ['watch-compile:client']).on('change', function (e) {
    util.log('[Client] TypeScript file ' + e.path + ' has been changed. Compiling.');
  });

  gulp.watch(['client/**/*.css'], ['ressources:css']).on('change', reload);
  gulp.watch(['client/scripts/**/*.js'], ['ressources:scripts']).on('change', reload);
  gulp.watch(['client/images/**/*'], ['ressources:images']).on('change', reload);
  gulp.watch(['client/**/*.html'], ['ressources:html']).on('change', reload);
});

gulp.task('watch-compile:server', ['compile:server'], watch);
gulp.task('watch-compile:client', ['compile:client'], watch);
//END - Watch ******************************************************************

// Start the express server with nodemon
gulp.task('start', function () {
  nodemon({script: 'dist/server/server.js',
    ext: 'js',
    delay: '5000', //ms
    watch: 'dist'})
    .on('restart', function () {
      util.log('Server restarted!');
    })
    .once('quit', function () {
      process.exit();
    });
});

//Build the server for production
gulp.task('build', function (callback) {
  runSequence('clean', 'typings', 'compile', 'ressources', 'libraries', callback);
});
