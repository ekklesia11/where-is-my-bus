const express = require("express");
const axios = require("axios");
const parser = require("xml2json");
const querystring = require("querystring");

const router = express.Router();
require("dotenv").config();

// GET /station/
// bus stations searched by station name
router.get("/location/:name", (req, res) => {
  const url = "http://openapi.gbis.go.kr/ws/rest/busstationservice";
  const serviceKey = `?serviceKey=${process.env.SERVICE_KEY}`;
  const query = `&keyword=${querystring.escape(req.params.name)}`;

  axios
    .get(`${url}${serviceKey}${query}`)
    .then(stations => {
      const body = JSON.parse(parser.toJson(stations.data)).response.msgBody
        .busStationList;

      if (body) {
        if (Array.isArray(body)) {
          const result = body.map(eachBody => {
            const temp = {};
            temp.region = eachBody.regionName;
            temp.stationId = eachBody.stationId;
            temp.station = eachBody.stationName;
            return temp;
          });
          res.json(result);
        } else {
          const result = {};
          result.region = body.regionName;
          result.stationId = body.stationId;
          result.station = body.stationName;
          res.json(result);
        }
      } else {
        res.status(404);
        res.send("There is no such a station");
      }
    })
    .catch(err => console.error(err));
});

// POST /station/
// bus station searched by current location
// body = { longitude, latitude }
router.post("/coordinate", (req, res) => {
  const url =
    "http://openapi.gbis.go.kr/ws/rest/busstationservice/searcharound";
  const serviceKey = `?serviceKey=${process.env.SERVICE_KEY}`;
  const query = `&x=${req.body.longitude}&y=${req.body.latitude}`;

  axios
    .get(`${url}${serviceKey}${query}`)
    .then(stations => {
      const body = JSON.parse(parser.toJson(stations.data)).response.msgBody
        .busStationAroundList;

      if (body) {
        if (Array.isArray(body)) {
          const result = body.map(eachBody => {
            const temp = {};
            temp.region = eachBody.regionName;
            temp.stationId = eachBody.stationId;
            temp.station = eachBody.stationName;
            temp.distance = eachBody.distance;
            return temp;
          });
          res.json(result);
        } else {
          const result = {};
          result.region = body.regionName;
          result.stationId = body.stationId;
          result.station = body.stationName;
          result.distance = body.distance;
          res.json(result);
        }
      } else {
        res.status(404);
        res.send("There is no bus station nearby");
      }
    })
    .catch(err => console.error(err));
});

// bus stations searched by address
// body = { address }
router.post("/address", (req, res) => {
  const address = querystring.escape(req.body.address);

  axios({
    url: `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${address}`,
    method: "get",
    headers: {
      "content-type": "application/json",
      "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_ID,
      "X-NCP-APIGW-API-KEY": process.env.NAVER_KEY
    }
  })
    .then(coordinate => {
      if (coordinate.data.addresses.length) {
        const longitude = coordinate.data.addresses[0].x;
        const latitude = coordinate.data.addresses[0].y;
        const url =
          "http://openapi.gbis.go.kr/ws/rest/busstationservice/searcharound";
        const serviceKey = `?serviceKey=${process.env.SERVICE_KEY}`;
        const query = `&x=${longitude}&y=${latitude}`;

        axios.get(`${url}${serviceKey}${query}`).then(stations => {
          const body = JSON.parse(parser.toJson(stations.data)).response.msgBody
            .busStationAroundList;

          if (body) {
            if (Array.isArray(body)) {
              const result = body.map(eachBody => {
                const temp = {};
                temp.region = eachBody.regionName;
                temp.stationId = eachBody.stationId;
                temp.station = eachBody.stationName;
                temp.distance = eachBody.distance;
                return temp;
              });
              res.json(result);
            } else {
              const result = {};
              result.region = body.regionName;
              result.stationId = body.stationId;
              result.station = body.stationName;
              result.distance = body.distance;
              res.json(result);
            }
          } else {
            res.status(404);
            res.send("There is no bus station nearby");
          }
        });
      } else {
        res.status(404);
        res.send("Address is wrong or not found");
      }
    })
    .catch(err => {
      console.error(err);
    });
});

