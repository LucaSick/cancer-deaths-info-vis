import { path } from "d3";

export default {
    root: '.',
    publicDir: 'public',
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                countryStats: 'pages/country-stats.html',
                worldMap: 'pages/worldmap.html',
            },
        },
    },
};