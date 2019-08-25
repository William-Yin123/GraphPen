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

function drawGrid() {
    let ticks_y = 20;
    let ticks_x = ticks_y * svg_width / svg_height;

    svg.append("g")
        .selectAll(".grid_x")
        .data(yScale.ticks(ticks_y))
        .enter()
        .append("path")
        .attr("d", d => line([[xScale.domain()[0], d], [xScale.domain()[1], d]]))
        .attr("class", "grid_x");

    svg.append("g")
        .selectAll(".grid_y")
        .data(xScale.ticks(ticks_x))
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

function drawFunc(f, color) {
    if(!f) {
        return;
    }

    let points = [];
    let x_max = xScale.range()[1];
    let f_code = math.compile(f);

    for(let x_val of d3.range(x_max)) {
        let x_val_domain = xScale.invert(x_val);
        let y_val_domain = f_code.evaluate({x : x_val_domain});
        if(!isNaN(y_val_domain)) points.push([x_val_domain, y_val_domain]);
    }

    svg.append("path")
        .attr("d", line(points))
        .attr("class", "func")
        .attr("stroke", color);
}

function draw(fs) {
    svg.selectAll("*")
        .remove();
    drawGrid();

    if(!fs) {
        return;
    }
    for(let i in fs) {
        drawFunc(fs[i], d3.schemeCategory10[i]);
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

        console.log("x_delta = " + x_delta);
        console.log("y_delta = " + y_delta);
    }
});

svg.on("mouseleave", function() {
    if(isDragging) {
        isDragging = false;
        x_drag = y_drag = 0;
    }
});

svg.on("mousewheel", function() {
    const zoom = 1.03;
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
    d3.selectAll(".field")
        .each(function(d, i) {
            if(i > 0) {
                this.remove();
            }
        });
    funcs = [];
    draw();
});

let textbox = d3.select(".expr");

textbox.on("keydown", function() {
    if(d3.event.keyCode === 13 && this.value) {
        let new_div = d3.select(".sidebar")
            .append("div")
            .attr("class", "field");
        new_div.append("input")
            .attr("class", "expr")
            .attr("value", this.value)
            .style("color", d3.schemeCategory10[funcs.length]);
        new_div.append("button")
            .attr("class", "delete")
            .text("-")
            .datum(funcs.length)
            .on("click", function() {
                d3.select(this.parentNode)
                    .remove();
                funcs.splice(d3.select(this)
                    .datum(), 1);
                draw(funcs);
            });
        // MathJax.Hub.Queue(["Text", MathJax.Hub.getAllJax(new_element.node())[0], this.value]);
        funcs.push(this.value);
        draw(funcs);
        this.value = "";
    }
});