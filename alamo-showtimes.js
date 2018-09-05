// For node
if (typeof module !== "undefined") {
  module.exports = {
    "getMovieData": getMovieDataByName
  }
}

function displayMoviesByName(alamoFeed) {
  var movies = getMovieDataByName(alamoFeed);
  var sortedMovieNames = sortMoviesByStartDate(movies);

  for (var i = 0; i < sortedMovieNames.length; i++) {
    var movieName = sortedMovieNames[i];
    var movieInfo = movies[movieName];
    var movieDetailsLink = movieInfo["link"];
    var runTime = movieInfo["runTime"];
    var movieTheaters = Object.keys(movieInfo["theaters"]).join(", ");
    // Flatten showtimes for all theaters into one list and sort them from earliest to latest
    // TODO:  Change object structure so this isn't necessary
    var movieShowtimes = Object.values(movieInfo["theaters"]).reduce((showtimes, currentTheater) => {
        return showtimes.concat(Object.values(currentTheater));
      }, []).sort((a, b) => {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        return 0;
      });
    var showtimesAsHtmlList = getShowtimesAsHtmlList(movieShowtimes);
    var dateRange = getDateRangeFromShowtimes(movieShowtimes);

    var movieRow = $("<div class='row'>"
     + "  <div class='top-info-row'>"
     + "    <div class='left-col'><span class='dropdown'></span>" + movieName + "</div>"
     + "    <div class='right-col'>" + dateRange + "</div>"
     + "    <div class='right-col'>" + movieTheaters + "</div>"
     + "    <div class='clear'></div>"
     + "  </div>"
     + "  <div class='description-row'>"
     + "    <div class='details'><a target='_blank' href='" + movieDetailsLink + "'>" + movieDetailsLink + "</a></div>"
     + "    <div class='details'>Runtime: " + runTime + " minutes</div>"
     +      showtimesAsHtmlList
     + "  </div>"
     + "</div>"
     + "<div class='clear'></div>");

    $("body").append(movieRow);
  }

  // TODO: List locations next to showtimes in dropdown. instead of the structure 'theater': [showtimes], use
  // "showtimes" : [{"theater": "theaterName", "time": "showtime"}, {"theater": "theaterName", "time": "showtime"}]
  // Future: being able to put some in a favorites list; seeing a thumbnail and description in the dropdown

  $(".top-info-row").click(event => {
    var row = event.currentTarget;
    var dropdown = $(row).find('.dropdown');

    if (!dropdown.hasClass('active')) {
      dropdown.addClass('active');
      $(row).parent().find('.description-row').fadeIn(400);
    } else {
      dropdown.removeClass('active');
      $(row).parent().find('.description-row').fadeOut(100);
    }
  });
}

