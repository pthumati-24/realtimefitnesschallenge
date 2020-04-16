var genres = config_data.genre_list;

var svg_1strow = d3.select('.sidepanel_1strow').append("svg")
    .attr("width", d3.select('.sidepanel_1strow').style("width").replace("px", ""))
    .attr("height", 55);

svg_1strow.append("text")
    .attr("x", 10)
    .attr("y", 35)
    .text("Select Movie Release Year range")
    .attr("font-size", "15px")
    .attr("font-weight", 600);

svg_1strow.append("circle")
    .attr("class", "Movies")
    .attr("cx", d3.select("svg").attr("width") - 150)
    .attr("cy", 30)
    .attr("r", 6)
    .style("fill", "#ABBD81")

svg_1strow.append("text")
    .attr("x", d3.select("svg").attr("width") - 140)
    .attr("y", 35)
    .text("Movies")
    .attr("font-size", "16px");

svg_1strow.append("circle")
    .attr("class", "averagerating_circle")
    .attr("cx", d3.select("svg").attr("width") - 75)
    .attr("cy", 30)
    .attr("r", 6)
    .style("fill", "#F47E60")

svg_1strow.append("text")
    .attr("x", d3.select("svg").attr("width") - 65)
    .attr("y", 35)
    .text("Ratings")
    .attr("font-size", "16px");

var nummovies_xtick = d3.range(config_data["start_year"], config_data["end_year"], 20);

var x_nummovies = d3.scaleBand().range([0, 350]).padding(0.2);
var y_nummovies = d3.scaleLinear().range([100, 0]);

var x_rating = d3.scaleBand().range([0, 350]).padding(0.2);
var y_rating = d3.scaleLinear().range([100, 0])

var nummovies_chart = d3.select('.sidepanel_movies_barchart').append("svg")
    .attr("width", d3.select('.sidepanel_1strow').style("width").replace("px", ""))
    .attr("height", 130);

var rating_chart = d3.select('.sidepanel_rating_barchart').append("svg")
    .attr("width", d3.select('.sidepanel_1strow').style("width").replace("px", ""))
    .attr("height", 130);

x_nummovies.domain(movies_count_data.map(function (d) { return d.year; }));
y_nummovies.domain([0, (d3.max(movies_count_data, function (d) { return d.movies_released_count + 4; }))]);

nummovies_chart.append("g")
    .attr("class", "nummovies_xaxis")
    .style("font-size", "13px")
    .style("font-weight", 100)
    .call(d3.axisTop(x_nummovies).tickValues(nummovies_xtick))
    .attr("transform", "translate(55, 25)");
nummovies_chart.append("g")
    .attr("class", "grid")
    .call(d3.axisBottom(x_nummovies).tickSize(100).tickFormat(""))
    .attr("transform", "translate(55, 25)");

nummovies_chart.append("g")
    .attr("class", "nummovies_yaxis")
    .style("font-size", "13px")
    .style("font-weight", 100)
    .call(d3.axisLeft(y_nummovies).ticks(5))
    .attr("transform", "translate(55,25)");
nummovies_chart.append("g")
    .attr("class", "grid")
    .call(d3.axisRight(y_nummovies).tickSize(350).tickFormat("").ticks(5))
    .attr("transform", "translate(55, 25)");

nummovies_chart.selectAll(".bar-nummovies")
    .data(movies_count_data)
    .enter().append("rect")
    .attr("class", "bar-nummovies")
    .attr("id", function (d) { return d.year; })
    .attr("x", function (d) { return x_nummovies(d.year); })
    .attr("width", x_nummovies.bandwidth())
    .attr("y", function (d) { return y_nummovies(d.movies_released_count); })
    .attr("height", function (d) { return 100 - y_nummovies(d.movies_released_count); })
    .style("fill", "#ABBD81")
    .style("cursor", "pointer")
    .attr("transform", "translate(55, 25)");

var nummovieslider = document.getElementById('noofmovies_range');
noUiSlider.create(nummovieslider, {
    connect: true,
    behaviour: 'tap',
    start: [config_data["start_year"], config_data["end_year"]],
    step: 1,
    animate: false,
    range: {
        'min': [config_data["dataset_start_year"]],
        'max': [config_data["dataset_end_year"]]
    }
});

var ratingslider = document.getElementById('averagerating_chart');
noUiSlider.create(ratingslider, {
    connect: true,
    behaviour: 'tap',
    start: [config_data["start_rating"], config_data["end_rating"]],
    step: 1,
    animate: false,
    range: {
        'min': [config_data["dataset_start_rating"]],
        'max': [config_data["dataset_end_rating"]]
    }
});

var noUI_handles = [
    nummovieslider.getElementsByClassName('noUi-handle-lower')[0],
    nummovieslider.getElementsByClassName('noUi-handle-upper')[0],
    ratingslider.getElementsByClassName('noUi-handle-lower')[0],
    ratingslider.getElementsByClassName('noUi-handle-upper')[0]
];

nummovieslider.noUiSlider.on('update', function (values, handle) {
    noUI_handles[handle].innerText = parseInt(values[handle]);
    if (handle == 0) {
        document.getElementById("movies-year-start").innerText = parseInt(values[handle])
    } else {
        document.getElementById("movies-year-end").innerText = parseInt(values[handle])
    }
    if (parseInt(noUI_handles[0].innerText) > 0 && parseInt(noUI_handles[1].innerText) > 0) {
        updatepanel(parseInt(noUI_handles[0].innerText), parseInt(noUI_handles[1].innerText), parseInt(noUI_handles[2].innerText), parseInt(noUI_handles[3].innerText));
        updatemoviesRangeValues(parseInt(values[0]), parseInt(values[1]));
    }
});

