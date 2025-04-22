import * as d3 from 'd3'
import '../style.css'
import './css/worldmap.css'
import LocalstorageProperties from '../Utils/localstorageProperties';
import FilterValues from '../Utils/filterValues';
import createLoadNavbar from '../Utils/createNavbar';
//Geodata generated from https://geojson-maps.kyd.au/ also take a look at TopoJSON 
// tutorial followed https://technology.amis.nl/frontend/web-html5-css3/create-interactive-world-map-to-visualize-country-data/
//https://technology.amis.nl/frontend/world-map-data-visualization-with-d3-js-geojson-and-svg-zooming-and-panning-and-dragging/
//And https://www.d3indepth.com/geographic/


let geoData;
const GEOJSON = "/GEOJSON_medium_stripped.json"
const storageKey = "worlmap_filter"
let rawCSVData = [];
const padding = 20;
const legendHeight = 100
const titleHeight = 50
const globalHeight = 20
let zoom
let dataMap = new Map()
let worldmap, titleGroup, worldmapGroup, globalGroup, legendGroup, projection, geoGenerator, width, height
let mapHeight
let selectedCountry
let globaleData = {}
const legendLabel = {
    "Rate": "Rate per 100 000",
    "Percent": "Percent of all possible deaths",
    "Number": "Number of deaths"
}

createLoadNavbar("Worldmap")
//GET the GEOJSONDATA
d3.json(GEOJSON).then(data => {
    geoData = data;
    populateFilters()

    CreateMapSVG();
    loadCSV();

}).catch((error) => {
    console.error("Something went wrong loading the data: ", error);
});

const populateSelect = (id, options, current) => {
    const select = document.getElementById(id);
    select.innerHTML = // `<option value="">All</option>` +
        options.map(opt => `<option ${opt == current ? "selected" : ""} value="${opt}">${opt || 'All'}</option>`).join("");
};

const populateCheckboxGroup = (id, options, current) => {
    const container = document.getElementById(id);
    container.innerHTML = options.map(opt => `
      <label>
          <input type="radio" name="${id}" ${opt === current ? "checked" : ""} value="${opt}" />
          ${opt}
      </label>
  `).join("");
};
const populateCountry = (id, options, current) => {
    const select = document.getElementById(id);
    select.innerHTML = `<option value="">---</option>` +
        options.map(opt => `<option ${opt.geo_location_name == current ? "selected" : ""} value="${opt.geo_location_name}">${opt.location_name || 'All'}</option>`).join("");
};
const populateFilters = () => {
    const properties = LocalstorageProperties.getProperties(storageKey)
    const defaultValueCancer = properties.cause_name;
    const defaultValueYear = properties.year;
    const defaultValueAge = properties.age_name;
    const defaultValueSex = properties.sex;
    const defaultValueDisplay = properties.view_type;

    const yearRange = document.getElementById("yearRange");
    yearRange.value = defaultValueYear;
    populateSelect("yearSelect", FilterValues.years, properties.year)
    populateCheckboxGroup("ageFilter", FilterValues.ages, defaultValueAge)
    populateCheckboxGroup("causeFilter", FilterValues.cause_names, defaultValueCancer)
    populateCheckboxGroup("sexFilter", FilterValues.sex, defaultValueSex)
    populateCheckboxGroup("displayFilter", FilterValues.display, defaultValueDisplay)

}

