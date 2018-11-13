var ObjectId = require('mongodb').ObjectID;

exports.readMetrics = function (req, res) {
    const userId = req.params.userId;
    if(!PerformanceDB){
        res.json({error: "DB Error"});
        return;
    }
    var collection = PerformanceDB.collection('MetricsCollection');
    collection.find({}).limit(10000).toArray(function (err, docs) {
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

exports.readRecoveredData = function (req, res) {
    const userId = req.params.userId;
    if(!PerformanceDB){
        res.json({error: "DB Error"});
        return;
    }
    var collection = PerformanceDB.collection('recoveredDataCollection');
    collection.find({}).limit(10000).toArray(function (err, docs) {
        if (err) console.log(err); //info about what went wrong
        //console.log(docs);
        res.json(docs);
        
    });
};

exports.readProcesses = function (req, res) {
    const userId = req.params.userId;
    if(!PerformanceDB){
        res.json({error: "DB Error"});
        return;
    }
    var collection = PerformanceDB.collection('processesCollection');
    collection.find({}).limit(10000).toArray(function (err, docs) {
        if (err) console.log(err); //info about what went wrong
        //console.log(docs);
        res.json(docs);
        
    });
};

exports.readHardwareInfo = function (req, res) {
    const userId = req.params.userId;
    if(!PerformanceDB){
        res.json({error: "DB Error"});
        return;
    }
    var collection = PerformanceDB.collection('hardwareInfoCollection');
    collection.find({}).toArray(function (err, docs) {
        if (err) console.log(err); //info about what went wrong
        //console.log(docs);
        res.json(docs);
        
    });
};