/*
  Expects a json object with alamo movies ordered by date and returns the list of movies
  ordered alphabetically with theater, date range, and individual showtime information.

  Returns a movies object:
  {
    "2001: A SPACE ODYSSEY 4K Restoration (Digital)": {
    "format": "Digital",
    "link": "https://drafthouse.com/uid/A000018451",
    "runTime": "179",
    "theaters": {
        "Lakeline": [
            "2018-09-04T02:45:00.000Z",
            "2018-09-04T23:00:00.000Z",
            "2018-09-05T23:00:00.000Z",
            "2018-09-06T02:45:00.000Z",
            "2018-09-07T03:35:00.000Z"
        ],
        "Slaughter Lane": [
            "2018-09-04T02:35:00.000Z",
            "2018-09-04T23:20:00.000Z",
            "2018-09-05T02:30:00.000Z",
            "2018-09-05T23:20:00.000Z",
            "2018-09-06T02:30:00.000Z"
        ],
        "Village": [
            "2018-09-03T23:30:00.000Z",
            "2018-09-04T23:30:00.000Z",
            "2018-09-05T23:30:00.000Z"
        ]
      }
    }
  }

  For every date, for every theater, for every film showing at that theater, for every format that the film is showing
  in --> 
    * combine the format and film name to get the title;
    * the run time should be consistent across all dates and cinemas (assumption)
    * create movie object with these items if it doesn't exist
    * get all showtimes for a film for that theater (timestamp with date + time)
    * set showtimes for a movie for a theater or add to pre-existing list
*/
function getMovieDataByName(alamoMoviesByDate) {
    var movies = {}
    var dates = alamoMoviesByDate["Market"]["Dates"];

    for (var i = 0; i < dates.length; i++) {
        // List of cinemas with movies showing on a particular date
        var cinemas = dates[i]["Cinemas"];
        for (var j = 0; j < cinemas.length; j++) {
            var cinema = cinemas[j];
            var cinemaName = cinema["CinemaName"];

            // List of movies showing for a particular cinema
            var films = cinema["Films"];
            for (var k = 0; k < films.length; k++) {
                var film = films[k];
                var filmName = film["FilmName"];
                var runTime = film["FilmRuntime"];
                var movieDetailsLink = "https://drafthouse.com/uid/" + film["FilmId"]

                // NOTE: confirmed that series length is always 1 in example feed (assumption)
                // Include format in movie name, e.g., "2001: A Space Odyssey (70mm)"
                var formats = film["Series"][0]["Formats"];
                for (var l = 0; l < formats.length; l++) {
                    var format = formats[l];
                    var formatName = format["FormatName"];
                    var movieNameAndFormat = filmName + " (" + formatName + ")";

                    // add movie title to movies map if it doesn't exist
                    if (!movies[movieNameAndFormat]) {
                        var movieInfo = {
                            "format": formatName,
                            "link": movieDetailsLink,
                            "runTime": runTime,
                            "theaters": {},
                        };
                        movies[movieNameAndFormat] = movieInfo;
                    }

                    var movie = movies[movieNameAndFormat];
                    var showtimes = format["Sessions"].map(showJson => {
                        return new Date(showJson["SessionDateTime"]);
                    });

                    // Sometimes there's more than one film entry for a theater, check for already collected showtimes
                    var collectedShowtimes = movie.theaters[cinemaName];
                    if (!collectedShowtimes) {
                      movie.theaters[cinemaName] = showtimes;
                    } else {
                      movie.theaters[cinemaName] = collectedShowtimes.concat(showtimes);
                    }
                }
            }
        }
    }

    return movies;
}

function sortMoviesByStartDate(movieMap) {
  return Object.keys(movieMap).sort((a, b) => {
    // For each movie, get all showtimes for all theaters into one list
    // {"theaterName1": ["time1", "time2", "etc"],
    //  "theaterName2": ["time1", "time2", "etc"]}
    var showtimesA = Object.values(movieMap[a]["theaters"]).reduce((showtimes, currentTheater) => {
      return showtimes.concat(Object.values(currentTheater));
    }, []);
    var showtimesB = Object.values(movieMap[b]["theaters"]).reduce((showtimes, currentTheater) => {
      return showtimes.concat(Object.values(currentTheater));
    }, []);

    var minShowtimeA = Math.min(...showtimesA);
    var minShowtimeB = Math.min(...showtimesB);

    if (minShowtimeA < minShowtimeB) {
      return -1;
    }

    if (minShowtimeA > minShowtimeB) {
      return 1;
    }

    return 0;
  });
}

function getDateRangeFromShowtimes(showtimes) {
  var minShowtime = Math.min(...showtimes);
  var maxShowtime = Math.max(...showtimes);

  var minShowtimeString = new Date(minShowtime).toDateString();
  var maxShowtimeString = new Date(maxShowtime).toDateString();

  if (minShowtimeString === maxShowtimeString) {
    return minShowtimeString;
  }

  return minShowtimeString + " - " + maxShowtimeString;
}

function getShowtimesAsHtmlList(showtimes) {
  var showtimesHtml = "<ul>";
  for (var i = 0; i < showtimes.length; i++) {
    showtimesHtml += "<li>" + showtimes[i] + "</li>";
  }

  return showtimesHtml + "</ul>";
}
