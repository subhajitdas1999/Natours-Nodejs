//******************************************************************************************************************************************* */

//MAPBOX AND MONGODB ACCEPTS LOCATION IN [LONGITUDE,LATITUDE] FORMAT


//******************************************************************************************************************************************* */

const locations = JSON.parse(document.getElementById("map").dataset.locations);
// console.log(locations);

mapboxgl.accessToken =
  "pk.eyJ1Ijoic3ViaGFqaXRkYXMiLCJhIjoiY2t6ZmRzczY0MHE3MTJ5bnJhcXo1cXA0dyJ9.QBfkXShXMAouVFOfDmVvzQ";
var map = new mapboxgl.Map({
  container: "map", //container map means it will put the map in a element with the id of map
  style: "mapbox://styles/subhajitdas/ckzql57vf001h15jvzcvax26r",
  scrollZoom: false,
  // center:[77.2090,28.6139],     //map center appear in that [lng,lat]
  // zoom:10 ,  //how much zoomed in
  // interactive:false //then the map will  be a  non interactive(a image type)
});

//Add our locations in the map

const bounds = new mapboxgl.LngLatBounds();

locations.forEach((loc) => {
  // Create A marker
  const el = document.createElement("div");
  el.className = "marker"; // div with marker className have designed image in css

  //Add the marker
  new mapboxgl.Marker({
    element: el,
    anchor: "bottom", //bottom of marker should point to the location
  })
    .setLngLat(loc.coordinates)
    .addTo(map);

  //Add a popup
  new mapboxgl.Popup({
    offset:30
  })
    .setLngLat(loc.coordinates)
    .setHTML(`<p>Day ${loc.day} ,${loc.description}</p>`)
    .addTo(map);

  //Extend map bounds to include current location
  bounds.extend(loc.coordinates);
});

// the map should actually fit the bounds and added some paddings around the bounds for nicer view
map.fitBounds(bounds, {
  padding: {
    top: 200,
    bottom: 200,
    left: 100,
    right: 100,
  },
});

// https://docs.mapbox.com/mapbox-gl-js/guides/
