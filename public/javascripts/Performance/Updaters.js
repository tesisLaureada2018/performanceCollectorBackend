var qs = require('qs');
var ObjectId = require('mongodb').ObjectID;

exports.shrink = function (req, res) {
    let data = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
    var collectionP = PerformanceDB.collection('MetricsCollection');
    collectionP.aggregate([
        { $match :{ "timestamp": { $gte: data.minDate, $lt: data.maxDate } }},
        { 
            $group: { 
                _id: "$ip", 
                cpu: { $avg: '$cpu' },
                running_vms: { $avg: '$running_vms' },
                vms: { $avg: '$vms' },
                unacloud_status: { $avg: '$unacloud_status' },
                virtualbox_status: { $avg: '$virtualbox_status' },
                ram: { $mergeObjects: {  
                    total: { $avg: '$ram.total' },
                    available: { $avg: '$ram.available' },
                    percent: { $avg: '$ram.percent' }
                } },
                disk: { $mergeObjects: {  
                    total: { $avg: '$disk.total' },
                    available: { $avg: '$disk.free' },
                    percent: { $avg: '$disk.percent' }
                } },
                swap: { $mergeObjects: {  
                    total: { $avg: '$swap.total' },
                    available: { $avg: '$swap.free' },
                    percent: { $avg: '$swap.percent' }
                } }
            } 
        }]).toArray(function (err, docs) {
        if (err) console.log(err);
        if (docs.length > 0) {
            let report = {
                metadata : docs.length + " ips have been shrinked.",
                newData : []
            };
            for (let i= 0; i<docs.length ; i++){
                const metric = docs[i];
                metric.ip = metric._id;
                delete metric._id;
                report.newData.push(metric);
                var collection = PerformanceDB.collection('ShrinkCollection');
                collection.insertOne(metric, function (error, result) {
                    if (error) { console.log(error); res.json(error); }
                    if (result) { 

                    }
                });
            }
            res.json(report);
        }
        else {
            res.json("no data found for dates between "+data.minDate+ " "+data.maxDate);
        }
    });
}

exports.deleteTimeStamp = function (req, res) {
    let data = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
    var collectionP = PerformanceDB.collection('MetricsCollection');
    collectionP.aggregate(
        { $match :{ "timestamp": { $gte: data.minDate, $lt: data.maxDate } }}
        ).toArray(function (err, docs) {
        if (err) console.log(err);
        if (docs.length > 0) {
            for (let i= 0; i<docs.length ; i++){
                const metric = docs[i];
                collectionP.remove( {"_id": ObjectId(metric._id)});
            }
            res.json(docs.length + " documents have been deleted from db");
        }
        else {
            res.json("no data found for dates between "+data.minDate+ " "+data.maxDate);
        }
    });
}