//Function to draw the map
const CreateMapSVG = () => {
    const container = document.getElementById("map_container");
    container.style.height = `${container.clientHeight}px`;
    width = container.clientWidth;
    height = container.clientHeight;
    mapHeight = height - titleHeight - globalHeight - legendHeight - padding;
    d3.select("#map_container").select("svg").remove();
    worldmap = d3.select("#map_container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

    worldmap.append("defs").append("clipPath")
        .attr("id", "map-clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", mapHeight);

    titleGroup = worldmap.append("g").attr("id", "map_title").attr("transform", "translate(0, 30)")
    globalGroup = worldmap.append("g").attr("id", "globalInfo").attr("transform", `translate(${0}, ${titleHeight + 30})`)
    const zoomGroup = worldmap.append("g").attr("id", "zoomGroup").attr("clip-path", "url(#map-clip)").attr("transform", `translate(${0}, ${titleHeight + globalHeight + padding})`);
    worldmapGroup = zoomGroup.append("g").attr("id", "world_map");
    legendGroup = worldmap.append("g")
        .attr("id", "map_legend")
        .attr("transform", `translate(${padding}, ${height - legendHeight})`);

    zoom = d3.zoom()
        .scaleExtent([1, 15])
        //.translateExtent([[0, 0], [width, height]])
        .on("zoom", (event) => {
            worldmapGroup.attr("transform", event.transform);
            //worldmapGroup.attr("transform", event.transform);
        });

    worldmap.call(zoom);
    redrawMap()
}
const redrawMap = () => {
    worldmap.select("path").remove()
    projection = d3.geoEquirectangular().fitExtent(
        [[padding, padding], [width - padding, mapHeight]], geoData)
    geoGenerator = d3.geoPath()
        .projection(projection);
    worldmapGroup.selectAll('path')
        .data(geoData.features)
        .join('path')
        .attr('d', geoGenerator)
        .attr("data-country", d => d.properties.name)
        .classed("Country_map", true)
        .on("click", (event, d) => {
            showCountryBox(d.properties.name)
        })
    //.classed("Monaco", d => d.properties.name === "Monaco")
    UpdateView()
}
//Load the correct CSV file
const loadCSV = () => {
    const properties = LocalstorageProperties.getProperties(storageKey)
    const path = getCSVName(properties)
    console.log(path)
    d3.csv(path).then(csvData => {
        rawCSVData = csvData;
        updateMapFromCSV()
        changeCountryBoxData()
    }
    );
}
//Update the dataMap after CSV load
const updateMapFromCSV = () => {
    const filtered = filterCSVData(rawCSVData)
    dataMap = createCSVMapCountryMap(filtered)
    populateCountry("countryFilter", Array.from(dataMap.values()).sort((a, b) =>
        a.location_name.localeCompare(b.location_name)
    ), null)
    console.log(Array.from(dataMap.values()))
    UpdateView()
}

//add the country colors etc.
const UpdateView = () => {
    const properties = LocalstorageProperties.getProperties(storageKey)
    createTitle(properties)
    const metric = `${properties.view_type}_val`;
    const allValues = Array.from(dataMap.values()).map(d => properties.view_type == "Percent" ? +d[metric] * 100 : +d[metric])
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

    /*d3.selectAll(".Country_map")
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
                return `${name} (${year})\n${cancer} - ${age}\n${properties.view_type}\nLower: ${lower}\nEstimate: ${estimate}\nUpper: ${upper}`;
            }
            return d.properties.name;
        });*/
    createLegend(populationDomain, colorScale, metric, properties)
}


const createTitle = (properties) => {

    titleGroup.selectAll("*").remove();
    globalGroup.selectAll("*").remove();

    titleGroup.append("text")
        .attr("x", width / 2) // center it
        .attr("y", 0) // some spacing below the axis
        .attr("text-anchor", "middle")
        .attr("font-size", "25px")
        .attr("fill", "#000")
        .style("font-weight", "bold")
        .text(`${properties.cause_name} (${properties.year})`);
    titleGroup.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#555")
        .text(`Ages: ${properties.age_name}`);

    const lower = globalGroup.append("text")
        .attr("x", padding)
        .attr("y", 0)
        .attr("text-anchor", "start")
        .attr("font-size", "14px")
        .attr("fill", "#555")
        .style("font-weight", "bold")
        .text(`Lower (Global): `);
    const estimate = globalGroup.append("text")
        .attr("x", width / 2)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#555")
        .style("font-weight", "bold")
        .text(`Estimate (Global): `);
    const upper = globalGroup.append("text")
        .attr("x", width - padding)
        .attr("y", 0)
        .attr("text-anchor", "end")
        .attr("font-size", "14px")
        .attr("fill", "#555")
        .style("font-weight", "bold")
        .text(`Upper (Global): `);
    lower.append("tspan")
        .attr("dy", 0)
        .style("font-weight", "normal")
        .text((properties.view_type == "Percent" ? (+globaleData[`${properties.view_type}_lower`]) * 100 : (+globaleData[`${properties.view_type}_lower`])).toFixed(2));
    estimate.append("tspan")
        .attr("dy", 0)
        .style("font-weight", "normal")
        .text((properties.view_type == "Percent" ? (+globaleData[`${properties.view_type}_val`]) * 100 : (+globaleData[`${properties.view_type}_val`])).toFixed(2));
    upper.append("tspan")
        .attr("dy", 0)
        .style("font-weight", "normal")
        .text((properties.view_type == "Percent" ? (+globaleData[`${properties.view_type}_upper`]) * 100 : (+globaleData[`${properties.view_type}_upper`])).toFixed(2));
}
const createLegend = (populationDomain, colorScale, metric, properties) => {
    legendGroup.selectAll("*").remove();
    const mapGradient = legendGroup
        .append("defs")
        .append("linearGradient")
        .attr("id", "mapGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    const steps = 10;
    const step = (populationDomain[1] - populationDomain[0]) / steps;
    for (let i = 0; i <= steps; i++) {
        const val = populationDomain[0] + i * step;
        mapGradient.append("stop")
            .attr("offset", `${(i / steps) * 100}%`)
            .attr("stop-color", colorScale(val));
    }
    const legendHeight = 25
    const rectWidth = width - padding * 2;
    legendGroup.append("rect")
        .attr("x", 0)
        .attr("y", 10)
        .attr("width", rectWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#mapGradient)")
        .style("stroke", "#000")
        .style("stroke-width", 1);


    const xAxisScale = d3.scaleLinear()
        .domain(populationDomain)
        .range([0, rectWidth]);
    const xAxis = d3.axisBottom(xAxisScale)
        .ticks(6)
        .tickFormat(d3.format(".2f"));

    legendGroup.append("g")
        .attr("transform", `translate(0, ${10 + legendHeight})`)
        .call(xAxis);

    legendGroup.append("text")
        .attr("x", rectWidth / 2) // center it
        .attr("y", legendHeight + 50) // some spacing below the axis
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .attr("fill", "#000")
        .style("font-weight", "bold")
        .text(legendLabel[properties.view_type]);

    const countryData = Array.from(dataMap.values())
    legendGroup.selectAll(".legend-dot")
        .data(countryData)
        .join("circle")
        .attr("cx", d => xAxisScale(d[metric]))
        .attr("cy", 0)
        .attr("r", 5)
        .style("fill", d => colorScale(d[metric]))
        //.style("opacity", 0.5)
        .style("stroke", "#000")
        .style("stroke-width", 0.5)
        .classed("dot_of_legend", true)
        .on("click", (event, d) => {
            zoomToACountry(d.geo_location_name);
            showCountryBox(d.geo_location_name);
        })
        .append("title")
        .text(d => {
            const name = d.location_name;
            const estimate = (properties.view_type == "Percent" ? (+d[metric]) * 100 : (+d[metric])).toFixed(2) || "N/A";
            const upper = (properties.view_type == "Percent" ? (+d[`${properties.view_type}_upper`]) * 100 : (+d[`${properties.view_type}_upper`])).toFixed(2) || "N/A";
            const lower = (properties.view_type == "Percent" ? (+d[`${properties.view_type}_lower`]) * 100 : (+d[`${properties.view_type}_lower`])).toFixed(2) || "N/A";
            return `${name}\nLower: ${lower}\nEstimate: ${estimate}\nUpper: ${upper}`;
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
    const globalName = "Global";
    globaleData = data.find(d => d["location_name"] === globalName)
    return data.filter(d => d["location_name"] !== globalName && d["age_name"] === properties.age_name && d["cause_name"] === properties.cause_name && +d["year"] === properties.year)
}

//Create the path to the right csv file
const getCSVName = (properties) => {
    let cancer = properties.cause_name?.replaceAll(" ", "_").replaceAll("/", "-").toLowerCase()
    let sex = properties.sex.toLowerCase()
    let year = properties.year
    return `/worldmap/${cancer}/${sex}/${cancer.replaceAll("_", "-")}_${sex}_${year}.csv`
}

// find largest polygon for multypoligon countries like russia
const getLargestPolygon = (countryName) => {
    const countryFeature = geoData.features.find(d => d.properties.name === countryName);
    if (countryFeature.geometry.type !== "MultiPolygon") {
        return countryFeature;
    }
    const largestPolygon = countryFeature.geometry.coordinates.reduce((acc, coords) => {
        const area = d3.geoArea({ type: "Polygon", coordinates: coords });

        return area > acc.area
            ? { coords, area }
            : acc;
    }, { coords: null, area: -Infinity });
    return {
        type: "Feature",
        properties: countryFeature.properties,
        geometry: {
            type: "Polygon",
            coordinates: largestPolygon.coords
        }
    };

}
const zoomToACountry = (countryName) => {
    selectedCountry = countryName
    const countryFeature = getLargestPolygon(countryName);
    d3.selectAll(".Country_map").classed("Focus", false);

    d3.selectAll(`.Country_map[data-country="${countryName}"]`)
        .classed("Focus", true).raise();

    const [[x0, y0], [x1, y1]] = geoGenerator.bounds({
        type: "Feature",
        properties: {},
        geometry: countryFeature.geometry
    });
    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;
    const newScale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / mapHeight)));
    const transform = d3.zoomIdentity
        .translate(width / 2, mapHeight / 2)
        .scale(newScale)
        .translate(-x, -y);

    worldmap.transition()
        .duration(1000)
        .call(
            zoom.transform,
            transform
        );
}
const clearSelectedCountry = () => {
    if (selectedCountry) {
        selectedCountry = null;
        d3.selectAll(".Country_map").classed("Focus", false);
        document.getElementById("countryFilter").value = "";
    }
    d3.selectAll(".Country_map").classed("Focus", false);
    document.getElementById("country-box").style.display = "none";
    document.getElementById("country-box").dataset.country = null;

};
const resetZoom = () => {
    const transform = d3.zoomIdentity
        .translate(0, 0)
        .scale(1)

    worldmap.transition().duration(750)
        .call(zoom.transform, transform);
}


//Resizing the window
let resizeTimeout;

window.addEventListener("resize", () => {
    clearSelectedCountry()
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
            if (geoData) CreateMapSVG();
        })
    }, 200);
});

