var qs = require('qs');
var ObjectId = require('mongodb').ObjectID;

exports.shrink = function (req, res) {
    let data = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
    var collectionP = PerformanceDB.collection('MetricsCollection');
    collectionP.aggregate(
        { $match :{ "timestamp": { $gte: data.minDate, $lt: data.maxDate } }},
        { $group: { _id: "ip", cpu:"cpu"  } }).toArray(function (err, docs) {
        if (err) console.log(err);
        if (docs.length > 0) {
            let report = {
                metadata : docs.length + " documents have been shrinked."
            };
            for (let i= 0; i<docs.length ; i++){
                const metric = docs[i];
                console.log(metric);
                //collectionP.remove( {"_id": ObjectId(metric._id)});
            }
            res.json(report);
        }
        else {
            res.json("no data found for dates between "+data.minDate+ " "+data.maxDate);
        }
    });
}