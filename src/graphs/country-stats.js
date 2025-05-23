import * as d3 from 'd3'
import '../style.css'
import FilterValues from "../Utils/filterValues";
import createLoadNavbar from '../Utils/createNavbar';

// accordion code
var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var panel = this.nextElementSibling;
    if (panel.style.display === "block") {
      panel.style.display = "none";
    } else {
      panel.style.display = "block";
    }
  });
}

createLoadNavbar("Details")
const populateFilters = () => {
    const yearOptions = FilterValues.years;
    const locationOptions = FilterValues.countries;
    const ageOptions = FilterValues.ages.slice(1, -1);
    const causeOptions = FilterValues.cause_names;

    const populateSelect = (id, options) => {
        const select = document.getElementById(id);
        select.innerHTML =
            options.map(opt => `<option value="${opt}">${opt || 'All'}</option>`).join("");
    };

    const populateCheckboxGroup = (id, options) => {
        const container = document.getElementById(id);
        container.innerHTML = options.map(opt => `
          <label>
              <input type="checkbox" value="${opt}" />
              ${opt}
          </label>
      `).join("");
    };

    populateSelect("countryFilter", locationOptions);
    const urlparams = new URLSearchParams(window.location.search);
    if (urlparams.has("country")) {
        document.getElementById("countryFilter").value = urlparams.get("country")
    }
    populateCheckboxGroup("causeFilter", causeOptions);
    populateCheckboxGroup("ageFilter", ageOptions);

    const minYear = Math.min(...yearOptions);
    const maxYear = Math.max(...yearOptions);

    const yearMinSlider = document.getElementById("yearRangeMin");
    const yearMaxSlider = document.getElementById("yearRangeMax");
    const yearMinValue = document.getElementById("yearMinValue");
    const yearMaxValue = document.getElementById("yearMaxValue");

    yearMinSlider.min = minYear;
    yearMinSlider.max = maxYear;
    yearMinSlider.value = minYear;

    yearMaxSlider.min = minYear;
    yearMaxSlider.max = maxYear;
    yearMaxSlider.value = maxYear;

    const updateYearValues = () => {
        let min = parseInt(yearMinSlider.value);
        let max = parseInt(yearMaxSlider.value);

        if (min > max) {
            [min, max] = [max, min];
        }

        yearMinSlider.max = max;
        yearMaxSlider.min = min;

        yearMinValue.textContent = min;
        yearMaxValue.textContent = max;
    };

    yearMinSlider.addEventListener("input", updateYearValues);
    yearMaxSlider.addEventListener("input", updateYearValues);

    updateYearValues();
}

populateFilters()

const loadAndRender = async (country, yearMin, yearMax, ages, causes) => {
    const data = await d3.csv(`/country-stats/country-stats-${country}.csv`, d3.autoType);

    const filtered = data.filter(d => {
        return (d.year <= yearMax && d.year >= yearMin)
            && (ages.length === 0 || ages.includes(d.age_name))
            && (causes.length === 0 || causes.includes(d.cause_name));
    });

    const grouped = d3.rollups(
        filtered,
        v => d3.sum(v, d => d.val),
        d => d.cause_name
    );

    grouped.sort((a, b) => b[1] - a[1]);

    renderChart(grouped);
};

function renderChart(data) {
    const svg = d3.select("#chart");
    svg.selectAll("*").remove();

    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const margin = { top: 40, right: 100, bottom: 150, left: 60 };

    const x = d3.scaleBand()
        .domain(data.map(d => d[0]))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[1])])
        .nice()
        .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    const tooltip = d3.select("#tooltip");

    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(0) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("fill", "steelblue")
        .on("mouseover", function (event, d) {
            tooltip.style("display", "block")
                .html(`<strong>${d[0]}</strong><br/>Deaths: ${d[1].toLocaleString()}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
            d3.select(this).attr("fill", "darkorange");
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", "steelblue");
        });
}

const drawMaleFemaleDeathsGraph = (locationName, ages, causes, yearMin, yearMax) => {
    d3.select("#app").select("svg").remove();

    const margin = { top: 40, right: 100, bottom: 40, left: 60 };
    const width = 700 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = d3.select("#app")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

    const tooltip = d3.select("#tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "6px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("pointer-events", "none");

    const fileName = `/male-female-deaths/male-females-deaths-${locationName}.csv`

    d3.csv(fileName, d => ({
        sex_name: d.sex_name,
        year: +d.year,
        val: +d.val,
        location_name: d.location_name,
        age_name: d.age_name,
        cause_name: d.cause_name,
    })).then(rawData => {
        let filteredData = rawData;

        filteredData = filteredData.filter(d =>
            (!ages.length || ages.includes(d.age_name)) &&
            (!causes.length || causes.includes(d.cause_name)) &&
            (!yearMax || !yearMin || (d.year <= yearMax && d.year >= yearMin))
        );

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
        )

        const totalByYear = Array.from(
            d3.rollup(
                filteredData,
                v => d3.sum(v, d => d.val),
                d => d.year
            ),
            ([year, val]) => ({
                sex_name: "Total",
                year: +year,
                val
            })
        ).sort((a, b) => a.year - b.year);

        groupedData.push({
            sex_name: "Total",
            values: totalByYear
        });

        const allPoints = groupedData.flatMap(d => d.values);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(allPoints, d => d.year))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(allPoints, d => d.val)])
            .nice()
            .range([height, 0])

        const color = d3.scaleOrdinal(d3.schemeCategory10);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

        svg.append("g")
            .call(d3.axisLeft(yScale));

        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.val));

        for (const { sex_name, values } of groupedData) {
            svg.append("path")
                .datum(values)
                .attr("fill", "none")
                .attr("stroke", color(sex_name))
                .attr("stroke-width", 2)
                .attr("d", line)

            svg.append("text")
                .datum(values[values.length - 1])
                .attr("x", d => xScale(d.year) + 5)
                .attr("y", d => yScale(d.val))
                .text(sex_name)
                .style("fill", color(sex_name))
                .attr("font-size", "12px");

            svg.selectAll(`.dot-${sex_name}`)
                .data(values)
                .enter()
                .append("circle")
                .attr("cx", d => xScale(d.year))
                .attr("cy", d => yScale(d.val))
                .attr("r", 4)
                .attr("fill", color(sex_name))
                .on("mouseover", (event, d) => {
                    tooltip.transition().duration(100).style("display", "block")
                    tooltip.html(`<strong>${d.sex_name}</strong><br>Year: ${d.year}<br>Deaths: ${d.val.toFixed(2)}`)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY - 28}px`);
                })
                .on("mouseout", () => {
                    tooltip.transition().duration(100).style("display", "none");
                });
        }
    });
}

const getSelected = (id) => {
    return Array.from(document.querySelectorAll(`#${id} input[type="checkbox"]:checked`))
        .map(checkbox => checkbox.value);
};

function runLoadAndRender() {
    const country = document.getElementById("countryFilter").value;
    const yearMinValue = document.getElementById("yearMinValue");
    const yearMaxValue = document.getElementById("yearMaxValue")
    const ages = getSelected("ageFilter");
    const causes = getSelected("causeFilter");

    loadAndRender(country, parseInt(yearMinValue.textContent), parseInt(yearMaxValue.textContent), ages, causes);
    drawMaleFemaleDeathsGraph(country, ages, causes, parseInt(yearMinValue.textContent), parseInt(yearMaxValue.textContent));
}

document.getElementById("apply-filters").addEventListener("click", () => {
    runLoadAndRender()
});

runLoadAndRender();
