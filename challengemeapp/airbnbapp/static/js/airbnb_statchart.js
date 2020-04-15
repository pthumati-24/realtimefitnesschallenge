class ReviewChart {
  constructor(divid){
    this.svg2 = d3.select("#reviews_bar_chart").append("svg").attr("width","100%").append("g")
    .attr("transform",
      "translate(" + 40 + "," + 40 + ")");
      this.data;
      this.lisitngdata;
  }

  initChart(result) {
    this.data = result;
    this.svg2.selectAll("rect").remove();
    this.svg2.selectAll("g").remove();
    var width = 350,
      height = 100;
    var x1 = d3.scaleBand()
      .range([0, width])
      .padding(0.1);
    var y1 = d3.scaleLinear()
      .range([height, 0]);

    x1.domain(this.data.map(function (d) { return d.year; }));
    y1.domain([0, d3.max(this.data, function(d){ return +d.num_of_reviews;})])
    // y1.domain(d3.extent(result, function (d) {
    //   return +d.num_of_reviews;
    // }));

    // var svg2 = d3.select("#reviews_bar_chart").append("svg").attr("width","100%")
      // .attr("width", width)
      // .attr("height", height)
      // this.svg2
      // .append("g")
      // .attr("transform",
      //   "translate(" + 40 + "," + 40 + ")");
      this.svg2.append("g")
      .attr("class", "grid")
      .call(d3.axisBottom(x1)
        .tickSize(height).tickFormat(""));
      
        this.svg2.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y1).tickSize(-width).tickFormat("").ticks(7));

    this.svg2.selectAll(".review-bar")
      .data(this.data)
      .enter().append("rect")
      .style("fill", function (d) {
        return "#e48268"
      })
      .attr("class", "review-bar")
      .attr("id", function (d) { return d.year; })
      .attr("data", function(d){ return d.num_of_reviews; })
      .attr("x", function (d) {
        return x1(d.year);
      })
      .attr("width", x1.bandwidth())
      .attr("y", function (d) {
        return y1(d.num_of_reviews);
      })
      .attr("height", function (d) { return height - y1(d.num_of_reviews); })
      // .on("mouseover", function (d) {
      //   var year = d.year;
      //   this.svg2.selectAll("rect")
      //     .style("opacity", function (d) {
      //       if (d.year == year) {
      //         return 1;
      //       } else {
      //         return 0.25;
      //       }
      //     })
      // })
      // .on("mouseout", function (d) {
      //   this.svg2.selectAll("rect")
      //     .style("opacity", 1);
      // })


      this.svg2.append("g")
      // .attr("transform", "translate(0," + 0 + ")")
      .call(d3.axisTop(x1)
        .tickFormat(function (d) {
          return d;
        }));
    
        

    // add the y Axis
    this.svg2.append("g")
    .attr("class", "axis axis--y")
      .call(d3.axisLeft(y1).tickFormat(function(d){
        return +d/1000 + "K";
      }).ticks(7));
    
    
    
    var review_num=0;
    this.data.forEach(function(d){
      // console.log(d);
      review_num += +d.num_of_reviews;
    });
    var num_of_years = Object.keys(this.data).length;
    var min_year = this.data.reduce((min, some) => Math.min(min, some.year), this.data[0].year);
    var max_year = this.data.reduce((max, some) => Math.max(max, some.year), this.data[0].year);
    $("#stats_total").text(num_of_years+" years of listing history "+min_year+"~"+max_year);
    $("#review_stat").text(review_num+" reviews total, "+(review_num/num_of_years).toFixed(2)+" per year.");
    $("#review_range").text("Reviews: "+min_year+"~"+max_year);
    $("#review_count").text("Reviews: "+review_num);
  }

  updateRangeValues( minyear, maxyear) {
    var result = this.data;
    var bars = $(".review-bar");
    var review_num=0;
    for (var i = 0; i < bars.length; i++) {
      var each_bar = $(bars[i]);
      if (minyear > each_bar.attr("id") || each_bar.attr("id") > maxyear) {
        // review_num += each_bar.attr("data");
        // console.log(each_bar.attr("data"));
        each_bar.css("fill", "#DDD");
      } else {
        review_num += parseInt(each_bar.attr("data"));
        each_bar.css("fill", "#e48268");
      }
    }
    $("#review_count").text("Reviews: "+review_num);
    $("#review_range").text("Reviews: "+minyear+"~"+maxyear);
  }
}

class ListingChart {

