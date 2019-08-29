// Written by William Yin

let svg = d3.select("#graph"),
    svg_node = svg.node(),
    svg_width = svg_node.clientWidth,
    svg_height = svg_node.clientHeight;

let yScale = d3.scaleLinear()
    .domain([-10, 10])
    .rangeRound([svg_height, 0]);

let xScale = d3.scaleLinear()
    .domain([svg_width * yScale.domain()[0] / svg_height, svg_width * yScale.domain()[1] / svg_height])
    .rangeRound([0, svg_width]);

let line = d3.line()
    .x(d => xScale(d[0]))
    .y(d => yScale(d[1]));

let funcs = [];

function chooseColor() {
    for(let color of d3.schemeCategory10) {
        let used = false;
        for(let func of funcs) {
            if(color === func.color) {
                used = true;
                break;
            }
        }
        if(!used) return color;
    }
}

function drawGrid() {
    let lines_y = 20,
        lines_x = lines_y * svg_width / svg_height,
        tick_delta = (yScale.domain()[1] - yScale.domain()[0]) / 20,
        ticks_y = Math.abs(lines_y - 4 * Math.abs(Math.log10(tick_delta))),
        ticks_x = ticks_y * svg_width / svg_height;

    svg.append("g")
        .selectAll(".grid_x")
        .data(yScale.ticks(lines_y))
        .enter()
        .append("path")
        .attr("d", d => line([[xScale.domain()[0], d], [xScale.domain()[1], d]]))
        .attr("class", "grid_x");

    svg.append("g")
        .selectAll(".grid_y")
        .data(xScale.ticks(lines_x))
        .enter()
        .append("path")
        .attr("d", d => line([[d, yScale.domain()[0]], [d, yScale.domain()[1]]]))
        .attr("class", "grid_y");

    let x_axis = svg.append("path")
        .attr("d", line([[xScale.domain()[0], 0], [xScale.domain()[1], 0]]))
        .attr("class", "axis_x");

    let y_axis = svg.append("path")
        .attr("d", line([[0, yScale.domain()[0]], [0, yScale.domain()[1]]]))
        .attr("class", "axis_y");

    svg.append("g")
        .selectAll(".tick_value_x")
        .data(xScale.ticks(ticks_x))
        .enter()
        .append("text")
        .text(d => d)
        .attr("x", d => xScale(d) + 3)
        .attr("y", yScale(0) + 6)
        .attr("class", "tick_value_x");

    svg.append("g")
        .selectAll(".tick_value_y")
        .data(yScale.ticks(ticks_y))
        .enter()
        .append("text")
        .text(d => d ? d : "")
        .attr("x", xScale(0) - 6)
        .attr("y", d => yScale(d) - 4)
        .attr("class", "tick_value_y")
}

function drawFunc(f) {
    if(!f) {
        return;
    }

    let lines_3d = [],
        x_max = xScale.range()[1],
        f_code = math.compile(f.expr),
        line_2d = [],
        y_prev = null;

    for(let x_val of d3.range(x_max)) {
        let x_val_domain = xScale.invert(x_val),
            y_val_domain = f_code.evaluate({x : x_val_domain, y : f.expr});

        if(y_val_domain === Number.NEGATIVE_INFINITY ||
        y_val_domain === Number.POSITIVE_INFINITY ||
        (y_prev && Math.abs(y_val_domain - y_prev) > 100 &&
        y_prev * y_val_domain < 0)){
            if(line_2d.length !== 0) lines_3d.push(line_2d);
            line_2d = [];
        } else {
            line_2d.push([x_val_domain, y_val_domain]);
        }
        y_prev = y_val_domain;
    }
    if(line_2d.length !== 0) lines_3d.push(line_2d);

    for(let line_points of lines_3d) {
        svg.append("path")
            .attr("d", line(line_points))
            .attr("class", "func")
            .attr("stroke", f.color)
            .on("mouseover", function() {
                let x_pos = d3.mouse(this)[0],
                    y_pos = d3.mouse(this)[1];

                let tooltip = d3.select("#tooltip")
                    .classed("hidden", false)
                    .style("left", "calc(" + x_pos + "px + 8em)")
                    .style("top", y_pos + "px");

                tooltip.select("#value")
                    .text("(" + xScale.invert(x_pos).toFixed(3) + ", "
                        + yScale.invert(y_pos).toFixed(3) + ")")
                    .style("color", f.color);

                tooltip.select("#eqn")
                    .text("y = " + f.expr)
                    .style("color", f.color);
            })
            .on("mouseout", function() {
                d3.select("#tooltip")
                    .attr("class", "hidden");
            });
    }
}

function draw(fs) {
    svg.selectAll("*")
        .remove();
    drawGrid();

    if(!fs) {
        return;
    }
    for(let f of fs) {
        drawFunc(f);
    }
}

draw(funcs);

window.onresize = function() {
    svg_height = window.innerHeight;
    svg_width = window.innerWidth;
    yScale.rangeRound([svg_height, 0]);
    xScale.domain([svg_width * yScale.domain()[0] / svg_height, svg_width * yScale.domain()[1] / svg_height])
        .rangeRound([0, svg_width]);
    draw(funcs);
};

let isDragging = false,
    x_drag = 0,
    y_drag = 0;

svg.on("mousedown", function() {
    isDragging = true;
    x_drag = d3.mouse(this)[0];
    y_drag = d3.mouse(this)[1]
});

