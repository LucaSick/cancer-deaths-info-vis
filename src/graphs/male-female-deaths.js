import * as d3 from 'd3'
import FilterValues from '../Utils/filterValues';

let populatedAlready = false;

const populateFilters = (data) => {
    const unique = (arr, key) => Array.from(new Set(arr.map(d => d[key]))).sort();

    const causeOptions = FilterValues.cause_names;
    const locationOptions = unique(data, "location_name");
    const ageOptions = unique(data, "age_name");

    const populateSelect = (id, options) => {
        const select = document.getElementById(id);
        select.innerHTML = `<option value="">All</option>` +
            options.map(opt => `<option value="${opt}">${opt}</option>`).join("");
    };

    populateSelect("cause-select", causeOptions);
    populateSelect("location-select", locationOptions);
    populateSelect("age-select", ageOptions);
    populatedAlready = true;
}

const drawMaleFemaleDeathsGraph = (locationName, ageName, causeName) => {
    d3.select("#app").select("svg").remove();
    d3.select("body").select(".tooltip").remove();

    const margin = { top: 40, right: 100, bottom: 40, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#app")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip div
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "6px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    let fileName = "/male-female-deaths/male-females-deaths.csv";
    if (causeName) {
        fileName = `/male-female-deaths/male-females-deaths-${causeName}.csv`
    }

    d3.csv(fileName, d => ({
        sex_name: d.sex_name,
        year: +d.year,
        val: +d.val,
        location_name: d.location_name,
        age_name: d.age_name,
        cause_name: causeName,
    })).then(rawData => {
        if (!populatedAlready) populateFilters(rawData);
        let filteredData = rawData;

        if (locationName) {
            filteredData = filteredData.filter(d => d.location_name === locationName);
        }

        if (ageName) {
            filteredData = filteredData.filter(d => d.age_name === ageName);
        }

        // Step 1: Aggregate by sex_name and year
        const groupedData = Array.from(
            d3.rollup(
                filteredData,
                v => d3.sum(v, d => d.val),
                d => d.sex_name,
                d => d.year
            ),
            ([sex_name, yearMap]) => ({
                sex_name,
                values: Array.from(yearMap, ([year, val]) => ({
                    sex_name,
                    year: +year,
                    val
                })).sort((a, b) => a.year - b.year)
            })
        );
    
        // Step 2: Flatten all data to compute x/y scales
        const allPoints = groupedData.flatMap(d => d.values);
    
        const xScale = d3.scaleLinear()
            .domain(d3.extent(allPoints, d => d.year))
            .range([0, width]);
    
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(allPoints, d => d.val)])
            .nice()
            .range([height, 0]);
    
        const color = d3.scaleOrdinal(d3.schemeCategory10);
    
        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    
        svg.append("g")
            .call(d3.axisLeft(yScale));
    
        // Line generator
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.val));
    
        // Step 3: Render lines, dots, and labels
        for (const { sex_name, values } of groupedData) {
            // Line path
            svg.append("path")
                .datum(values)
                .attr("fill", "none")
                .attr("stroke", color(sex_name))
                .attr("stroke-width", 2)
                .attr("d", line);
    
            // Last label
            svg.append("text")
                .datum(values[values.length - 1])
                .attr("x", d => xScale(d.year) + 5)
                .attr("y", d => yScale(d.val))
                .text(sex_name)
                .style("fill", color(sex_name))
                .attr("font-size", "12px");
    
            // Dots
            svg.selectAll(`.dot-${sex_name}`)
                .data(values)
                .enter()
                .append("circle")
                .attr("cx", d => xScale(d.year))
                .attr("cy", d => yScale(d.val))
                .attr("r", 4)
                .attr("fill", color(sex_name))
                .on("mouseover", (event, d) => {
                    tooltip.transition().duration(100).style("opacity", 1);
                    tooltip.html(`<strong>${d.sex_name}</strong><br>Year: ${d.year}<br>Deaths: ${d.val.toFixed(2)}<br>Cause: ${causeName || 'All causes'}<br>Location: ${locationName || 'All locations'}<br>Age: ${ageName || 'All ages'}`)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY - 28}px`);
                })
                .on("mouseout", () => {
                    tooltip.transition().duration(100).style("opacity", 0);
                });
        }
    });
}

document.getElementById("apply-filters").addEventListener("click", () => {
    const cause = document.getElementById("cause-select").value;
    const location = document.getElementById("location-select").value;
    const age = document.getElementById("age-select").value;

    drawMaleFemaleDeathsGraph(location, age, cause);
});

drawMaleFemaleDeathsGraph();