  initChart(result) {
    var width = 350,
      height = 100;
    var x1 = d3.scaleBand()
      .range([0, width])
      .padding(0.1);

    var y2 = d3.scaleLinear()
      .range([height, 0]);

    x1.domain(result.map(function (d) { return d.year; }));
    y2.domain(d3.extent(result, function (d) {
      return +d.num_of_listings;
    }));

    var svg3 = d3.select("#listings_bar_chart").append("svg").attr("width","100%")
      .append("g")
      .attr("transform",
        "translate(" + 40 + "," + 5 + ")");
      
      svg3.append("g")
        .attr("class", "grid")
        .call(d3.axisBottom(x1)
          .tickSize(height).tickFormat(""));
      svg3.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y2).tickSize(-width).tickFormat("").ticks(7));

    svg3.selectAll(".listing-bar")
      .data(result)
      .enter().append("rect")
      .style("fill", function (d) {
        return "#6bacd0"
      })
      .attr("class", "listing-bar")
      .attr("id", function (d) { return d.year; })
      .attr("data", function(d){ return d.num_of_listings; })
      .attr("x", function (d) {
        return x1(d.year);
      })
      .attr("width", x1.bandwidth())
      .attr("y", function (d) {
        return y2(d.num_of_listings);
      })
      .attr("height", function (d) { return height - y2(d.num_of_listings); })
      // .on("mouseover", function (d) {
      //   var year = d.year;
      //   svg3.selectAll("rect")
      //     .style("opacity", function (d) {
      //       if (d.year == year) {
      //         return 1;
      //       } else {
      //         return 0.25;
      //       }
      //     })
      // })
      // .on("mouseout", function (d) {
      //   svg3.selectAll("rect")
      //     .style("opacity", 1);
      // })


    svg3.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x1)
        .tickFormat(function (d) {
          return d;
        }));
    
    //   .selectAll("text")
    // .attr("y", 0)
    // .attr("x", 40)
    // .attr("dy", ".35em")
    // .attr("transform", "rotate(90)");


    // add the y Axis
    svg3.append("g")
      .call(d3.axisLeft(y2).tickFormat(function(d){
        return +d/1000 + "K";
      }).ticks(7));

    

    var lisitng_num=0;
    result.forEach(function(d){
      // console.log(d);
      lisitng_num += +d.num_of_listings;
    });
    var num_of_years = Object.keys(result).length;
    var min_year = result.reduce((min, some) => Math.min(min, some.year), result[0].year);
    var max_year = result.reduce((max, some) => Math.max(max, some.year), result[0].year);
    $("#listing_stat").text(lisitng_num+" listing total, "+(lisitng_num/num_of_years).toFixed(2)+" per year.");
    $("#listing_count").text("Listings: "+lisitng_num);
    $("#listing_range").text("Listings: "+min_year+"~"+max_year);
  }

  updateRangeValues(minyear, maxyear) {
    var bars = $(".listing-bar");
    var listing_num=0;
    for (var i = 0; i < bars.length; i++) {
      var each_bar = $(bars[i]);
      if (minyear > each_bar.attr("id") || each_bar.attr("id") > maxyear) {
        each_bar.css("fill", "#DDD");
      } else {
        listing_num += parseInt(each_bar.attr("data"));
        each_bar.css("fill", "#6bacd0");
      }
    }
    $("#listing_count").text("Listings: "+listing_num);
    $("#listing_range").text("Reviews: "+minyear+"~"+maxyear);
  }
}


class BottomChart {
  initChart(result) {
    var width = 1200,
        height = 300;

    var x = d3.scaleBand()
              .range([0, width])
              .padding(0.2);


    var y = d3.scaleLinear()
              .range([height-100, 0]);

    d3.select("#bar_chart").select("svg").remove();

    var svg = d3.select("#bar_chart").append("svg")
                // .attr("width", "100%")
                .attr("width", width)
                .attr("height", height+20)
                .append("g")
                .attr("transform",
                  "translate(" + 431 + "," + 0 + ")");


    x.domain(result.map(function (d) { return d.neighbourhood; }));
    y.domain(d3.extent(result, function (d) {
      return +d.count;
    }));


    svg.selectAll(".bar")
      .data(result)
      .enter().append("rect")
      .style("fill", function (d) {
        if (d.type == "review")
          return "#e48268"
        else
          return "#6bacd0"
      })
      .attr("class", "bar")
      .attr("x", function (d) {
          if (d.type == "review")
            return x(d.neighbourhood);
          else
            return x(d.neighbourhood);
      })
      .attr("width", x.bandwidth())
      .attr("y", function (d) {
        return y(d.count)-100;
      })
      .attr("height", function (d) { return height - y(d.count); })
      .on("mouseover", function (d) {
        var neighbourhood = d.neighbourhood;
        svg.selectAll("rect")
          .style("opacity", function (d) {
            if (d.neighbourhood == neighbourhood) {
              return 1;
            } else {
              return 0.25;
            }
          })
      })
      .on("mouseout", function (d) {
        svg.selectAll("rect")
          .style("opacity", 1);
      })


    svg.append("g")
      .attr("transform", "translate(0," + 200 + ")")
      .call(d3.axisBottom(x)
        .tickFormat("").ticks(15));


    // add the y Axis
    svg.append("g")
      .call(d3.axisLeft(y).tickFormat(function(d){ return d/1000 + "K";}).ticks(5));
  }
}