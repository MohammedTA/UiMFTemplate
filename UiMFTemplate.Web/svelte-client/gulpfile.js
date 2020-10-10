/* eslint-disable no-console */

/*
Available commands:
1. `gulp watch`
2. `gulp watch --minify`
3. `gulp build`
*/

// Compilation process:
// 1. build svelte components and copy them to "./build" (the build is done with typescript compilation)
// 2. compile compile-app-ts and move it to "../wwwroot/js/app.js"
// 3. compile all ["scr/**/*.scss", "src/**/*.css"] files and move them to "../wwwroot/css/main.css"
// 4. move all files from "./wwwroot" to "../wwwroot".

const gulp = require("gulp"),
	gulpSvelte = require("gulp-svelte"),
	sourcemaps = require("gulp-sourcemaps"),
	rollup = require("rollup"),
	tsc = require("typescript"),
	rollupTypescript = require("rollup-plugin-typescript2"),
	commonjs = require("rollup-plugin-commonjs"),
	resolve = require("rollup-plugin-node-resolve"),
	builtins = require("rollup-plugin-node-builtins"),
	globals = require("rollup-plugin-node-globals"),
	sass = require("gulp-sass"),
	concat = require("gulp-concat"),
	del = require("del"),
	merge2 = require("merge2"),
	es6Minifier = require("rollup-plugin-terser").terser,
	{ argv } = require("yargs"),
	cleanCSS = require("gulp-clean-css"),
	inject = require("gulp-inject"),
	hash = require("gulp-hash-filename"),
	distDir = "../wwwroot",
	svelteComponentsDir = "build/svelte";

const minify = !!argv.minify;

process.on("unhandledRejection", r => console.log(r)); // eslint-disable-line no-console

gulp.task("cleanJs", () => del(`${distDir}/js/**`, { force: true }));
gulp.task("cleanCss", () => del(`${distDir}/css/**`, { force: true }));

gulp.task("clean", () => del("build", { force: true }));

gulp.task(
	"svelte",
	gulp.series("clean", "cleanJs", () => {
		const copySharedJs = gulp
			.src("node_modules/svelte/shared.js")
			.pipe(gulp.dest(svelteComponentsDir));

		// const copyckEditorJs = gulp
		// 	.src("src/core/ckeditor/*.js")
		// 	.pipe(gulp.dest(`${svelteComponentsDir}/core/ckeditor`));

		const copyOutputs = gulp
			.src("src/core/ui/outputs/*.ts")
			.pipe(gulp.dest(`${svelteComponentsDir}/core/ui/outputs`));

		// Break down Svelte build into multiple steps, because for some reason,
		// if we pass "src/**/*.html" to the buildSvelte function, the build won't
		// work correctly (the `pipe` will never `end`).
		const buildComponents = gulp
			.src("src/**/*.html")
			.pipe(gulpSvelte({
				format: "es",
				generate: "dom",
				shared: true,
				dev: true,
				css: true,
				onwarn(e) {
					// Ignore css-unused-selector warning, because it's incorrect.
					if (e.code !== "css-unused-selector") {
						console.log("\x1b[33m%s\x1b[0m", e.filename);
						console.log(e.toString());
					}
				},
				onerror(e) {
					console.log(e);
				}
			}))
			.pipe(gulp.dest(svelteComponentsDir));

		return merge2([copySharedJs, copyOutputs], buildComponents);
	})
);

gulp.task(
	"compile-app-ts",
	gulp.series("svelte", () => {
		const plugins = [
			resolve({
				jsnext: true,
				main: true,
				browser: true
			}),
			commonjs(),
			rollupTypescript({
				typescript: tsc,
				tsconfig: "src/tsconfig.json"
			}),
			globals(),
			builtins()
		];

		if (minify) {
			plugins.push(es6Minifier());
		}

		return rollup
			.rollup({
				input: "src/App.ts",
				plugins
			})
			.then(bundle => bundle.write({
				format: "iife",
				file: `${svelteComponentsDir}/bundle.js`,
				sourceMap: true,
				name: "app"
			}));
	})
);

gulp.task(
	"compile-app",
	gulp.series("compile-app-ts", () => gulp
		.src(`${svelteComponentsDir}/bundle.js`)
		.pipe(hash({
			format: "{name}.{hash}.{size}{ext}"
		}))
		.pipe(gulp.dest(`${distDir}/js/`)))
);

gulp.task("copy-assets", () => {
	const copyAssets = gulp
		.src("wwwroot/assets/**")
		.pipe(gulp.dest(`${distDir}/assets`));
	const copyLibs = gulp
		.src("wwwroot/bootstrap/**")
		.pipe(gulp.dest(`${distDir}/css/bootstrap`));
	const copyFonts = gulp
		.src("wwwroot/fonts/**")
		.pipe(gulp.dest(`${distDir}/css/fonts`));

	return merge2([copyAssets, copyLibs, copyFonts]);
});

gulp.task(
	"sass",
	gulp.series("cleanCss", () => gulp
		.src(["src/**/*.scss", "src/**/*.css"])
		.pipe(sass().on("error", sass.logError))
		.pipe(concat("main.css"))
		.pipe(hash({
			format: "{name}.{hash}.{size}{ext}"
		}))
		.pipe(cleanCSS({ compatibility: "*" }))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(`${distDir}/css/`)))
);

gulp.task(
	"inject-js",
	gulp.series("compile-app", () => {
		const target = gulp.src(`${distDir}/index.html`);
		// It's not necessary to read the files (will speed up things), we're only after their paths:
		const sources = gulp.src([`./${distDir}/js/*.js`], { read: false });
		return target
			.pipe(inject(sources, { addRootSlash: false, ignorePath: "../wwwroot/" }))
			.pipe(gulp.dest(`${distDir}`));
	})
);

gulp.task(
	"inject-css",
	gulp.series("sass", "copy-assets", () => {
		const target = gulp.src(`${distDir}/index.html`);
		// It's not necessary to read the files (will speed up things), we're only after their paths:
		const sources = gulp.src([`./${distDir}/css/*.css`], { read: false });
		return target
			.pipe(inject(sources, { addRootSlash: false, ignorePath: "../wwwroot/" }))
			.pipe(gulp.dest(`${distDir}`));
	})
);

function watching() {
	gulp.watch(["src/**/*.ts", "src/**/*.html"], gulp.parallel("inject-js"));
	gulp.watch(["src/**/*.scss", "src/**/*.css"], gulp.parallel("inject-css"));
	gulp.watch("wwwroot/**", gulp.series("inject-js", "inject-css"));
}

watching.description = "watching";

gulp.task(
	"watch",
	gulp.series("inject-js", "inject-css", "copy-assets", watching)
);

function building() {
	gulp.series("inject-js", "inject-css", "copy-assets");
}

building.description = "building";

gulp.task("build", gulp.series(building));
