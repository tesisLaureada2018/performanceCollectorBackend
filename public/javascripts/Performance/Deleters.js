var qs = require('qs');
var ObjectId = require('mongodb').ObjectID;
var axios = require ('axios');

exports.deleteMetric = function (req, res) {
    let bodyReq = qs.parse(req.body);
    const adminId = bodyReq.adminId;

    if(adminId !== "tam|nico"){
        res.json({error: "Security Error"});
        return;
    }
    if(!PerformanceDB){
        res.json({error: "DB Error"});
        return;
    }
    var collectionP = PerformanceDB.collection('MetricsCollection');
    collectionP.findOneAndDelete({ "_id": ObjectId( projectId )}, function (err, docs) {
        if (err) console.log(err); 
        res.json({deleted:true});

        const query = {
            "query": {
               "term": {
                "projectId": projectId
              }
            }
        };
        axios.post(elasticSearch + "/perf_tests/_delete_by_query", query).then(
            (res) => { console.log(res.status);},(err) => {console.log(err);}
        );
    });
};
