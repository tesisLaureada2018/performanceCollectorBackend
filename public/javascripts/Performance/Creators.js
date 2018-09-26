var axios = require('axios');
var qs = require('qs');

function retryFailedRequest(path, object) {
    axios.post(path, object).then(
        (res) => {
            console.log("Elastic retry failed request: " + res.status);
        },
        (err) => { 
            setTimeout(function(){ retryFailedRequest(path, object)}, 20000);
        }
    );   
}

exports.createMetric = function (req, res) {
    let newMetric = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
    newMetric.timestamp = (newMetric.timestamp+'').replace('.','');
    //To mongo: The document is saved as it came
    var collectionP = PerformanceDB.collection('MetricsCollection');
    collectionP.insertOne(newMetric, function (error, result) {
        if (error) { console.log(error); res.json(error); }
        //if (result) { res.json("Saved"); }
    });

    //to elasticSearch
    let cpu = newMetric.cpu_details;
    cpu.timestamp = newMetric.timestamp;
    cpu.ip = newMetric.ip;
    axios.post(elasticSearch + "/cpu/doc/", cpu).then(
        (res) => {
            console.log("Elastic cpu: "+ res.status);
        },
        (err) => { 
            setTimeout(function(){ retryFailedRequest(elasticSearch + "/cpu/doc/", cpu)}, 10000);
        }
    );
    let memory = newMetric.ram;
    memory.timestamp = newMetric.timestamp;
    memory.ip = newMetric.ip;
    axios.post(elasticSearch + "/memory/doc/", memory).then(
        (res) => {
            console.log("Elastic memory: "+ res.status);
        },
        (err) => { 
            setTimeout(function(){ retryFailedRequest(elasticSearch + "/memory/doc/", memory)}, 10000);
        }
    );
    
    let summary = {
        ip : newMetric.ip,
        timestamp : newMetric.timestamp,
        cpu_pct : newMetric.cpu,
        ram_pct : newMetric.ram.percent,
        swap_pct : newMetric.swap.percent,
        disk_pct : newMetric.disk.percent,
        net_err_in : newMetric.net_io_counters.errin,
        net_err_out : newMetric.net_io_counters.errout,
        net_drop_in : newMetric.net_io_counters.dropin,
        net_drop_out : newMetric.net_io_counters.dropout,
        running_vms : newMetric.running_vms,
        vms : newMetric.vms
    };
    res.json(summary);
    axios.post(elasticSearch + "/summary/doc/", summary).then(
        (res) => {
            console.log("Elastic summary: "+ res.status);
        },
        (err) => { 
            console.log(err);
            setTimeout(function(){ retryFailedRequest(elasticSearch + "/summary/doc/", summary)}, 10000);
        }
    );
};
