var axios = require('axios');
var qs = require('qs');
var email = require('./EmailNotification.js');

exports.createMetric = function (req, res) {
    let newMetric = qs.parse(req.body);
    if (!PerformanceDB) {
        res.json({ error: "DB Error" });
        return;
    }
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
            console.log("Elastic cpu: " + res.status);
        },
        (err) => {
            setTimeout(function () { retryFailedRequest(elasticSearch + "/cpu/doc/", cpu) }, 10000);
        }
    );
    let memory = newMetric.ram;
    memory.timestamp = newMetric.timestamp;
    memory.ip = newMetric.ip;
    axios.post(elasticSearch + "/memory/doc/", memory).then(
        (res) => {
            console.log("Elastic memory: " + res.status);
        },
        (err) => {
            setTimeout(function () { retryFailedRequest(elasticSearch + "/memory/doc/", memory) }, 10000);
        }
    );

    let summary = {
        ip: newMetric.ip,
        timestamp: newMetric.timestamp,
        cpu_pct: newMetric.cpu,
        ram_pct: newMetric.ram.percent,
        swap_pct: newMetric.swap.percent,
        disk_pct: newMetric.disk.percent,
        net_err_in: newMetric.net_io_counters.errin,
        net_err_out: newMetric.net_io_counters.errout,
        net_drop_in: newMetric.net_io_counters.dropin,
        net_drop_out: newMetric.net_io_counters.dropout,
        running_vms: newMetric.running_vms,
        vms: newMetric.vms,
        virtualbox_status: newMetric.virtualbox_status,
        unacloud_status: newMetric.unacloud_status
    };
    axios.post(elasticSearch + "/summary/doc/", summary).then(
        (res) => {
            console.log("Elastic summary: " + res.status);
        },
        (err) => {
            console.log(err);
            setTimeout(function () { retryFailedRequest(elasticSearch + "/summary/doc/", summary) }, 10000);
        }
    );
    res.json(summary);

    if (newMetric.virtualbox_status === 0) {
        alert("VirtualBox is not responding for IP: ", newMetric.ip);
    }
    if (newMetric.unacloud_status === 0) {
        alert("Unacloud is not responding for IP: ", newMetric.ip);
    }

    machines[newMetric.ip] = new Date().getTime();
};

function alert(message, ip) {
    var collectionP = PerformanceDB.collection('ErrorsCollection');
    if (message.startsWith("Machine wont report metrics")) {
        console.log("Machine wont report");
        collectionP.find({}).snapshot().forEach(function (test) {
            if(!test[ip]){
                test[ip] = 1;
            }
            else{
                test[ip] += 1;
                if(test[ip] % 3 === 0){
                    email.sendEmail(message+ip);
                }
            }
            collectionP.save(test);
        });
    }
    else if (message.startsWith("Unacloud is not responding")) {
        console.log("Unacloud is not responding");
        collectionP.find({}).snapshot().forEach(function (test) {
            test.unacloud.push(ip);
            collectionP.save(test);
        });
        email.sendEmail(message+ip);
    }
    else if (message.startsWith("VirtualBox is not responding")) {
        console.log("VirtualBox is not responding");
        collectionP.find({}).snapshot().forEach(function (test) {
            test.virtualBox.push(ip);
            collectionP.save(test);
        });
        email.sendEmail(message+ip);
    }
}

function retryFailedRequest(path, object) {
    axios.post(path, object).then(
        (res) => {
            console.log("Elastic retry failed request: " + res.status);
        },
        (err) => {
            setTimeout(function () { retryFailedRequest(path, object) }, 20000);
        }
    );
}

let machines = {};
let frecuency = 1000 * 60 * 10;
let timeAccepted = 1000 * 60 * 10;
setTimeout(function () { checkMachines() }, frecuency);
function checkMachines() {
    setTimeout(function () { checkMachines() }, frecuency);
    //console.log(machines);   
    let keys = Object.keys(machines);
    for (let i = 0; i < keys.length; i++) {
        let ip = keys[i];
        if ((new Date().getTime() - timeAccepted) > machines[ip]) {
            alert("Machine wont report metrics: Machine has not responded in " + timeAccepted / (1000 * 60) + " minutes IP:", ip);
        }
    }
}
let frecuencyDet = 1000 * 60 * 60 * 3;
setTimeout(function () { sendDetails() }, 1000*10);
function sendDetails() {
    setTimeout(function () { sendDetails() }, frecuencyDet);
	if(!PerformanceDB){
          return;
        }	
    var collection = PerformanceDB.collection('MetricsCollection');
    collection.find({}).toArray(function (err, docs) {
        if (err) console.log(err); //info about what went wrong
        email.sendEmail("there are "+docs.length + " documents in DB");
    });
}