//Country events

document.getElementById("resetZoom").addEventListener("click", (e) => {
    clearSelectedCountry()
    resetZoom()
});



const showCountryBox = (countryName) => {
    const data = dataMap.get(countryName);
    if (data) {
        const properties = LocalstorageProperties.getProperties(storageKey)
        const name = data.location_name;
        const year = data.year;
        const cancer = data.cause_name;
        const age = data.age_name;
        const estimate = (properties.view_type == "Percent" ? (+data[`${properties.view_type}_val`]) * 100 : (+data[`${properties.view_type}_val`])).toFixed(2) || "N/A";
        const upper = (properties.view_type == "Percent" ? (+data[`${properties.view_type}_upper`]) * 100 : (+data[`${properties.view_type}_upper`])).toFixed(2) || "N/A";
        const lower = (properties.view_type == "Percent" ? (+data[`${properties.view_type}_lower`]) * 100 : (+data[`${properties.view_type}_lower`])).toFixed(2) || "N/A";
        document.getElementById("selectedCountryName").textContent = name;
        document.getElementById("selectedYear").textContent = year;
        document.getElementById("lowerValue").textContent = lower;
        document.getElementById("estimateValue").textContent = estimate;
        document.getElementById("UpperValue").textContent = upper;
        document.getElementById("typeData").textContent = cancer;
        document.getElementById("agesData").textContent = age;
        document.getElementById("country-box").style.display = "block";
        d3.selectAll(".Country_map").classed("Focus", false);
        d3.selectAll(`.Country_map[data-country="${countryName}"]`)
            .classed("Focus", true).raise();
        document.getElementById("country-box").dataset.country = countryName;

    }


}
const changeCountryBoxData = () => {
    const elementDisplay = document.getElementById("country-box").style.display;
    //console.log("change", elementDisplay)
    if (elementDisplay == "block") {
        showCountryBox(document.getElementById("country-box").dataset.country)
    }

}

