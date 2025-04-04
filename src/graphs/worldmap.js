import * as d3 from 'd3'
import '../style.css'
import './css/worldmap.css'
import LocalstorageProperties from '../Utils/localstorageProperties';
import FilterValues from '../Utils/filterValues';
//Geodata generated from https://geojson-maps.kyd.au/ also take a look at TopoJSON 
// tutorial followed https://technology.amis.nl/frontend/web-html5-css3/create-interactive-world-map-to-visualize-country-data/
//https://technology.amis.nl/frontend/world-map-data-visualization-with-d3-js-geojson-and-svg-zooming-and-panning-and-dragging/
//And https://www.d3indepth.com/geographic/

const container = document.getElementById("world_container");
const width = container.clientWidth;
const height = container.clientHeight;
let geoData;
const GEOJSON = "/GEOJSON_medium_stripped.json"
const storageKey = "worlmap_filter"
let rawCSVData = [];
const padding = 20;
let dataMap = new Map()
let worldmap, worldmapGroup, projection, geoGenerator;

//GET the GEOJSONDATA
d3.json(GEOJSON).then(data => {
    geoData = data;
    drawMap();
    loadCSV();
}).catch((error) => {
    console.error("Something went wrong loading the data: ", error);
});


const populateFilters = () => {
    const properties = LocalstorageProperties.getProperties(storageKey)
    const defaultValueCancer = properties.cause_name;
    const defaultValueYear = properties.year;
    const defaultValueAge = properties.age_name;
    const defaultValueSex = properties.sex;
    const defaultValueDisplay = properties.view_type;

    //Cancer
    const cancerSelect = document.getElementById("cancerSelect");
    const cancerOptionElements = FilterValues.cause_names.map(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        if (value === defaultValueCancer) {
            option.selected = true;
        }
        return option;
    });
    cancerSelect.append(...cancerOptionElements);

    //Year
    const yearSelect = document.getElementById("yearSelect");
    const yearOptionElements = FilterValues.years.map(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        if (value === defaultValueYear) {
            option.selected = true;
        }
        return option;
    });
    yearSelect.append(...yearOptionElements);

    //Ages
    const ageSelect = document.getElementById("ageSelect");
    const ageOptionElements = FilterValues.ages.map(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        if (value === defaultValueAge) {
            option.selected = true;
        }
        return option;
    });
    ageSelect.append(...ageOptionElements);

    document.querySelector(`#displayToggle .filter-btn[data-value="${defaultValueDisplay}"]`)?.classList.add('active');
    document.querySelector(`#sexToggle .filter-btn[data-value="${defaultValueSex}"]`)?.classList.add('active');
}

populateFilters()
//Function to draw the map
const drawMap = () => {
    const container = document.getElementById("world_container");
    container.style.height = `${container.clientHeight}px`;
    const width = container.clientWidth;
    const height = container.clientHeight;
    d3.select("#world_container").select("svg").remove();
    worldmap = d3.select("#world_container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");;

    worldmapGroup = worldmap.append("g").attr("id", "world_map");
    projection = d3.geoMercator().fitExtent(
        [[padding, padding], [width - padding, height - padding]], geoData)
    geoGenerator = d3.geoPath()
        .projection(projection);
    worldmapGroup.selectAll('path')
        .data(geoData.features)
        .join('path')
        .attr('d', geoGenerator)
        .attr("data-country", d => d.properties.name)
        .classed("Country_map", true)
    UpdateView()
}

//Load the correct CSV file
const loadCSV = () => {
    const properties = LocalstorageProperties.getProperties(storageKey)
    const path = getCSVName(properties)
    d3.csv(path).then(csvData => {
        rawCSVData = csvData;
        updateMapFromCSV()
    }
    );
}
//Update the dataMap after CSV load
const updateMapFromCSV = () => {
    const filtered = filterCSVData(rawCSVData)
    dataMap = createCSVMapCountryMap(filtered)
    UpdateView()
}

//add the country colors etc.
const UpdateView = () => {
    const properties = LocalstorageProperties.getProperties(storageKey)
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
            return d.properties.name;
        });
}

//Function to create a map of the CSV data
const createCSVMapCountryMap = (data) => {
    return new Map(
        data.map(d => [d.geo_location_name, d])
    )
}

//filter the CSV data
const filterCSVData = (data) => {
    const properties = LocalstorageProperties.getProperties(storageKey)
    return data.filter(d => d["age_name"] === properties.age_name && d["cause_name"] === properties.cause_name && +d["year"] === properties.year)
}

//Create the path to the right csv file
const getCSVName = (properties) => {
    let cancer = properties.cause_name?.replace(" ", "_").replace("/", "-").toLowerCase()
    let sex = properties.sex
    let year = properties.year
    return `/worldmap/${cancer}/${sex}/${cancer}_${sex}_${year}.csv`
}

//Resizing the window
let resizeTimeout;

window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
            if (geoData) drawMap();
        })
    }, 200);
});

//Filter events

// --- Cancer type ---
document.getElementById("cancerSelect").addEventListener("change", (e) => {
    const value = e.target.value;
    console.log("Cancer type selected:", value);
    LocalstorageProperties.setPropreties(storageKey, { cause_name: value })
    loadCSV()
    // handleChange("cancer", value);
});

// --- Sex toggle ---
const sexButtons = document.querySelectorAll("#sexToggle .filter-btn");

sexButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        sexButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const value = btn.dataset.value;
        console.log("Sex selected:", value);
        LocalstorageProperties.setPropreties(storageKey, { sex: value.toLowerCase() })
        loadCSV()
        // handleChange("sex", value);
    });
});

// --- Year ---
document.getElementById("yearSelect").addEventListener("change", (e) => {
    const value = e.target.value;
    console.log("Year selected:", value);
    LocalstorageProperties.setPropreties(storageKey, { year: +value })
    loadCSV()
    // handleChange("year", value);
});

// --- Age group ---
document.getElementById("ageSelect").addEventListener("change", (e) => {
    const value = e.target.value;
    console.log("Age group selected:", value);
    LocalstorageProperties.setPropreties(storageKey, { age_name: value })
    updateMapFromCSV()
    // handleChange("age_group", value);
});
// --- Sex toggle ---
const displayButtons = document.querySelectorAll("#displayToggle .filter-btn");

displayButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        displayButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const value = btn.dataset.value;
        console.log("Sex selected:", value);
        LocalstorageProperties.setPropreties(storageKey, { view_type: value })
        UpdateView()
        // handleChange("sex", value);
    });
});
