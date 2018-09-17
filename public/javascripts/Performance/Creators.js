var axios = require('axios');
var qs = require('qs');
var ObjectId = require('mongodb').ObjectID;

exports.createMetric = function (req, res) {
    let newMetric = qs.parse(req.body);
    console.log(newMetric);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }

    var collectionP = PerformanceDB.collection('MetricsCollection');
    collectionP.insertOne(newMetric, function (error, result) {
        if (error) {
            console.log(error); //info about what went wrong
            res.json(error);
        }
        if (result) {
            res.json(result);
            delete newMetric._id;
            axios.post(elasticSearch + "/perf_tests/_doc/", newMetric).then(
                (res) => {
                    console.log("Elastic: "+ res.status);
                },
                (err) => {
                    console.log(err);
                }
            );
        }
    });
};
