import * as d3 from 'd3'

//Geodata generated from https://geojson-maps.kyd.au/ also take a look at TopoJSON 
// tutorial followed https://technology.amis.nl/frontend/web-html5-css3/create-interactive-world-map-to-visualize-country-data/
//https://technology.amis.nl/frontend/world-map-data-visualization-with-d3-js-geojson-and-svg-zooming-and-panning-and-dragging/
//And https://www.d3indepth.com/geographic/

const WorldMap = () => {
    const width = 1000;
    const height = 700;
    const GEOJSON = "/custom_no_antartica.json"
    const map = d3.select("#worldmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height)

    d3.json(GEOJSON).then(data => {
        let projection = d3.geoMercator().fitSize([width, height], data)
        let geoGenerator = d3.geoPath()
            .projection(projection); //turn GeoJSON into SVG path
        let countryNodes = map
            .selectAll('path')
            .data(data.features)
            .join('path')
            .attr('d', geoGenerator);
    }
    ).catch((error) => {
        console.error("Something went wrong loading the data: ", error);
    });
}

export default WorldMap;