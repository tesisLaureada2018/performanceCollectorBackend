var ObjectId = require('mongodb').ObjectID;

exports.readMetrics = function (req, res) {
    const userId = req.params.userId;
    if(!PerformanceDB){
        res.json({error: "DB Error"});
        return;
    }
    var collection = PerformanceDB.collection('MetricsCollection');
    collection.find({}).toArray(function (err, docs) {
        if (err) console.log(err); //info about what went wrong
        //console.log(docs);
        res.json(docs);
        
    });
};

exports.readErrors = function (req, res) {
    const userId = req.params.userId;
    if(!PerformanceDB){
        res.json({error: "DB Error"});
        return;
    }
    var collection = PerformanceDB.collection('ErrorsCollection');
    collection.find({}).toArray(function (err, docs) {
        if (err) console.log(err); //info about what went wrong
        //console.log(docs);
        res.json(docs);
        
    });
};
