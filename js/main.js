var attrArray = ["Women_In_House_Of_Representatives_(%)", "Women_In_State_Legislature_(%)", "Women_In_Senate_(%)", "Women_Holding_State_Wide_Elected_Office_2017(#)", "Women_Who_Voted_In_2016_Election(%)"];
var expressed = attrArray[0];
var map;

//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
    chartHeight = 450,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

var yScale = d3.scaleLinear()
    .range([463, 0])
    .domain([0, 100]);

window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 450;

    //create new svg container for the map
    map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbersUsa()
        .scale(800)
        .translate([width/2, height/2]);

    var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/WomenInGovernment2.csv") //load attributes from csv
        .defer(d3.json, "data/UnitedStates.topojson") //load background spatial data
        .await(callback);

    function callback(error, csvData, usa){

        var states = topojson.feature(usa, usa.objects.UnitedStates).features;

        states = joinData(states, csvData);

        createDropdown(csvData);

        colorScale = makeColorScale(csvData, expressed);

        setEnumerationUnits(states, map, path, colorScale);

        setChart(csvData, colorScale);
    };
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.name;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 50)
        .attr("y", 50)
        .attr("class", "chartTitle");

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

    updateChart(bars, csvData.length, colorScale);
};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });


    var newExpressed = expressed.replace(/_/g, " ");

    var chartTitle = d3.select(".chartTitle")
        .text(newExpressed);
};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on('change', function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    var newArray = new Array();

    for (var i = 0; i < attrArray.length; i++) {
        newArray[i] = attrArray[i].replace(/_/g, " ");
    }

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(newArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d.replace(/ /g, "_"); })
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData, attribute);

    //recolor enumeration units
    var states = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){

        return choropleth(d.properties, colorScale)
    });

    //re-sort, resize, and recolor bars
    //in changeAttribute()...Example 1.5 line 15...re-sort bars

    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            if (expressed[a] == "NAN") expressed[a] = 0;
            if (expressed[b] == "NAN") expressed[b] = 0;
            return a[expressed] - b[expressed];
        })
        .transition()
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

    updateChart(bars, csvData.length, colorScale);
};

// HELPER FUNCTIONS

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.name)
        .style("stroke", "indigo")
        .style("stroke-width", "2");

    setLabel(props);
};

function dehighlight(props){
    var selected = d3.selectAll("." + props.name)
        .style("stroke", "white")
        .style("stroke-width", "1");

    d3.select(".infolabel")
        .remove()
};

//function to move info label with mouse
function moveLabel(){

    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    var currName = props.name.replace(/_/g, " ");
    var currAttribute = labelAttribute.replace(/_/g, " ");
    
    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", currName + "_label")
        .html(currAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(currName);
};

//function to create color scale generator
function makeColorScale(data, expressed){
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

    if (expressed == "Women_In_Senate_(%)" || 
        expressed == "Women_Holding_State_Wide_Elected_Office_2017_(#)") {

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) { return parseFloat(d[expressed]); }),
            d3.max(data, function(d) { return parseFloat(d[expressed]); })
        ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);
    }

    else {
        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);
    }
    
    


    return colorScale;
};

function setEnumerationUnits(states, map, path, colorScale) {
    var regions = map.selectAll(".states")
            .data(states)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.name;
            })
            .attr("d", path)
            .style("fill", function(d){
                return colorScale(d.properties[expressed], colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

    var desc = regions.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');
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