ratingslider.noUiSlider.on('update', function (values, handle) {
    noUI_handles[handle + 2].innerText = parseInt(values[handle]);
    if (handle == 0) {
        document.getElementById("ratings-start").innerText = parseInt(values[handle])
    } else {
        document.getElementById("ratings-end").innerText = parseInt(values[handle])
    }
    if (parseInt(noUI_handles[2].innerText) > 0 && parseInt(noUI_handles[3].innerText) > 0) {
        updatepanel(parseInt(noUI_handles[0].innerText), parseInt(noUI_handles[1].innerText), parseInt(noUI_handles[2].innerText), parseInt(noUI_handles[3].innerText));
        updateratingsRangeValues(parseInt(values[0]), parseInt(values[1]));
    }
});

function updatepanel(m_min, m_max, r_min, r_max) {
    var total_movie_selected = 0
    var total_movie_rating_selected = 0
    for (var i = 0; i < movies_count_data.length; i++) {
        if (m_min <= movies_count_data[i]["year"] && movies_count_data[i]["year"] <= m_max) {
            total_movie_selected += movies_count_data[i]["movies_released_count"];
            if (noUI_handles[2].innerText > 0 && noUI_handles[3].innerText > 0) {
                for (var j = 0; j < movies_count_data[i]["movies_info"].length; j++) {
                    if (r_min <= movies_count_data[i]["movies_info"][j]["averageRating"] && movies_count_data[i]["movies_info"][j]["averageRating"] <= r_max) {
                        total_movie_rating_selected += 1;
                    }
                }
                document.getElementById("total_movies_selected_rating_based").innerText = total_movie_rating_selected;
            }
        }
    }
    if (noUI_handles[2].innerText > 0 && noUI_handles[3].innerText > 0) {
        rating_drawchart(m_min, m_max, r_min, r_max);
    }
    document.getElementById("total_movies_selected").innerText = total_movie_selected;
}

function rating_drawchart(m_min, m_max, r_min, r_max) {
    var newdata = []
    for (var i = config_data["dataset_start_rating"]; i <= config_data["dataset_end_rating"]; i++) {
        newdata.push({ "rating": i, "movies_count": 0 });
    }
    if (!(isNaN(m_min) || isNaN(m_max) || isNaN(r_min) || isNaN(r_max))) {
        for (var i = 0; i < movies_count_data.length; i++) {
            if (m_min <= movies_count_data[i]["year"] && movies_count_data[i]["year"] <= m_max) {
                for (var j = 0; j < movies_count_data[i]["movies_info"].length; j++) {
                    if (config_data["dataset_start_rating"] <= movies_count_data[i]["movies_info"][j]["averageRating"] && movies_count_data[i]["movies_info"][j]["averageRating"] <= config_data["dataset_end_rating"]) {
                        var ceil_rating = Math.ceil(movies_count_data[i]["movies_info"][j]["averageRating"]);
                        for (var k = 0; k < newdata.length; k++) {
                            if (newdata[k].rating === ceil_rating) {
                                newdata[k].movies_count++;
                            }
                        }
                    }
                }
            }
        }
    }
    d3.select(".sidepanel_rating_barchart").selectAll("svg > *").remove();
    x_rating.domain(newdata.map(function (d) { return d.rating; }));
    y_rating.domain([0, d3.max(newdata, function (d) { return d.movies_count + 10; })]);

    var rating_xtick = d3.range(config_data["dataset_start_rating"], config_data["dataset_end_rating"] + 1, 1);

    rating_chart.append("g")
        .attr("class", "rating_xaxis")
        .style("font-size", "13px")
        .style("font-weight", 100)
        .call(d3.axisBottom(x_rating).tickValues(rating_xtick))
        .attr("transform", "translate(55, 105)");
    rating_chart.append("g")
        .attr("class", "grid")
        .call(d3.axisTop(x_rating).tickSize(100).tickFormat(""))
        .attr("transform", "translate(55, 105)");

    rating_chart.append("g")
        .attr("class", "rating_yaxis")
        .style("font-size", "13px")
        .style("font-weight", 100)
        .call(d3.axisLeft(y_rating).ticks(5))
        .attr("transform", "translate(55,05)");
    rating_chart.append("g")
        .attr("class", "grid")
        .call(d3.axisRight(y_rating).tickSize(350).tickFormat("").ticks(5))
        .attr("transform", "translate(55, 05)");

    rating_chart.selectAll(".bar-ratings")
        .data(newdata)
        .enter().append("rect")
        .attr("class", "bar-ratings")
        .attr("id", function (d) { return d.rating; })
        .attr("x", function (d) { return x_rating(d.rating); })
        .attr("width", x_rating.bandwidth())
        .attr("y", function (d) { return y_rating(d.movies_count); })
        .attr("height", function (d) { return 100 - y_rating(d.movies_count); })
        .style("fill", "#F47E60")
        .style("cursor", "pointer")
        .attr("transform", "translate(55, 05)");

}

function updatemoviesRangeValues(minyear, maxyear) {
    var bars = $(".bar-nummovies");
    for (var i = 0; i < bars.length; i++) {
        var item = $(bars[i]);
        if (minyear > item.attr("id") || item.attr("id") > maxyear) {
            item.css("fill", "#DDD");
        } else {
            item.css("fill", "#ABBD81");
        }
    }
}

function updateratingsRangeValues(minrating, maxrating) {
    var bars = $(".bar-ratings");
    for (var i = 0; i < bars.length; i++) {
        var item = $(bars[i]);
        if (minrating > item.attr("id") || item.attr("id") > maxrating) {
            item.css("fill", "#DDD");
        } else {
            item.css("fill", "#F47E60");
        }
    }
}