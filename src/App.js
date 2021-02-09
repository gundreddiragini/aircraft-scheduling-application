import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

const airCrafts_URL = "https://infinite-dawn-93085.herokuapp.com/aircrafts";
const flights_URL = "https://infinite-dawn-93085.herokuapp.com/flights";
const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      appDate: tomorrow.toDateString(),
      airCrafts: [], // list of aircrafts
      flights: [], // list of flights
      currentPage: 1,
      lastPage: 0,
      pageNumbers: [],
      disableButton: false,
      selectedFlights: [], // list of flights selected for rotation
      graphData: [],
      aircraftName: '',
      percentageUtilization: '',
    }
  }

  componentWillMount() {
    this.setState({ disableButton: true });
    fetch(airCrafts_URL).then((res) => { return res.json() }).then((data) => {
      this.setState({ airCrafts: data.data, aircraftName: data.data[0].ident })
    });
    fetch(flights_URL + '?offset=' + ((this.state.currentPage - 1) * 10) + '&limit=10').then((res) => { return res.json() }).then((data) => {

      var totalFlights = data.pagination.total;
      var totalPages = Math.ceil(totalFlights / 10);
      var pages = [];
      for (let i = 1; i <= 5; i++) {
        if (i <= totalPages) {
          pages.push(i);
        }
      }
      this.setState({ flights: data.data, lastPage: totalPages, disableButton: false, pageNumbers: pages });

    })
  }

  changeDate = x => () => {
    tomorrow.setDate(tomorrow.getDate() + x);
    this.setState({ appDate: tomorrow.toDateString() })
  }

  // function for calculation of Aircraft timeline
  barWidthCalculation = (flights) => {
    var totalSecondsInADay = 24 * 60 * 60;
    var barsData = [];
    var timeBeforeFlight, timeOfFlight;

    var currentTime = 0;
    var percentageUtilization = 0;

    flights.forEach((flight, i) => {
      timeBeforeFlight = ((flight.departuretime - currentTime) / totalSecondsInADay) * 100;
      timeOfFlight = ((flight.arrivaltime - flight.departuretime) / totalSecondsInADay) * 100;
      currentTime = flight.arrivaltime + 1200;
      barsData.push({
        grey: 'calc(' + timeBeforeFlight + '% - 2px)'
      })
      barsData.push({
        green: 'calc(' + timeOfFlight + '% - 2px)'
      })
      barsData.push({
        purple: 'calc(' + ((1200 / totalSecondsInADay) * 100) + '% - 2px)'
      })
      percentageUtilization = percentageUtilization + timeOfFlight + ((1200 / totalSecondsInADay) * 100);

    })

    var remainingSeconds = ((totalSecondsInADay - currentTime) / totalSecondsInADay) * 100;

    barsData.push({ grey: 'calc(' + remainingSeconds + '% - 2px)' });
    return { barsData: barsData, percentageUtilization: (Math.round(percentageUtilization) + '%') };
  }

  // function for adding flights to rotation
  selectFlight = selectedFlight => () => {
    var selectedFlights = this.state.selectedFlights, filteredFlights = [];
    var isFlightEligibleForSelection = true;
    filteredFlights = selectedFlights.filter((flight) => { return flight.id === selectedFlight.id })
    if (filteredFlights.length == 0) {
      selectedFlights.every((flight) => {
        if ((selectedFlight.departuretime >= flight.departuretime && selectedFlight.departuretime < (flight.arrivaltime + 1200)) ||
          ((selectedFlight.arrivaltime + 1200) > flight.departuretime && selectedFlight.arrivaltime <= flight.arrivaltime)) {
          isFlightEligibleForSelection = false;
          alert(selectedFlight.id + ' cannot be scheduled. There are other flights scheduled during the same time');
          return false;
        }
        else return true;
      })

      if ((selectedFlight.arrivaltime - selectedFlight.departuretime) < 0 || selectedFlight.arrivaltime == 0 || selectedFlight.departuretime == 0) {
        isFlightEligibleForSelection = false;
        alert(selectedFlight.id + ' cannot be scheduled. All aircrafts must be on the ground at midnight.');
      }

      if (isFlightEligibleForSelection) {
        var departureTimes = selectedFlights.map((flight) => (flight.departuretime));
        var done = false;

        departureTimes.every((time, i) => {
          if (time > selectedFlight.departuretime) {
            done = true;
            selectedFlights.splice(i, 0, selectedFlight);
            return false;
          }
          else return true;
        })
        if (!done) {
          selectedFlights.push(selectedFlight);
        }
        var graphData = this.barWidthCalculation(selectedFlights);
        this.setState({ selectedFlights, graphData: graphData.barsData, percentageUtilization: graphData.percentageUtilization });
      }
    }
  }

  // function for removing flights from rotation
  removeFlight = index => () => {
    var selectedFlights = this.state.selectedFlights;
    selectedFlights.splice(index, 1);
    var graphData = this.barWidthCalculation(selectedFlights);
    this.setState({ selectedFlights, graphData: graphData.barsData, percentageUtilization: graphData.percentageUtilization });
  };

  // function to fetch flights based on the selected page
  fetchFlights = pageNo => () => {
    this.setState({ disableButton: true });
    let pagesArray = [], lastIndex = 4;
    if (this.state.lastPage <= 4) {
      lastIndex = this.state.lastPage - 1
    }
    if (pageNo >= this.state.pageNumbers[4] && pageNo <= this.state.lastPage) {
      let endingPageNo = pageNo + 3;
      while (endingPageNo > this.state.lastPage) {
        endingPageNo = endingPageNo - 1;
      }
      for (let i = lastIndex; i >= 0; i--) {
        pagesArray[i] = endingPageNo;
        endingPageNo = endingPageNo - 1;
      }
    } else if (pageNo <= this.state.pageNumbers[0] && pageNo >= 1) {
      let startingPageNo = pageNo - 3;
      while (startingPageNo < 1) {
        startingPageNo = startingPageNo + 1;
      }
      for (let i = 0; i <= lastIndex; i++) {
        pagesArray[i] = startingPageNo;
        startingPageNo = startingPageNo + 1;
      }
    } else {
      pagesArray = this.state.pageNumbers;
    }


    fetch(flights_URL + '?offset=' + ((pageNo - 1) * 10) + '&limit=10').then((res) => { return res.json() }).then((data) => {

      this.setState({ flights: data.data, pageNumbers: pagesArray, disableButton: false, currentPage: pageNo });

    })
  }

  render() {
    return (
      <div className="App">


        <div>

          <div className="w50 pd25 pdLeft15Per headerFont"><span className="headerColor"><span onClick={this.changeDate(-1)} className="dateChanger">&lt;&lt;&nbsp;&nbsp;</span>{this.state.appDate}<span className="dateChanger" onClick={this.changeDate(1)}>&nbsp;&nbsp;&gt;&gt;</span></span></div>
          <div>
            <div className="dispInlineBlock w10 headerFont"><span className="tableHeaderColor">Aircrafts</span></div>
            <div className="dispInlineBlock w55 headerFont"><div className="bdBottom2 dispInlineBlock w50"><span className="tableHeaderColor">Rotation {this.state.aircraftName}</span></div></div>
            <div className="dispInlineBlock w30 headerFont"><span className="tableHeaderColor">Flights</span></div>
          </div>
        </div>
        <div>
          <div className="airCrafts section" >

            {
              this.state.airCrafts.map((airCraft, i) => {
                return (
                  <div className="bd1 pd10 aircraftTitle" key={i} onClick={this.fetchFlights(1)} >
                    <div className="bd2 pd2 textCenter"> {airCraft.ident} <br></br> {this.state.percentageUtilization ? ('(' + this.state.percentageUtilization + ')') : ''}
                    </div>
                  </div>
                )
              })
            }
          </div>
          <div className="rotation section pdLR20">
            {
              this.state.selectedFlights.map((flight, i) => {
                return (
                  <div className="mb10 bd2 selectedParent">
                    <div className="rotationalFlightId">Flight : {flight.id}
                      <span onClick={this.removeFlight(i)} className="deselectFlight">remove</span>
                    </div>
                    <div className="pd10"> <div className="origin selected flightData">
                      {flight.origin}</div>
                      <span className="arrow">&#8594;</span>
                      <div className="destination selected flightData">
                        {flight.destination}
                      </div></div>
                    <div className="pd10">
                      <div className="origin selected flightData">
                        {flight.readable_departure}</div> <div className="destination selected flightData">
                        {flight.readable_arrival}
                      </div></div>
                  </div>
                )
              })
            }
            {this.state.selectedFlights.length > 0 && (
              <div className="timeAssessment">
                <div>

                  <div className="alignLeft h14">
                    {
                      [0, 1, 2, 3].map((displayTime, i) => {
                        var time = ['0:00', '6:00', '12:00', '18:00']

                        return (
                          <div className="dispInlineBlock w25 alignLeft timeDisplay vT">{time[i]}</div>
                        )
                      })}</div>

                  <div className="bdBottom2 h5 mB2">
                    {
                      [0, 1, 2, 3].map((displayTime, i) => {
                        var time = ['0:00', '6:00', '12:00', '18:00']

                        return (
                          <div className="dispInlineBlock wCal mH6px bL2 vT"></div>
                        )
                      })
                    } </div>

                </div> <div className="timeGraph">
                  {this.state.graphData.map((bar) => {
                    var colors = Object.keys(bar);
                    var widths = Object.values(bar);

                    if (this.state.selectedFlights.length > 0) {
                      return (
                        <div className="percentageUtlization" style={{ width: widths[0], backgroundColor: colors[0] }}></div>
                      )
                    }

                    else return (null);


                  })}</div>
              </div>)}

          </div>
          <div className="flights section">

            {
              this.state.flights.map((flight, i) => {
                var bgColor = 'white', filteredFlights, cursor = 'pointer';
                filteredFlights = this.state.selectedFlights.filter((f) => {
                  return flight.id === f.id;
                })
                if (filteredFlights.length > 0) {
                  bgColor = 'grey';
                  cursor = 'default'
                }

                return (
                  <div onClick={this.selectFlight(flight)} className="bd1 pd10" style={{ cursor: cursor, backgroundColor: bgColor }} key={i}>
                    <div>{flight.id}</div>
                    <div> <div className=" origin allFlights flightData">
                      {flight.origin}</div> <div className=" destination allFlights flightData">
                        {flight.destination}
                      </div></div>
                    <div>
                      <div className=" origin allFlights flightData">
                        {flight.readable_departure}</div> <div className=" destination allFlights flightData">
                        {flight.readable_arrival}
                      </div></div>


                  </div>
                )
              })
            }
            <div>
              <button onClick={this.fetchFlights(1)} disabled={this.state.currentPage == 1 || this.state.disableButton} className="pagination">&lt;&lt;</button>
              <button onClick={this.fetchFlights(this.state.currentPage - 1)} disabled={this.state.currentPage == 1 || this.state.disableButton} className="pagination">&lt;</button>
              {this.state.pageNumbers.map((page, i) => {
                return (

                  <button disabled={this.state.disableButton || this.state.currentPage == page} onClick={this.fetchFlights(page)} className="pagination" key={i}>{page}</button>
                )
              })}

              <button onClick={this.fetchFlights(this.state.currentPage + 1)} disabled={this.state.currentPage == this.state.lastPage || this.state.disableButton} className="pagination">&gt;</button>
              <button onClick={this.fetchFlights(this.state.lastPage)} disabled={this.state.currentPage == this.state.lastPage || this.state.disableButton} className="pagination">&gt;&gt;</button>


            </div>
          </div>
        </div>


      </div>

    );
  }
}

export default App;
