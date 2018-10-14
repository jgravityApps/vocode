var gulp = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    browserSync = require('browser-sync'),
    cssmin = require('gulp-cssmin'),
    cssv = require('gulp-csslint'),
    concat = require('gulp-concat'),
    imagemin = require('gulp-imagemin'),
    notify = require('gulp-notify'),
    plumber = require('gulp-plumber'),
    pump = require('pump'),
    rename = require('gulp-rename'),
    //ssi = require('browsersync-ssi'),
    //tinyping = require('gulp-tinypng-compress'),
    //uglify = require('gulp-uglify'),
    uglify = require('gulp-uglify-es').default,
    //uglify = require('uglify-es'),
    //uglify = require('gulp-babel'),

    //replace = require('gulp-regex-replace'),
    replace = require('gulp-string-replace');
    sass = require('gulp-sass'),

    srcSCSSName = "custom.scss",
    srcJSName = "custom.js",
    srcSCSSPath = "./_resources/scss/",
    srcJSPath = "./_resources/js/",
    
    destCSSPath = "./html/assets/css/",
    destCSSName = "custom.css"
    destJSPath = "./html/assets/js/",
    destImgPath = "./html/assets/images/"
    ;

// default
gulp.task('default', ['css', 'js', 'img']);

// sass
gulp.task('sass', () => {
  gulp.src(srcSCSSPath + srcSCSSName)
    .pipe(sass({outputStyle: 'expanded'}))
    //.pipe(rename({suffix: '.css'}))
    .pipe(gulp.dest(srcSCSSPath));
});

/*/ concat
gulp.task('css.concat', () => {
  var plugins = [
  colorfunction,
  cssimport,
  cssvariables,
  mqpacker,
  nested,
  simplevars
  ];
  gulp.src(srcSCSSPath + '*.css')
  .pipe(plumber({
    errorHandler: notify.onError('Error: <%= error.message %>')
  }))
  .pipe(postcss(plugins))
  .pipe(concat(destCSSName))
  .pipe(gulp.dest(srcSCSSPath))
});*/

// cssmin
gulp.task('cssmin', () => {
  gulp.src(srcSCSSPath + destCSSName)
  .pipe(plumber({
    errorHandler: notify.onError('Error: <%= error.message %>')
  }))
  .pipe(autoprefixer({
    browsers: ['last 2 version'],
    grid: true
  }))
  .pipe(cssmin())
  .pipe(rename({suffix: 'All.min'}))
  .pipe(gulp.dest(destCSSPath))
  //.pipe(browserSync.stream())
});
 
// css
gulp.task('css', ['sass', /*'css.concat', */'cssmin']);


// just oneliner instead not-well uglify
var regexp = '(?!.*com)(//|//.*//).*$';
gulp.task('oneline', function(){
  gulp.src(srcJSPath + '*js')
      .pipe(replace(new RegExp('(?!.*\\.com)(//|//.*//).*$', 'mg'), '')) //del comments
      .pipe(replace(new RegExp('^( )+( )$', 'mg'), '')) // del w space
      .pipe(replace(new RegExp('\n+\n', 'mg'), '\n')) // del \n\n
      //.pipe(replace(new RegExp('\n', 'mg'), '')) // del \n ng for eel
      .pipe(rename({suffix: '.min'}))
      .pipe(gulp.dest(destJSPath));
});

// uglify
 var options = {
  parse: {
    expression: false
  },
  compress: false,
  compress: {
    properties: false,
    hoist_props: false,
    computed_props: false,
    collapse_vars: false,
  },
  output: {
    keep_quoted_props: true,
    quote_style: 3,
    quote_keys: true,
    //beautify: true,
    comments:true
  },
  mangle: false,
  mangle: {
    // mangle options
    properties: {
      keep_quoted: true,
    }
  },

  ecma: 6, // specify one of: 5, 6, 7 or 8
  keep_classnames: true,
  keep_fnames: true,
  ie8: false,
  module: true,
  safari10: false,
  toplevel: false,
  warnings: false
};
gulp.task('jsmin', (cb) => {
  pump(
    [
      gulp.src(srcJSPath + '*js'),
      uglify({ecma: 6, // specify one of: 5, 6, 7 or 8
        keep_classnames: true,
        keep_fnames: true,
        output: {
          beautify: true,
        }
      }),
      rename({suffix: '.min'}),
      gulp.dest(destJSPath)
    ],
    cb
  );
});

// js
gulp.task('js', ['oneline']);
//gulp.task('js', ['jsmin']);

// watch
gulp.task('watch', () => {
  gulp.watch(['js'], ['css']);
});

// imagemin
gulp.task('imagemin', () => {
  gulp.src(destImgPath + '*.{png,jpg,gif,svg}')
  .pipe(imagemin([
    imagemin.gifsicle({interlaced: true}),
    imagemin.jpegtran({progressive: true}),
    imagemin.optipng({optimizationLevel: 4}),
    imagemin.svgo({
      plugins: [
        {removeViewBox: false}
      ]
    })
  ]))
  .pipe(gulp.dest('docs/tmp/img/dist'))
});

// img
gulp.task('img', ['imagemin']);

// < tools >

// browser-sync
gulp.task('browser-sync', () => {
  browserSync({
    server: {
      baseDir: 'htdocs',
      middleware:[
        ssi({
          ext: '.html',
          baseDir: 'htdocs'
        })
      ]
    }
  });
});

// csslint
gulp.task('cssv', () => {
  gulp.src(srcSCSSPath + 'custom.min.css')
  .pipe(cssv({
    'adjoining-classes': false,
    'box-model': false,
    'box-sizing': false,
    'bulletproof-font-face': false,
    'compatible-vendor-prefixes': false,
    'empty-rules': true,
    'display-property-grouping': true,
    'duplicate-background-images': false,
    'duplicate-properties': true,
    'fallback-colors': false,
    'floats': false,
    'font-faces': false,
    'font-sizes': false,
    'gradients': false,
    'ids': false,
    'import': false,
    'important': false,
    'known-properties': true,
    'order-alphabetical': false,
    'outline-none': true,
    'overqualified-elements': false,
    'qualified-headings': false,
    'regex-selectors': false,
    'shorthand': false,
    'star-property-hack': false,
    'text-indent': false,
    'underscore-property-hack': false,
    'unique-headings': false,
    'universal-selector': false,
    'unqualified-attributes': false,
    'vendor-prefix': false,
    'zero-units': true
  }))
  .pipe(cssv.formatter('compact'))
});
