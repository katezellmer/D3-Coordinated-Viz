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
        .defer(d3.json, "data/UnitedStates.topojson") //load background spatial data
        .await(callback);

    function callback(error, csvData, usa){

        var states = topojson.feature(usa, usa.objects.UnitedStates).features;

        var regions = map.selectAll(".regions")
            .data(states)
            .enter()
            .append("path")
            .attr("class", function(d){
                return d.properties.name;
            })
            .attr("d", path);

        console.log(states);
    };
};