document.getElementById("map_container").addEventListener("click", (event) => {
    if (!event.target.classList.contains("Country_map") && !event.target.classList.contains("dot_of_legend")) {
        clearSelectedCountry(); // Hide tooltip
    }
});
//Filter events

// --- Cancer type ---
document.getElementById("causeFilter").addEventListener("change", (e) => {
    const value = e.target.value;
    LocalstorageProperties.setPropreties(storageKey, { cause_name: value })
    //clearSelectedCountry()
    loadCSV()

    // handleChange("cancer", value);
});


// --- Year ---
document.getElementById("yearSelect").addEventListener("change", (e) => {
    const value = e.target.value;
    LocalstorageProperties.setPropreties(storageKey, { year: +value })
    const yearRange = document.getElementById("yearRange");
    yearRange.value = value;
    //clearSelectedCountry()
    loadCSV()

    // handleChange("year", value);
});
document.getElementById("yearRange").addEventListener("change", (e) => {
    const value = e.target.value;
    LocalstorageProperties.setPropreties(storageKey, { year: +value })
    const yearSelect = document.getElementById("yearSelect");
    yearSelect.value = value;
    //clearSelectedCountry()
    loadCSV()

    // handleChange("year", value);
});

// --- Age group ---
document.getElementById("ageFilter").addEventListener("change", (e) => {
    const value = e.target.value;
    LocalstorageProperties.setPropreties(storageKey, { age_name: value })
    //clearSelectedCountry()
    updateMapFromCSV()
    changeCountryBoxData()
    // handleChange("age_group", value);
});
// --- Sex toggle ---
document.getElementById("sexFilter").addEventListener("change", (e) => {
    const value = e.target.value;
    LocalstorageProperties.setPropreties(storageKey, { sex: value })
    //clearSelectedCountry()
    loadCSV()
});

//display

document.getElementById("displayFilter").addEventListener("change", (e) => {
    const value = e.target.value;

    LocalstorageProperties.setPropreties(storageKey, { view_type: value })
    UpdateView()
    changeCountryBoxData()
});
/*const displayButtons = document.querySelectorAll("#displayToggle .filter-btn");

displayButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        displayButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const value = btn.dataset.value;
        LocalstorageProperties.setPropreties(storageKey, { view_type: value })
        UpdateView()
        changeCountryBoxData()

        //clearSelectedCountry()
        // handleChange("sex", value);
    });
});*/
//Country
document.getElementById("countryFilter").addEventListener("change", (e) => {
    const value = e.target.value;
    zoomToACountry(value)
    showCountryBox(value)

    // handleChange("age_group", value);
});
document.getElementById("detailsNavBtn").addEventListener("click", () => {
    const country = document.getElementById("selectedCountryName").textContent;
    window.location.href = "/pages/country-stats.html?country=" + encodeURIComponent(country);
});
document.getElementById("countryClose").addEventListener("click", () => {
    clearSelectedCountry();
});