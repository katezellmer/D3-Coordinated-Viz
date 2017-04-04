// main js file

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 960,
        height = 600;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbersUsa();

    var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/WomenInGovernment.csv") //load attributes from csv
        .defer(d3.json, "data/UnitedStates.topojson") //load spatial data for choropleth map
        .await(callback); //send data to callback function

//still debugging this, something is off, and I've checked to make sure I have the correct
//objects and properties names according to the topojson files
    function callback(error, csvData, usa){

        var states = topojson.feature(usa, usa.objects.layer1).features;

        var regions = map.selectAll(".regions")
            .data(states)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.adm1_code;
            })
            .attr("d", path);

        console.log(error);
        console.log(csvData);
        console.log(usa);
    };

};