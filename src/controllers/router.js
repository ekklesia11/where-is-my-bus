const express = require("express");
const axios = require("axios");
const parser = require("xml2json");
const querystring = require("querystring");

const router = express.Router();
require("dotenv").config();

// GET /station/
router.get("/location/:name", (req, res) => {
  const url = "http://openapi.gbis.go.kr/ws/rest/busstationservice";
  const serviceKey = `?serviceKey=${process.env.SERVICE_KEY}`;
  const query = `&keyword=${querystring.escape(req.params.name)}`;

  axios
    .get(`${url}${serviceKey}${query}`)
    .then(stations => {
      const body = JSON.parse(parser.toJson(stations.data));
      res.json(body);
    })
    .catch(err => console.error(err));
});

// POST /station/
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
          res.json(body);
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
router.get("/:number", (req, res) => {
  const url = "http://openapi.gbis.go.kr/ws/rest/busrouteservice";
  const serviceKey = `?serviceKey=${process.env.SERVICE_KEY}`;
  const query = `&keyword=${req.params.number}`;

  axios
    .get(`${url}${serviceKey}${query}`)
    .then(data => {
      const body = JSON.parse(parser.toJson(data.data));

      if (body.response.msgBody) {
        res.json(body.response.msgBody.busRouteList);
      } else {
        res.status(404);
        res.send("Bus doesn't exist");
      }
    })
    .catch(err => console.error(err));
});

module.exports = router;
