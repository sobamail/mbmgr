import {svelte} from "@sveltejs/vite-plugin-svelte";
import {defineConfig} from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins : [
        svelte(),
    ],
    build : {
        minify : false,
        outDir : "../assets",
        emptyOutDir : true, // also necessary
    },
});
