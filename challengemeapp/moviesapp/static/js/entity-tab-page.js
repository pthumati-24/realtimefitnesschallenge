function initTabPageEntity(flower_id, data, container_width, num_petals, entity_type) {
    // console.log(data);
    var bar_chart,
        svg,
        petal_nodes;
    var scale = container_width / 1000;
    var colors = d3.interpolateRdBu;
    var height = 1000;

    // hard coding fixed number of bars to be shown in addition to the petal order
    var top_numbers = Math.min((num_petals + 20), data["total"]);
    var nodes = data["nodes"];
    var links = data["links"].slice(0, num_petals * 2);
    var bars = data["bars"].slice(0, top_numbers * 2);
    num_petals = Math.min(num_petals, (nodes.length-1));

    function get_theta(i) {
        var angles = get_angles(Math.PI, 0, num_petals);
        return angles[i - 1];
    }

    function show(selected) {
        tag = selected.tagName;
        name = d3.select(selected).attr("name");
        group = d3.select(selected).attr("node_type");
        id = d3.select(selected).attr("id");

        if (tag == "circle" && id == 0) {
            // leave out the ego node
            return
        };

        // show bars
        svg.selectAll("rect").each(function () {
            if (d3.select(this).attr("class") == "bar-chart") {
                d3.select(this).style("opacity", function (d) {
                    if (name != d.name && d.id != 0 && group == d.node_type) {
                        return 0.4;
                    }
                    else {
                        return 1;
                    }
                });
            }
        });

        // show bar text
        svg.selectAll("text").each(function () {
            if (d3.select(this).classed("bar-chart-text")) {
                d3.select(this).style("opacity", function () {
                    if (name != this.getAttribute("name")) {
                        return 0.4;
                    }
                    else {
                        return 1;
                    }
                });
            }
        });

        // show petal node text
        svg.selectAll("text").each(function () {
            if (d3.select(this).classed("petal-node-text")) {
                d3.select(this).style("opacity", function () {
                    if (id == this.id || this.id == 0) {
                        return 1;
                    }
                    else {
                        return 0.2;
                    }
                });
            }
        });

        // show petal node circles
        svg.selectAll("circle").each(function () {
            if (d3.select(this).attr("class") == "petal-node-circle") {
                d3.select(this).style("opacity", function (d) {
                    if (id != d.id && d.id != 0 && group == d.node_type) {
                        return 0.2;
                    }
                    else {
                        return 1;
                    }
                });
            }
        });

        svg.selectAll(".flower-edge-link")
            .attr('marker-end', function (d) {
                if (id == d.id && group == d.node_type) {
                    return "url(#" + d.node_type + "_" + d.type + "_" + d.id + "_selected)";
                }
                else {
                    return "url(#" + d.node_type + "_" + d.type + "_" + d.id + ")";
                }
            })
            .style("stroke", function (d) {
                if (id == d.id && group == d.node_type) {
                    if (d.type == "in") {
                        return colors(0.2);
                    }
                    else {
                        return colors(0.8);
                    }
                }
                else if (group != d.node_type) {
                    if (d.type == "in") {
                        return colors(0.25);
                    }
                    else {
                        return colors(0.75);
                    }
                } else {
                    if (d.type == "in") {
                        return colors(0.4);
                    }
                    else {
                        return colors(0.6);
                    }
                }
            })
            .style("opacity", function (d) {
                if (id != d.id && group == d.node_type) {
                    return 0.2;
                }
            });

    }

    function hide() {

        // hide petal node edge links
        svg.selectAll(".flower-edge-link")
            .attr('marker-end', function (d) {
                return "url(#" + d.node_type + "_" + d.type + "_" + d.id + ")";
            })
            .style("stroke", function (d) {
                if (d.type == "in") {
                    return colors(0.25);
                }
                else {
                    return colors(0.75);
                }
            })
            .style("opacity", function (d) {
                return 1;
            });

        // hide circles
        svg.selectAll("circle").each(function () {
            if (d3.select(this).attr("class") == "petal-node-circle") {
                d3.select(this).style("opacity", 1);
            }
        });

        // hide bars
        svg.selectAll("rect").each(function () {
            if (d3.select(this).attr("class") == "bar-chart") {
                d3.select(this).style("opacity", 1);
            }
        });

        // hide bar text
        svg.selectAll("text").each(function () {
            if (d3.select(this).classed("bar-chart-text")) {
                d3.select(this).style("opacity", 1);
            }
        });

        // hide text
        svg.selectAll("text").each(function () {
            if (d3.select(this).classed("petal-node-text")) {
                d3.select(this).style("opacity", 1);
            }
        });



    }

    function get_info_node_coordinates(context, i) {
        var parent = d3.select(context.parentNode).datum();
        var angles = get_angles(Math.PI, 0, parent['avg_movies'].length);
        var angle = angles[i];
        var x_pos = 7.2 * Math.cos(angle + parent['theta'] - Math.PI / 2);
        var y_pos = 7.2 * Math.sin(angle + parent['theta'] - Math.PI / 2);

        return [x_pos, y_pos];
    }

    function get_node_radius(size) {
        return (Math.sqrt((800 / Math.PI) * size) * scale);
    }

    function info_link_width(weight) {
        if (weight == 0) {
            return 0;
        } else {
            return 1 + 3 * weight;
        }
    }

    function get_angles(start, end, num) {
        var result = [], step = 0;
        if (num > 1)
            step = (end - start) / (num - 1);
        else
            step = 0;
        for (var i = 0; i < num; i++) {
            result.push(start + i * step);
        }

        return result;
    }

    function get_petal_node_coordinates(num) {
        var angles = get_angles(Math.PI, 0, num);

        var x_pos = {
            0: 0
        };
        var y_pos = {
            0: 0
        };

        for (var i in angles) {
            var angle = angles[i];
            x_pos[parseInt(i) + 1] = 1.2 * Math.cos(angle);
            y_pos[parseInt(i) + 1] = 1.2 * Math.sin(angle);
        }

        return [x_pos, y_pos];
    }

    function greyOutBars(num) {
        d3.selectAll("rect")
            .filter(function (d) {
                return (d.bloom_order <= num);
            })
            .style("fill", function (d) {
                if (d.type == "in") {
                    return colors(0.25);
                }
                else {
                    return colors(0.75)
                };
            });

        d3.selectAll("rect")
            .filter(function (d) {
                return (d.bloom_order > num);
            })
            .style("fill", "#DDD");
    }

    function info_node_text_anchor(theta) {
        if (theta < 0.8) {
            return "start";
        }
        else if (theta > 2.2) {
            return "end";
        }
        else {
            return "middle";
        }
    }

    svg = d3.select(flower_id);
    var flower_radius = 250;
    var center = [container_width * 0.45, height * 0.6];
    var ordering = {};
    for (var o = 0; o <= num_petals; o++) {
        // use the same order as the node bloom order since sorting is handled by backend
        ordering[o] = data.nodes[o].bloom_order
    }
    [xpos, ypos] = get_petal_node_coordinates(num_petals);

    var x = d3.scaleBand().range([center[0] - container_width * 0.3, center[0] + container_width * 0.3]).padding(0.2);
    var y = d3.scaleLinear().range([120, 0]);

    x.domain(bars.map(function (d) {
        return d.name;
    }));

    y.domain([0, d3.max(bars, function (d) {
        return d.weight;
    })]);

    // bar chart
    bar_chart = svg.append("g").selectAll("rect")
        .data(bars)
        .enter().append("rect")
        .attr("class", "bar-chart")
        .attr("id", function (d) {
            return d.id;
        })
        .attr("name", function (d) {
            return d.name;
        })
        .attr("node_type", function (d) {
            return d.node_type;
        })
        .attr("x", function (d) {
            if (d.type == "out") {
                return x(d.name) + x.bandwidth() / 2;
            }
            else {
                return x(d.name);
            }
        })
        .attr("y", function (d) {
            return y(d.weight);
        })
        .attr("width", x.bandwidth() / 2)
        .attr("height", function (d) {
            return (120 - y(d.weight));
        })
        .attr("transform", "translate(0," + (height - 50) + ")")
        .style("opacity", 1)
        .style("fill", function (d) {
            if (d.type == "in") {
                return colors(0.25);
            }
            else {
                return colors(0.75);
            }
        })
        .on("mouseover", function () {
            show(this);
        })
        .on("mouseout", function () {
            hide();
        });

    svg.append("g")
        .attr("transform", "translate(0," + (height + 70) + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .text(function (d) {
            return d;
        })
        .attr("id", function (d, i) {
            return (i + 1);
        })
        .attr("name", function (d) {
            return d;
        })
        .attr("class", "bar-chart-text node-text")
        .style("text-anchor", "end")
        .attr("dx", "-1em")
        .attr("dy", function () {
            return -x.bandwidth() / 15 - 5;
        })
        .attr("transform", "rotate(-90)")
        .style("visibility", "visible");

    svg.append("text")
        .attr("transform", "translate(" + (container_width / 1.6) + "," + (height - 70) + ")")
        .style("text-anchor", "start")
        .text("Top " + top_numbers + " of total " + data["total"] + " " + entity_type);

    svg.append("g")
        .attr("transform", "translate(" + (center[0] - container_width * 0.3) + "," + (height - 50) + ")")
        .call(d3.axisLeft(y).ticks(10));


    // flower edge arrow
    svg.append("defs").selectAll("marker")
        .data(links)
        .enter().append("marker")
        .attr("id", function (d) {
            return d.node_type + "_" + d.type + "_" + d.id;
        })
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", function (d) {
            return Math.max(9, get_node_radius(d.padding) / scale);
        })
        .attr("refY", function (d) {
            return -d.padding;
        })
        .attr("markerWidth", function (d) {
            if (d.weight == 0) {
                return 0;
            } else {
                return scale * 15;
            }
        })
        .attr("markerHeight", function (d) {
            if (d.weight == 0) {
                return 0;
            } else {
                return scale * 15;
            }
        })
        .attr("markerUnits", "userSpaceOnUse")
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .style("fill", function (d) {
            if (d.type == "in") {
                return colors(0.25);
            }
            else {
                return colors(0.75);
            }
        });

    svg.append("defs").selectAll("marker")
        .data(links)
        .enter().append("marker")
        .attr("id", function (d) {
            return d.node_type + "_" + d.type + "_" + d.id + "_selected";
        })
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", function (d) {
            return Math.max(9, get_node_radius(d.padding) / scale);
        })
        .attr("refY", function (d) {
            return -d.padding;
        })
        .attr("markerWidth", function (d) {
            if (d.weight == 0) {
                return 0;
            } else {
                return scale * 15;
            }
        })
        .attr("markerHeight", function (d) {
            if (d.weight == 0) {
                return 0;
            } else {
                return scale * 15;
            }
        })
        .attr("markerUnits", "userSpaceOnUse")
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .style("fill", function (d) {
            if (d.type == "in") {
                return colors(0.2);
            }
            else {
                return colors(0.8);
            }
        });

    flower_edge_link_g = svg.append("g");
    info_node_edge_link_g = svg.append("g").attr("class", "info-nodes-links");;
    petal_nodes_g = svg.append("g");
    info_nodes_g = svg.append("g").attr("class", "info-nodes");
    info_node_text_g = svg.append("g").attr("class", "info-nodes-text");
    info_node_circle_center_text_g = svg.append("g").attr("class", "info-nodes-text-rating");
    petal_node_text_g = svg.append("g");

    // flower nodes
    petal_nodes = petal_nodes_g.selectAll("circle .petal-node-circle")
        .data(nodes)
        .enter().append("circle")
        .attr("id", function (d) {
            // add the angle to the data structure for use in info node creation
            d['theta'] = get_theta(ordering[d.id])
            return d.id;
        })
        .attr("name", function (d) {
            return d.name;
        })
        .attr("class", "petal-node-circle")
        .attr("xpos", function (d) {
            if (ordering[d.id] == undefined) {
                // add xpos to the data structure for use in info node creation
                d['xpos'] = center[0];
                return center[0];
            } else {
                d['xpos'] = center[0] + flower_radius * xpos[ordering[d.id]];
                return center[0] + flower_radius * xpos[ordering[d.id]];
            }
        })
        .attr("ypos", function (d) {
            if (ordering[d.id] == undefined) {
                // add ypos to the data structure for use in info node creation
                d['ypos'] = center[1];
                return center[1];
            } else {
                d['ypos'] = center[1] - flower_radius * ypos[ordering[d.id]];
                return center[1] - flower_radius * ypos[ordering[d.id]];
            }
        })
        .attr("cx", function (d) {
            d['cx'] = center[0];
            return center[0];
        })
        .attr("cy", function (d) {
            if (d.id > 0) {
                d['cy'] = center[1] - flower_radius;
                return center[1] - flower_radius;
            } else {
                d['cy'] = center[1];
                return center[1];
            }
        })
        .attr("node_type", function (d) {
            return d.node_type;
        })
        .attr("r", function (d) {
            return get_node_radius(d.size);
        })
        .style("fill", function (d, i) {
            if (d.id == 0) return "#fff";
            else return colors(d.weight);
        })
        .style("stroke", function (d, i) {
            return "black";
        })
        .style("stroke-width", 0.5)
        .style("cursor", "pointer")
        .style("visibility", function (d) {
            if (d.bloom_order > num_petals) return "hidden";
            else return "visible";
        })
        .style("opacity", function (d) {
            if (d.bloom_order > num_petals) return 0.0;
            else return 1.0;
        })
        .on("mouseover", function (d) {
            show(this);
            if (d.id != 0) {
                // Info view extension implementation 
                var curr_node = d.name;
                d3.selectAll(".info-node-text")
                    .style("visibility", function (d) {
                        var node_name = d3.select(this).attr("node-name");
                        if (node_name == curr_node) {
                            return "visible"
                        } else {
                            return "hidden";
                        }
                    });
                d3.selectAll(".info-node-circle")
                    .style("visibility", function (d) {
                        var node_name = d3.select(this).attr("node-name");
                        if (node_name == curr_node) {
                            return "visible"
                        } else {
                            return "hidden";
                        }
                    });
                d3.selectAll(".info-node-link")
                    .style("visibility", function (d) {
                        var node_name = d3.select(this).attr("node-name");
                        if (node_name == curr_node) {
                            return "visible"
                        } else {
                            return "hidden";
                        }
                    });
            }
        })
        .on("mouseout", function (d) {
            hide();
            d3.selectAll(".info-node-text")
                .style("visibility", function (d) {
                    return "hidden";
                });
            d3.selectAll(".info-node-circle")
                .style("visibility", function (d) {
                    return "hidden";
                });
            d3.selectAll(".info-node-link")
                .style("visibility", function (d) {
                    return "hidden";
                });
        })
        .on("click", function (d) { })
        .transition()
        .duration(1000)
        .attr("cx", function (d) {
            if (ordering[d.id] == undefined) {
                return center[0];
            }
            else {
                return center[0] + flower_radius * xpos[ordering[d.id]];
            }
        })
        .attr("cy", function (d) {
            if (ordering[d.id] == undefined) {
                return center[1];
            }
            else {
                return center[1] - flower_radius * ypos[ordering[d.id]];
            }
        })

    // petal info nodes
    info_nodes_g.selectAll("circle .info-node-circle")
        .data(nodes)
        .enter()
        .append('g')
        .each(function (d, i) {
            if (i > 0 && i <= num_petals) {
                d3.select(this).selectAll('circle .info-node-circle')
                    .data(d.avg_movies)
                    .enter().append("circle")
                    .attr("id", function (d) {
                        return d.movie_name;
                    })
                    .attr("node-name", function (d) {
                        return d3.select(this.parentNode).datum()['name'];
                    })
                    .attr("name", function (d) {
                        return d.movie_name;
                    })
                    .attr("class", "info-node-circle")
                    .attr("cx", function (d) {
                        return center[0] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['xpos'] - center[0])) / flower_radius;
                    })
                    .attr("cy", function (d) {
                        return center[1] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['ypos'] - center[1])) / flower_radius;
                    })
                    .attr("r", function (d) {
                        return get_node_radius(0.3);
                    })
                    .style("fill", function (d, i) {
                        return "white";
                    })
                    .style("stroke", function (d, i) {
                        return "black";
                    })
                    .style("stroke-width", 0.3)
                    .style("cursor", "pointer")
                    .style("visibility", function (d) {
                        return "hidden";
                    })
                    .transition()
                    .duration(1000)
                    .attr("cx", function (d, i) {
                        return center[0] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['xpos'] - center[0])) / flower_radius + 14 * (get_info_node_coordinates(this, i)[0]);
                    })
                    .attr("cy", function (d, i) {
                        return center[1] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['ypos'] - center[1])) / flower_radius - 14 * (get_info_node_coordinates(this, i)[1]);
                    })
            }
        })

    // flower petal node text
    petal_node_text_g.selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("id", function (d) {
            return d.id;
        })
        .attr("class", function (d) {
            if (d.id == 0) {
                return 'petal-node-text ego-node-text';
            } else {
                return 'petal-node-text node-text';
            }
        })
        .attr("node_type", function (d) {
            return d.node_type;
        })
        .attr("x", function (d) {
            if (ordering[d.id] == undefined) {
                return center[0]
            } else {
                shift = 0;
                circ_dif = 5;
                xval = xpos[ordering[d.id]];

                if (xval < -.3) {
                    shift -= get_node_radius(d.size) + circ_dif;
                }
                if (xval > .3) {
                    shift += get_node_radius(d.size) + circ_dif;
                }
                return center[0] + flower_radius * xval + shift;
            }
        })
        .attr("y", function (d) {
            if (ordering[d.id] == undefined) {
                return center[1]
            } else {
                var shift = 0;
                var pscale = num_petals / 20;

                for (i = 6; i >= 0; i--) {
                    xpos_p = i / 10 + 0.05;
                    if (d.id > 0 && -xpos_p < xpos[ordering[d.id]] && xpos[ordering[d.id]] < xpos_p) {
                        shift -= (7 - i) * pscale;
                    }
                }

                if (d.id == 0) {
                    shift += 50;
                }

                return center[1] - flower_radius * ypos[ordering[d.id]] + shift;
            }
        })
        .attr("text-anchor", function (d) {
            if (xpos[ordering[d.id]] < -0.1) {
                return "end";
            }
            else if (xpos[ordering[d.id]] > 0.1) {
                return "start";
            }
            else {
                return "middle";
            }
        })
        .text(function (d) {
            return d.name;
        })
        .style("fill", function (d) {
            return "black";
        })
        .attr("node_size", function (d) {
            return d.size;
        })
        .style("visibility", function (d) {
            if (d.bloom_order > num_petals) {
                return "hidden";
            }
            return "visible";
        })
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", function (d) {
            return 1;
        })

    info_node_text_g.selectAll("text .info-node-text")
        .data(nodes)
        .enter()
        .append('g')
        .each(function (d, i) {
            if (i > 0 && i <= num_petals) {
                d3.select(this).selectAll('text .info-node-text')
                    .data(d.avg_movies)
                    .enter().append("text")
                    .attr("id", function (d) {
                        return d.movie_name;
                    })
                    .style("font-size", "0.7em")
                    .style("font-weight", "500")
                    .attr("node-name", function (d) {
                        return d3.select(this.parentNode).datum()['name'];
                    })
                    .attr("class", function (d) {
                        return 'info-node-text node-text';
                    })
                    .attr("x", function (d, i) {
                        return center[0] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['xpos'] - center[0])) / flower_radius + 14 * (get_info_node_coordinates(this, i)[0]);
                    })
                    .attr("y", function (d, i) {
                        return center[1] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['ypos'] - center[1])) / flower_radius - 14 * (get_info_node_coordinates(this, i)[1]);
                    })
                    .attr("text-anchor", function () {
                        return info_node_text_anchor(d3.select(this.parentNode).datum()['theta']);
                    })
                    .text(function (d) {
                        return d.movie_name;
                    })
                    .attr("dy", function () {
                        var anchor = info_node_text_anchor(d3.select(this.parentNode).datum()['theta']);
                        if (anchor == "middle") {
                            return -12;
                        }
                    })
                    .attr("dx", function () {
                        var anchor = info_node_text_anchor(d3.select(this.parentNode).datum()['theta']);
                        if (anchor == "start") {
                            return 11;
                        } else if (anchor == "end") {
                            return -11;
                        }
                    })
                    .style("fill", function (d) {
                        return "black";
                    })
                    .style("visibility", function (d) {
                        return "hidden";
                    })
                    .style("opacity", 0.0)
                    .transition()
                    .duration(1000)
                    .style("opacity", function (d) {
                        return 1.0;
                    })
            }
        })

    info_node_circle_center_text_g.selectAll("text .info-node-text")
        .data(nodes)
        .enter()
        .append('g')
        .each(function (d, i) {
            if (i > 0 && i <= num_petals) {
                d3.select(this).selectAll('text .info-node-text')
                    .data(d.avg_movies)
                    .enter().append("text")
                    .attr("id", function (d) {
                        return d.movie_name;
                    })
                    .style("font-size", "0.8em")
                    .style("font-weight", "700")
                    .attr("node-name", function (d) {
                        return d3.select(this.parentNode).datum()['name'];
                    })
                    .attr("class", function (d) {
                        return 'info-node-text node-text';
                    })
                    .attr("x", function (d, i) {
                        return center[0] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['xpos'] - center[0])) / flower_radius + 14 * (get_info_node_coordinates(this, i)[0]);
                    })
                    .attr("y", function (d, i) {
                        return center[1] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['ypos'] - center[1])) / flower_radius - 14 * (get_info_node_coordinates(this, i)[1]);
                    })
                    .attr("text-anchor", function (d, i) {
                        return "middle";
                    })
                    .attr("dy", function (d, i) {
                        return 4;
                    })
                    .text(function (d) {
                        return d.movie_rating;
                    })
                    .style("fill", function (d) {
                        return "#838383";
                    })
                    .style("visibility", function (d) {
                        return "hidden";
                    })
                    .style("opacity", 0.0)
                    .transition()
                    .duration(1000)
                    .style("opacity", function (d) {
                        return 1.0;
                    })
            }
        })

    // info node edge links
    info_node_edge_link_g.selectAll("path .info-node-link")
        .data(nodes)
        .enter()
        .append('g')
        .each(function (d, i) {
            if (i > 0 && i <= num_petals) {
                d3.select(this).selectAll('path .info-node-link')
                    .data(d.avg_movies)
                    .enter().append("path")
                    .attr("id", function (d) {
                        return d.movie_name;
                    })
                    .attr("d", function (d, i) {
                        var sx = d3.select(this.parentNode).datum()['xpos'];
                        var sy = d3.select(this.parentNode).datum()['ypos'];
                        var tx = center[0] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['xpos'] - center[0])) / flower_radius + 14 * (get_info_node_coordinates(this, i)[0]);
                        var ty = center[1] + ((flower_radius + 100) * (d3.select(this.parentNode).datum()['ypos'] - center[1])) / flower_radius - 14 * (get_info_node_coordinates(this, i)[1]);
                        var dx = tx - sx,
                            dy = ty - sy,
                            dr = 10 * Math.sqrt(dx * dx + dy * dy);
                        return "M" + sx + "," + sy + "A" + dr + "," + dr + " 0 0,1 " + tx + "," + ty;
                    })
                    .attr("class", function (d) {
                        return "info-node-link " + d.movie_name;
                    })
                    .attr("node-name", function (d) {
                        return d3.select(this.parentNode).datum()['name'];
                    })
                    .style("stroke-width", function (d) {
                        var movies = d3.select(this.parentNode).datum()['avg_movies'];
                        var min = movies[0]["movie_rating"];
                        var max = movies[0]["movie_rating"];
                        for (var i = 0; i < movies.length; i++) {
                            if (movies[i]["movie_rating"] < min) {
                                min = movies[i]["movie_rating"];
                            }
                            if (movies[i]["movie_rating"] > max) {
                                max = movies[i]["movie_rating"];
                            }
                        }
                        // normalize
                        var normalized_weight = (d.movie_rating - min) / (max - min)
                        if ((d.movie_rating - min) === 0 && d.movie_rating != 0) {
                            normalized_weight = 0.001;
                        }
                        return scale * info_link_width(normalized_weight);
                    })
                    .style("stroke", function (d) {
                        return "#ABBD81";
                    })
                    .style("visibility", function (d) {
                        return "hidden";
                    })
            }
        })

    // flower edges
    flower_edge_link_g.selectAll("path .flower-edge-link")
        .data(links)
        .enter().append("path")
        .attr("id", function (d) {
            return d.id;
        })
        .attr('marker-end', function (d) {
            return "url(#" + d.node_type + "_" + d.type + "_" + d.id + ")";
        })
        .attr("d", function (d) {
            var source_node = petal_nodes._groups[0][d.source];
            var target_node = petal_nodes._groups[0][d.target];
            var d_x = parseInt(target_node.getAttribute("cx")) - parseInt(source_node.getAttribute("cx"));
            var d_y = parseInt(target_node.getAttribute("cy")) - parseInt(source_node.getAttribute("cy"));
            return "M" + parseInt(source_node.getAttribute("cx")) + "," + parseInt(source_node.getAttribute("cy")) + "A" + Math.sqrt(d_x * d_x + d_y * d_y) + "," + Math.sqrt(d_x * d_x + d_y * d_y) + " 0 0,1 " + parseInt(target_node.getAttribute("cx")) + "," + parseInt(target_node.getAttribute("cy"));
        })
        .attr("node_type", function (d) {
            return d.node_type;
        })
        .attr("class", function (d) {
            return "flower-edge-link " + d.type;
        })
        .attr("type", function (d) {
            d.type
        })
        .style("stroke-width", function (d) {
            if (d.weight == 0) {
                return 0;
            } else {
                return 1 + 8 * d.weight;
            }
        })
        .style("stroke", function (d) {
            if (d.type == "in") {
                return colors(0.25);
            }
            else {
                return colors(0.75);
            }
        })
        .style("visibility", function (d) {
            if (d.bloom_order > num_petals) {
                return "hidden";
            } else {
                return "visible";
            }
        })
        .style("opacity", function (d) {
            if (d.bloom_order > num_petals) {
                return 0;
            }
            else return 1;
        })
        .transition()
        .duration(1000)
        .attr("d", function (d) {
            var source_node = petal_nodes._groups[0][d.source];
            var target_node = petal_nodes._groups[0][d.target];
            var d_x = parseInt(target_node.getAttribute("xpos")) - parseInt(source_node.getAttribute("xpos"));
            var d_y = parseInt(target_node.getAttribute("ypos")) - parseInt(source_node.getAttribute("ypos"));
            return "M" + parseInt(source_node.getAttribute("xpos")) + "," + parseInt(source_node.getAttribute("ypos")) + "A" + Math.sqrt(d_x * d_x + d_y * d_y) + "," + Math.sqrt(d_x * d_x + d_y * d_y) + " 0 0,1 " + parseInt(target_node.getAttribute("xpos")) + "," + parseInt(target_node.getAttribute("ypos"));
        })

    for (var bar_index = 0; bar_index < bar_chart["_groups"][0].length; bar_index++) {
        var bname = bar_chart["_groups"][0][bar_index].getAttribute("name");
        if ($("circle[name='" + bname + "']")[0] == undefined)
            bar_chart["_groups"][0][bar_index].style = "fill:#ddd"
    }
    greyOutBars(num_petals);
}