svg.on("mouseup", function() {
    if(isDragging) {
        isDragging = false;
        x_drag = y_drag = 0;
    }
});

svg.on("mousemove", function() {
    if(isDragging) {
        d3.event.preventDefault();

        let x_delta = -(xScale.invert(d3.mouse(this)[0]) - xScale.invert(x_drag));
        x_drag = d3.mouse(this)[0];
        xScale.domain([xScale.domain()[0] + x_delta, xScale.domain()[1] + x_delta]);

        let y_delta = -(yScale.invert(d3.mouse(this)[1]) - yScale.invert(y_drag));
        y_drag = d3.mouse(this)[1];
        yScale.domain([yScale.domain()[0] + y_delta, yScale.domain()[1] + y_delta]);

        draw(funcs);
    }
});

svg.on("mouseleave", function() {
    if(isDragging) {
        isDragging = false;
        x_drag = y_drag = 0;
    }
});

svg.on("mousewheel", function() {
    if((((yScale.domain()[1] - yScale.domain()[0]) / 20) <= 0.0001) && d3.event.wheelDelta > 0) {
        return;
    } else if((((yScale.domain()[1] - yScale.domain()[0]) / 20) >= 10000) && d3.event.wheelDelta < 0) {
        return;
    }

    const zoom = 1.06;
    d3.event.preventDefault();

    let center_x = (xScale.domain()[1] + xScale.domain()[0]) / 2;
    let zoom_dist_x = d3.event.wheelDelta > 0 ? (center_x - xScale.domain()[0]) / zoom : (center_x - xScale.domain()[0]) * zoom;
    xScale.domain([center_x - zoom_dist_x, center_x + zoom_dist_x]);

    let center_y = (yScale.domain()[1] + yScale.domain()[0]) / 2;
    let zoom_dist_y = d3.event.wheelDelta > 0 ? (center_y - yScale.domain()[0]) / zoom : (center_y - yScale.domain()[0]) * zoom;
    yScale.domain([center_y - zoom_dist_y, center_y + zoom_dist_y]);

    draw(funcs);
});

let clear_button = d3.select("#clear");

clear_button.on("click", function() {
    d3.selectAll(".typing")
        .each(function(d, i) {
            if(i > 0) {
                this.remove();
            }
        });
    d3.selectAll(".field")
        .remove();
    funcs = [];
    draw();
});

function createDiv(input, fxn, createNew) {
    fxn.expr = fxn.expr.toLowerCase();
    try {
        math.compile(fxn.expr).evaluate({x : 0, y : fxn.expr});
    } catch(error) {
        return new Error("Invalid Input");
    }

    let new_div;
    if(!createNew) {
        new_div = d3.select(input.parentNode)
            .classed("typing", false)
            .attr("class", "field");
    } else {
        new_div  = d3.select(".sidebar")
            .insert("div", ".field")
            .attr("class", "field");
    }

    new_div.append("button")
        .attr("class", "delete")
        .text("-")
        .datum(createNew ? funcs.length : d3.select(input).datum())
        .on("click", function() {
            d3.select(this.parentNode)
                .remove();
            funcs.splice(d3.select(this)
                .datum(), 1);
            draw(funcs);
        });

    let fxn_div = new_div.append("div")
        .attr("class", "fxn")
        .text("`y=" + fxn.expr + "`");

    if(input.value.includes("=")) {
        fxn_div.text("`" + fxn.expr + "`")
    }

    if(createNew) {
        fxn_div.style("color", fxn.color)
            .datum(funcs.length);
    } else {
        fxn_div.style("color", fxn.color)
            .datum(d3.select(input).datum());
    }

    fxn_div.on("click", function() {
        createInput(this);
        this.remove();
    });

    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
}

function createInput(div) {
    let datum = d3.select(div)
        .datum();

    d3.select(div.parentNode)
        .classed("field", false)
        .attr("class", "typing")
        .append("input")
        .attr("class", "expr")
        .attr("type", "text")
        .datum(datum)
        .property("value", funcs[datum].expr)
        .on("blur", function() {
            if(!this.value) {
                funcs.splice(datum, 1);
                draw(funcs);
                d3.select(this.parentNode)
                    .remove();
            } else {
                if(createDiv(this, funcs[datum], false) instanceof Error) {
                    return d3.select(this)
                        .classed("invalid", true);
                }
                this.remove();
                funcs[datum].expr = this.value;
                draw(funcs)
            }
        })
        .on("keydown", function() {
            if(d3.event.keyCode === 13 && this.value) {
                this.blur();
            }
        })
        .node()
        .focus();
}

let first_fxnbox = d3.select("#first");

first_fxnbox.on("keydown", function() {
    if(d3.event.keyCode === 13 && this.value) {
        d3.select(this)
            .classed("invalid", false);
        if(funcs.length >= 10) {
            return d3.select(this)
                .classed("invalid", true);
        }
        let f = {expr : this.value, color : chooseColor()};
        if(createDiv(this, f, true) instanceof Error) {
            return d3.select(this)
                .classed("invalid", true);
        }
        funcs.push(f);
        draw(funcs);
        this.value = "";
    }
});

d3.select("#center")
    .on("click", function() {
        yScale = d3.scaleLinear()
            .domain([-10, 10])
            .rangeRound([svg_height, 0]);

        xScale = d3.scaleLinear()
            .domain([svg_width * yScale.domain()[0] / svg_height, svg_width * yScale.domain()[1] / svg_height])
            .rangeRound([0, svg_width]);
        draw(funcs);
    });