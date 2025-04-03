import * as d3 from 'd3'

//Geodata generated from https://geojson-maps.kyd.au/ also take a look at TopoJSON 
// tutorial followed https://technology.amis.nl/frontend/web-html5-css3/create-interactive-world-map-to-visualize-country-data/
//https://technology.amis.nl/frontend/world-map-data-visualization-with-d3-js-geojson-and-svg-zooming-and-panning-and-dragging/
//And https://www.d3indepth.com/geographic/

const WorldMap = () => {
    const width = 1000;
    const height = 700;
    let geoData;
    const GEOJSON = "/GEOJSON_med_stripped.json"
    let properties = { "age_name": "All ages", "cause_name": "Neoplasms", "year": 1980, "sex": "both", "view_type": "Rate" }
    let rawCSVData = [];
    let dataMap = new Map()
    const map = d3.select("#worldmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
    d3.json(GEOJSON).then(data => {
        geoData = data;
        let projection = d3.geoMercator().fitSize([width, height], data)
        let geoGenerator = d3.geoPath()
            .projection(projection); //turn GeoJSON into SVG path
        let countryNodes = map
            .selectAll('path')
            .data(geoData.features)
            .join('path')
            .attr('d', geoGenerator)
            .attr("data-country", d => d.properties.name)
            .classed("Country_map", true)
        loadCSV()
    }
    ).catch((error) => {
        console.error("Something went wrong loading the data: ", error);
    });

    const loadCSV = () => {
        const path = getCSVName(properties)
        d3.csv(path).then(csvData => {
            rawCSVData = csvData;
            updateMapFromCSV()
        }
        );
    }
    const updateMapFromCSV = () => {
        const filtered = filterCSVData(rawCSVData)
        dataMap = createCSVMapCountryMap(filtered)
        UpdateView()
    }
    const UpdateView = () => {
        const metric = `${properties.view_type}_val`;
        const allValues = Array.from(dataMap.values()).map(d => +d[metric])
        const populationDomain = d3.extent(allValues)
        const colorScale = d3.scaleSequential(d3.interpolateViridis).domain(populationDomain)
        d3.selectAll(".Country_map")
            .transition()
            .duration(500)
            .style("fill", d => {
                const data = dataMap.get(d.properties.name);
                return data ? colorScale(data[metric]) : "#ccc";
            });
        d3.selectAll(".Country_map")
            .select("title").remove(); // remove old titles if they exist

        d3.selectAll(".Country_map")
            .append("title")
            .text(d => {
                const data = dataMap.get(d.properties.name);
                if (data) {
                    const name = data.location_name;
                    const year = data.year;
                    const cancer = data.cause_name;
                    const age = data.age_name;
                    const estimate = (+data[metric]).toFixed(2) || "N/A";
                    const upper = (+data[`${properties.view_type}_upper`]).toFixed(2) || "N/A";
                    const lower = (+data[`${properties.view_type}_lower`]).toFixed(2) || "N/A";
                    return `${name} (${year})\n${cancer} - ${age}\n${properties.view_type}:\nLower: ${lower}\nEstimate: ${estimate}\nUpper: ${upper}`;
                }
                return "";
            });
    }
    const createCSVMapCountryMap = (data) => {
        return new Map(
            data.map(d => [d.geo_location_name, d])
        )
    }

    const filterCSVData = (data) => {
        return data.filter(d => d["age_name"] === properties.age_name && d["cause_name"] === properties.cause_name && +d["year"] === properties.year)
    }

    const getCSVName = (properties) => {
        let cancer = properties.cause_name?.replace(" ", "_").replace("/", "-").toLowerCase()
        let sex = properties.sex
        let year = properties.year
        return `/worldmap/${cancer}/${sex}/${cancer}_${sex}_${year}.csv`
    }
}

export default WorldMap;