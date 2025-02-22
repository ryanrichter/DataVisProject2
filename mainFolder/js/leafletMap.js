class LeafletMap {
    /**
     * Class constructor with basic configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            tooltipPadding: _config.tooltipPadding || 15,
        };
        this.data = _data;
        this.initVis();
    }

    /**
     * We initialize scales/axes and append static elements, such as axis titles.
     */
    initVis() {
        let vis = this;

        //ESRI
        vis.esriUrl =
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
        vis.esriAttr =
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

        //TOPO
        vis.topoUrl = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
        vis.topoAttr =
            'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

        //Stamen Terrain
        vis.stUrl =
            "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}";
        vis.stAttr =
            'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        //this is the base map layer, where we are showing the map background
        vis.base_layer = L.tileLayer(vis.stUrl, {
            id: "esri-image",
            attribution: vis.stAttr,
            ext: "png",
        });

        vis.theMap = L.map("my-map", {
            center: [39.1531, -84.5021],
            zoom: 11,
            layers: [vis.base_layer],
        });

        //if you stopped here, you would just have a map

        //initialize svg for d3 to add to map
        L.svg({ clickable: true }).addTo(vis.theMap); // we have to make the svg layer clickable
        vis.overlay = d3.select(vis.theMap.getPanes().overlayPane);
        vis.svg = vis.overlay.select("svg").attr("pointer-events", "auto");

        //these are the city locations, displayed as a set of dots
        vis.Dots = vis.svg
            .selectAll("circle")
            .data(vis.data)
            .join("circle")
            .attr("fill", "steelblue")
            .attr("stroke", "black")
            //Leaflet has to take control of projecting points. Here we are feeding the latitude and longitude coordinates to
            //leaflet so that it can project them on the coordinates of the view. Notice, we have to reverse lat and lon.
            //Finally, the returned conversion produces an x and y point. We have to select the the desired one using .x or .y
            .attr(
                "cx",
                (d) =>
                    vis.theMap.latLngToLayerPoint([
                        d.latitude || 0,
                        d.longitude || 0,
                    ]).x
            )
            .attr(
                "cy",
                (d) =>
                    vis.theMap.latLngToLayerPoint([
                        d.latitude || 0,
                        d.longitude || 0,
                    ]).y
            )
            .attr("r", 3)
            .on("mouseover", function (event, d) {
                //function to add mouseover event
                d3.select(this)
                    .transition() //D3 selects the object we have moused over in order to perform operations on it
                    .duration("150") //how long we are transitioning between the two states (works like keyframes)
                    .attr("fill", "red") //change the fill
                    .attr("r", 4); //change radius

                d3.select("#tooltip")
                    .style("opacity", 1)
                    .style("z-index", 10000000)
                    .html(
                        `<div class="tooltip-label">Info: ${d.DESCRIPTION}</div>`
                    );
            })
            .on("mousemove", (event) => {
                d3.select("#tooltip")
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY + 10 + "px");
            })
            .on("mouseleave", function () {
                //function to add mouseover event
                d3.select(this)
                    .transition() //D3 selects the object we have moused over in order to perform operations on it
                    .duration("150") //how long we are transitioning between the two states (works like keyframes)
                    .attr("fill", "steelblue") //change the fill
                    .attr("r", 3); //change radius

                d3.select("#tooltip").style("opacity", 0);
            })
            .on("click", (event, d) => {
                //experimental feature I was trying- click on point and then fly to it
                // vis.newZoom = vis.theMap.getZoom()+2;
                // if( vis.newZoom > 18)
                //  vis.newZoom = 18;
                // vis.theMap.flyTo([d.latitude, d.longitude], vis.newZoom);
            });

        //handler here for updating the map, as you zoom in and out
        vis.theMap.on("zoomend", function () {
            vis.updateVis();
        });
    }

    updateVis() {
        let vis = this;

        //want to see how zoomed in you are?
        // console.log(vis.map.getZoom()); //how zoomed am I

        //want to control the size of the radius to be a certain number of meters?
        vis.radiusSize = 3;

        // if( vis.theMap.getZoom > 15 ){
        //   metresPerPixel = 40075016.686 * Math.abs(Math.cos(map.getCenter().lat * Math.PI/180)) / Math.pow(2, map.getZoom()+8);
        //   desiredMetersForPoint = 100; //or the uncertainty measure... =)
        //   radiusSize = desiredMetersForPoint / metresPerPixel;
        // }

        //redraw based on new zoom- need to recalculate on-screen position
        vis.Dots.attr(
            "cx",
            (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x
        )
            .attr(
                "cy",
                (d) =>
                    vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y
            )
            .attr("r", vis.radiusSize);
    }

    renderVis() {
        let vis = this;

        vis.Dots.on("mouseover", (event, d) => {
            d3
                .select("#tooltip")
                .style("display", "block")
                .style("opacity", 1)
                .style("z-index", 999999)
                .style("left", event.pageX + vis.config.tooltipPadding + "px")
                .style("top", event.pageY + vis.config.tooltipPadding + "px")
                .html(`
            <div class="tooltip-title">${d.SERVICE_NAME}</div>
            <div><i>${d.STATUS}</i></div>
            <ul>
              <li>${d.REQUESTED_DATE}</li>
              <li>${d.UPDATED_DATE}</li>
              <li>${d.AGENCY_RESPONSIBLE}</li>
              <li>${d.DESCRIPTION}</li>
            </ul>
          `);
        })
            .on("mousemove", (event) => {
                //position the tooltip
                d3.select("#tooltip")
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY + 10 + "px");
            })
            .on("mouseleave", () => {
                d3.select("#tooltip").style("opacity", 0);
            });
    }
}
