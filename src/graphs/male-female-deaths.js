import * as d3 from 'd3'

const drawMaleFemaleDeathsGraph = () => {
    const margin = { top: 40, right: 100, bottom: 40, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select("#app")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv("/male-female-deaths.csv", d => ({
        sex_name: d.sex_name,
        year: +d.year,
        val: +d.val
    })).then(data => {
        const grouped = d3.group(data, d => d.sex_name);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.val)])
            .nice()
            .range([height, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

        svg.append("g")
            .call(d3.axisLeft(yScale));

        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.val));

        for (const [key, values] of grouped) {
            svg.append("path")
                .datum(values)
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", color(key))
                .attr("d", line);

            svg.append("text")
                .datum(values[values.length - 1])
                .attr("x", xScale(values[values.length - 1].year) + 5)
                .attr("y", yScale(values[values.length - 1].val))
                .text(key)
                .style("fill", color(key))
                .attr("font-size", "12px");
        }
    });
}

export default drawMaleFemaleDeathsGraph;