var attrArray = ["House", "StateLegislature", "Senators", "Managerial", "LaborForce"];
var expressed = attrArray[0];

window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 450;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbersUsa()
        .scale(800);

    projection.translate([width/2, height/2]);

    var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/WomenInGovernment.csv") //load attributes from csv
        .defer(d3.json, "data/UnitedStates.topojson") //load background spatial data
        .await(callback);

    function callback(error, csvData, usa){

        var states = topojson.feature(usa, usa.objects.UnitedStates).features;

        states = joinData(states, csvData);

        colorScale = makeColorScale(csvData);

        setEnumerationUnits(states, map, path, colorScale);

        setChart(csvData, colorScale);

    };
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 450,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", translate);

    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 100]);

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.name;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });


    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 90)
        .attr("y", 50)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed[3] + " in each region");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", translate);
};

// HELPER FUNCTIONS

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#edf8fb",
        "#b3cde3",
        "#8c96c6",
        "#8856a7",
        "#810f7c"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
};

function setEnumerationUnits(states, map, path, colorScale) {
    var regions = map.selectAll(".regions")
            .data(states)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.name;
            })
            .attr("d", path)
            .style("fill", function(d){
                return colorScale(d.properties[expressed], colorScale);
        });
}

//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

function joinData(states, csvData){
    //variables for data join

    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvState = csvData[i]; //the current region
        var csvKey = csvState.name; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<states.length; a++){

            var geojsonProps = states[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.name; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvState[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return states;
};