// GET /bus/
// routeId searched by bus number => bus stations will be listed after selection
router.get("/:number", (req, res) => {
  const url = "http://openapi.gbis.go.kr/ws/rest/busrouteservice";
  const serviceKey = `?serviceKey=${process.env.SERVICE_KEY}`;
  const query = `&keyword=${req.params.number}`;

  axios
    .get(`${url}${serviceKey}${query}`)
    .then(data => {
      const body = JSON.parse(parser.toJson(data.data)).response.msgBody
        .busRouteList;

      if (body) {
        if (Array.isArray(body)) {
          const result = body.map(eachBody => {
            const temp = {};
            temp.region = eachBody.regionName;
            temp.routeId = eachBody.routeId;
            temp.route = eachBody.routeName;
            temp.routeType = eachBody.routeTypeName;
            return temp;
          });
          res.json(result);
        } else {
          const result = {};
          result.region = body.regionName;
          result.routeId = body.routeId;
          result.route = body.routeName;
          result.routeType = body.routeTypeName;
          res.json(result);
        }
      } else {
        res.status(404);
        res.send("There is no bus station nearby");
      }
    })
    .catch(err => console.error(err));
});

// GET /bus/
// after bus station selected
router.get("/:stationId/bus", (req, res) => {
  const url = "http://openapi.gbis.go.kr/ws/rest/busstationservice/route";
  const serviceKey = `?serviceKey=${process.env.SERVICE_KEY}`;
  const query = `&stationId=${req.params.stationId}`;

  axios.get(`${url}${serviceKey}${query}`).then(async buses => {
    try {
      const body = JSON.parse(parser.toJson(buses.data)).response.msgBody
        .busRouteList;

      const result = await Promise.all(
        body.map(async bus => {
          const routeUrl =
            "http://openapi.gbis.go.kr/ws/rest/busrouteservice/station";
          const routeQuery = `&routeId=${bus.routeId}`;

          const newBody = await axios
            .get(`${routeUrl}${serviceKey}${routeQuery}`)
            .then(async stationList => {
              const currentBus = JSON.parse(parser.toJson(stationList.data))
                .response.msgBody.busRouteStationList;

              const temp = {};
              temp.region = bus.regionName;
              temp.routeId = bus.routeId;
              temp.route = bus.routeName;
              temp.routeType = bus.routeTypeName;

              await currentBus.forEach(busStation => {
                let turningPoint;

                if (busStation.turnYn === "Y") {
                  turningPoint = busStation.stationSeq;
                  if (Number(bus.staOrder) < Number(turningPoint)) {
                    temp.direction = busStation.routeName;
                  } else {
                    temp.direction = currentBus[0].stationName;
                  }
                }
              });
              return temp;
            });
          return newBody;
        })
      );

      res.json(result);
    } catch (err) {
      console.error(err);
    }
  });
});

// POST /bus/
// body = { stationId, routeId, staOrder, refresh}
router.post("/station/arrival", async (req, res) => {
  const url = "http://openapi.gbis.go.kr/ws/rest/busrouteservice/station";
  const serviceKey = `?serviceKey=${process.env.SERVICE_KEY}`;
  const query = `&routeId=${req.body.routeId}`;

  const result = {};

  if (req.body.refresh === "false") {
    result.stationList = await axios
      .get(`${url}${serviceKey}${query}`)
      .then(body => {
        const stationList = JSON.parse(parser.toJson(body.data)).response
          .msgBody.busRouteStationList;

        return stationList;
      });
  }

  // arrival info
  const arrUrl = "http://openapi.gbis.go.kr/ws/rest/busarrivalservice";
  const arrQuery = `&stationId=${req.body.stationId}&routeId=${req.body.routeId}&staOrder=${req.body.staOrder}`;

  result.arrivalInfo = await axios
    .get(`${arrUrl}${serviceKey}${arrQuery}`)
    .then(body => {
      const arrivalInfo = JSON.parse(parser.toJson(body.data)).response.msgBody
        .busArrivalItem;

      return arrivalInfo;
    });

  res.json(result);
});

module.exports = router;
