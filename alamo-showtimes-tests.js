var fs = require('fs');
var alamoJs = require('./alamo-showtimes.js');

fs.readFile('alamo-example-feed-9-3.json', 'utf8', (err, data) => {
    if (err) console.log(err);
    var alamoFeed = JSON.parse(data);

    // dates length should be 38
    var alamoDatesSize = alamoFeed["Market"]["Dates"].length;
    if (alamoDatesSize !== 38) {
        console.error("Expected 38 dates in example feed but found " + alamoDatesSize);
    }

    var movies = alamoJs.getMovieData(alamoFeed);
    logJson(movies);

    // there are 4 showtimes for THE ROOM in the example feed
    var theRoomShowtimes = Object.values(movies["THE ROOM Movie Party (Digital)"]["theaters"]).reduce((showtimes, currentTheater) => {
        return showtimes.concat(Object.values(currentTheater));
      }, []);    
    var theRoomShowtimesSize = theRoomShowtimes.length;
    if (theRoomShowtimesSize !== 4) {
        console.error("Expected THE ROOM to have four showtimes but found " + theRoomShowtimes.length);
    }

    // check for duplicate showtimes using copy of list
    var theRoomShowtimesCopy = theRoomShowtimes.slice();
    for (var i = 0; i < theRoomShowtimesSize; i++) {
        theRoomShowtimesCopy.splice(i);
        var showtime = theRoomShowtimes[i];
        if (theRoomShowtimesCopy.indexOf(showtime) !== -1) {
            console.error("Found duplicate showtime for THE ROOM: " + showtime);
        }
    }
});

function logJson(json) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Parameters
    console.log(JSON.stringify(json, null, 4));
}
