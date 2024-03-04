import { build } from 'esbuild'

await build({
  entryPoints: ["./src/extension.ts"],
	bundle: true,
	format: "cjs",
	minify: true,
	target: "node16.18",
	outfile: "./dist/src/index.js",
	external: [
    "vscode",
		"node:path",
	],
})
